import "server-only";
import { getDatabasePool } from "./db";
import type { ArenaData } from "./arena-types";
import { identityRosterKey, identityCacheFresh, safeAvatarUrl, type IdentityIndex, type RobloxProfile } from "./player-identity";
import { lookupRobloxProfile } from "./roblox-profile-server";

type LinkRow = { event_id: string; participant_id: string; roster_key: string; roblox_id: string };
type ProfileRow = { roblox_id: string; username: string; display_name: string; avatar_url: string | null; refreshed_at: Date };
const profileFromRow = (row: ProfileRow): RobloxProfile => ({ robloxId: row.roblox_id, username: row.username, displayName: row.display_name, avatarUrl: safeAvatarUrl(row.avatar_url), refreshedAt: new Date(row.refreshed_at).toISOString() });
export class IdentityConflict extends Error { }
export async function getIdentityIndex(): Promise<IdentityIndex> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const state = (await client.query<{ revision: number; payload: ArenaData }>("SELECT revision, payload FROM weji_arena_state WHERE id = 1")).rows[0];
    const profiles = await client.query<ProfileRow>("SELECT * FROM public.weji_arena_players ORDER BY lower(username), roblox_id");
    const links = await client.query<LinkRow>("SELECT * FROM public.weji_arena_player_links");
    const byEvent = new Map<string, Map<string, LinkRow>>();
    for (const link of links.rows) {
      if (!byEvent.has(link.event_id)) byEvent.set(link.event_id, new Map());
      byEvent.get(link.event_id)!.set(link.participant_id, link);
    }
    const events = (state?.payload.events ?? []).filter(e => !e.trashedAt).map(e => ({
      id: e.id, title: e.title, eventDate: e.eventDate, status: e.status, participants: e.participants.map(p => {
        const link = byEvent.get(e.id)?.get(p.id);
        return { id: p.id, name: p.name, username: p.username, robloxId: link?.roblox_id ?? null, stale: !!link && link.roster_key !== identityRosterKey(e, p) };
      })
    }));
    await client.query("COMMIT");
    return { revision: state?.revision ?? 0, players: profiles.rows.map(profileFromRow), events };
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
export async function getProfileForLink(id: string, expectedUsername: string): Promise<RobloxProfile> {
  const existing = (await getDatabasePool().query<ProfileRow>("SELECT * FROM public.weji_arena_players WHERE roblox_id = $1", [id])).rows[0];
  if (existing) {
    const profile = profileFromRow(existing);
    if (identityCacheFresh(profile) && profile.username.toLowerCase() === expectedUsername.toLowerCase()) return profile;
  }
  return lookupRobloxProfile(id);
}
export async function setPlayerLink(input: { eventId: string; participantId: string; revision: number; expectedId: string | null; profile: RobloxProfile | null }) {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    // Serialize with all scoring, roster, lifecycle and finalization writes.
    const state = (await client.query<{ revision: number; payload: ArenaData }>("SELECT revision, payload FROM weji_arena_state WHERE id = 1 FOR UPDATE")).rows[0];
    const event = state?.payload.events.find(e => e.id === input.eventId && !e.trashedAt);
    const participant = event?.participants.find(p => p.id === input.participantId);
    if (!state || state.revision !== input.revision || !event || !participant) throw new IdentityConflict("Roster berubah atau event tidak tersedia. Muat ulang sebelum menghubungkan akun.");
    const current = (await client.query<LinkRow>("SELECT * FROM public.weji_arena_player_links WHERE event_id = $1 AND participant_id = $2", [input.eventId, input.participantId])).rows[0];
    if ((current?.roblox_id ?? null) !== input.expectedId) throw new IdentityConflict("Identitas sudah diubah. Muat ulang daftar.");
    const nextId = input.profile?.robloxId ?? null;
    if (input.profile) {
      // An orphan link from a removed/edited roster must not silently transfer identity.
      const duplicate = (await client.query<LinkRow>("SELECT * FROM public.weji_arena_player_links WHERE event_id = $1 AND roblox_id = $2 AND participant_id <> $3", [input.eventId, nextId, input.participantId])).rows[0];
      if (duplicate) {
        const other = event.participants.find(p => p.id === duplicate.participant_id);
        if (other) throw new IdentityConflict("Akun ini sudah terhubung ke peserta lain pada event yang sama. Lepaskan hubungan lama dahulu.");
        await client.query("DELETE FROM public.weji_arena_player_links WHERE event_id = $1 AND participant_id = $2", [input.eventId, duplicate.participant_id]);
        await client.query("INSERT INTO public.weji_arena_identity_audit(event_id, participant_id, previous_id, next_id, actor) VALUES ($1,$2,$3,NULL,$4)", [input.eventId, duplicate.participant_id, duplicate.roblox_id, process.env.WEJI_ADMIN_USERNAME || "admin"]);
      }
      const p = input.profile;
      await client.query(`INSERT INTO public.weji_arena_players(roblox_id, username, display_name, avatar_url, refreshed_at) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (roblox_id) DO UPDATE SET username=EXCLUDED.username, display_name=EXCLUDED.display_name, avatar_url=EXCLUDED.avatar_url, refreshed_at=EXCLUDED.refreshed_at
        WHERE weji_arena_players.refreshed_at <= EXCLUDED.refreshed_at`, [p.robloxId, p.username, p.displayName, p.avatarUrl, p.refreshedAt]);
      await client.query(`INSERT INTO public.weji_arena_player_links(event_id, participant_id, roster_key, roblox_id) VALUES ($1,$2,$3,$4)
        ON CONFLICT (event_id, participant_id) DO UPDATE SET roster_key=EXCLUDED.roster_key, roblox_id=EXCLUDED.roblox_id`, [input.eventId, input.participantId, identityRosterKey(event, participant), p.robloxId]);
    } else {
      await client.query("DELETE FROM public.weji_arena_player_links WHERE event_id = $1 AND participant_id = $2", [input.eventId, input.participantId]);
    }
    await client.query("INSERT INTO public.weji_arena_identity_audit(event_id, participant_id, previous_id, next_id, actor) VALUES ($1,$2,$3,$4,$5)", [input.eventId, input.participantId, input.expectedId, nextId, process.env.WEJI_ADMIN_USERNAME || "admin"]);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

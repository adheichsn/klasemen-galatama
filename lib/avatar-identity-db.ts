import "server-only";
import { getDatabasePool } from "./db";
import type { ArenaEvent } from "./arena-types";
import { projectAvatarProfiles, type AvatarLinkRow, type AvatarProfiles } from "./avatar-identity";
import { logServerFailure } from "./server-errors";

/** One bounded-by-event batch read. No upstream Roblox request, no writes. */
export async function readAvatarProfiles(events: ArenaEvent[]): Promise<AvatarProfiles> {
  const eligible = events.filter(e => !e.trashedAt && e.participants.length > 0);
  if (!eligible.length) return {};
  try {
    const { rows } = await getDatabasePool().query<AvatarLinkRow>(`SELECT l.event_id, l.participant_id, l.roster_key, p.roblox_id, p.username, p.display_name, p.avatar_url
      FROM public.weji_arena_player_links l JOIN public.weji_arena_players p ON p.roblox_id = l.roblox_id
      WHERE l.event_id = ANY($1::text[])`, [eligible.map(e => e.id)]);
    return projectAvatarProfiles(eligible, rows);
  } catch (error) {
    logServerFailure("avatar-profiles", error);
    return {}; // Scores and public results remain available independently.
  }
}
export function publicAvatarProfiles(events: ArenaEvent[]): Promise<AvatarProfiles> {
  return readAvatarProfiles(events.filter(e => e.published && !e.trashedAt));
}

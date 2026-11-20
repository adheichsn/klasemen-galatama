import type { ArenaEvent, EventMode } from "./arena-types";
import { avatarProfile, avatarTarget, type AvatarProfile, type AvatarProfiles, type AvatarTarget } from "./avatar-identity";
import { validRobloxId } from "./player-identity";
import { normalizedRobloxUsername, resultRows } from "./tournament-results";

export const playerHref = (robloxId: string) => `/pemain/id/${encodeURIComponent(robloxId)}`;
export const legacyPlayerHref = (username: string) => `/pemain/${encodeURIComponent(username)}`;
export function publishedPlayerEvents(events: ArenaEvent[]) {
  return events.filter(e => e.published && !e.trashedAt);
}
export type PlayerAppearance = {
  eventId: string; title: string; location: string; eventDate: string;
  mode: EventMode; status: ArenaEvent["status"]; recordedName: string; recordedUsername: string;
  teamName: string | null; rank: number | null; points: number | null; catches: number | null;
};
export type PlayerModeStats = { events: number; wins: number; podiums: number; silver: number; bronze: number; points: number; catches: number; bestRank: number | null };
export type DirectoryPlayer = {
  profile: AvatarProfile; target: AvatarTarget; history: PlayerAppearance[];
  stats: Record<EventMode, PlayerModeStats>;
};
const emptyStats = (): PlayerModeStats => ({ events: 0, wins: 0, podiums: 0, silver: 0, bronze: 0, points: 0, catches: 0, bestRank: null });
function countFinal(stats: PlayerModeStats, appearance: PlayerAppearance) {
  stats.events++;
  stats.points += appearance.points ?? 0;
  stats.catches += appearance.catches ?? 0;
  if (appearance.rank === null) return;
  stats.wins += Number(appearance.rank === 1);
  stats.silver += Number(appearance.rank === 2);
  stats.bronze += Number(appearance.rank === 3);
  stats.podiums += Number(appearance.rank <= 3);
  stats.bestRank = Math.min(stats.bestRank ?? appearance.rank, appearance.rank);
}
/** Identity comes exclusively from confirmed, roster-matched links. Never infer
 * profile ownership from names. Result ranking comes from immutable standings. */
export function buildPlayerDirectory(events: ArenaEvent[], profiles: AvatarProfiles): DirectoryPlayer[] {
  const byId = new Map<string, DirectoryPlayer>();
  const ordered = publishedPlayerEvents(events).sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    const rows = event.status === "finished" ? resultRows(event) : [];
    const rankById = new Map(rows.map(row => [row.id, row]));
    const reversed = new Set(event.entries.flatMap(entry => entry.reversesEntryId ? [entry.reversesEntryId] : []));
    const pointsById = new Map<string, number>(), catchesById = new Map<string, number>();
    if (event.status === "finished") for (const entry of event.entries) {
      pointsById.set(entry.participantId, (pointsById.get(entry.participantId) ?? 0) + entry.delta);
      if (entry.kind === "catch" && !reversed.has(entry.id)) catchesById.set(entry.participantId, (catchesById.get(entry.participantId) ?? 0) + (entry.quantity || 1));
    }
    const seen = new Set<string>();
    // If a corrupt/imported snapshot contains duplicate links, omit that ID for this event rather than double-count or choose a winner arbitrarily.
    const linked = event.participants.map(p => { const target = avatarTarget(event, p.id); return { p, target, profile: avatarProfile(profiles, target) }; });
    const counts = new Map<string, number>();
    for (const { profile } of linked) if (profile) counts.set(profile.robloxId, (counts.get(profile.robloxId) ?? 0) + 1);
    for (const { p, target, profile } of linked) {
      if (!profile || !validRobloxId(profile.robloxId) || counts.get(profile.robloxId) !== 1 || seen.has(profile.robloxId)) continue;
      seen.add(profile.robloxId);
      // Team medals follow the participant's final roster; historical team moves do not award multiple medals.
      const row = rankById.get(event.mode === "solo" ? p.id : p.squadId ?? "");
      const final = event.status === "finished";
      const appearance: PlayerAppearance = {
        eventId: event.id, title: event.title, location: event.location, eventDate: event.eventDate,
        mode: event.mode, status: event.status, recordedName: p.name, recordedUsername: p.username,
        teamName: event.mode === "squad" ? event.squads.find(s => s.id === p.squadId)?.name ?? null : null,
        rank: row?.rank ?? null,
        points: final ? pointsById.get(p.id) ?? 0 : null,
        catches: final ? catchesById.get(p.id) ?? 0 : null,
      };
      let player = byId.get(profile.robloxId);
      if (!player) {
        player = { profile, target, history: [], stats: { solo: emptyStats(), squad: emptyStats() } };
        byId.set(profile.robloxId, player);
      }
      player.history.push(appearance);
      if (final) countFinal(player.stats[event.mode], appearance);
    }
  }
  return [...byId.values()].sort((a, b) => a.profile.username.localeCompare(b.profile.username) || a.profile.robloxId.localeCompare(b.profile.robloxId));
}
export function playerTotals(player: DirectoryPlayer) {
  return { finalEvents: player.stats.solo.events + player.stats.squad.events, wins: player.stats.solo.wins + player.stats.squad.wins, podiums: player.stats.solo.podiums + player.stats.squad.podiums };
}
export function findDirectoryPlayers(players: DirectoryPlayer[], query: string, mode: string, order: string) {
  const q = query.trim().replace(/^@/, "").toLowerCase();
  return players.filter(p =>
    (mode !== "solo" && mode !== "squad" || p.history.some(h => h.mode === mode)) &&
    (!q || [p.profile.robloxId, p.profile.username, p.profile.displayName, ...p.history.flatMap(h => [h.recordedName, h.recordedUsername.replace(/^@/, "")])].some(value => value.toLowerCase().includes(q)))
  ).sort((a, b) => {
    const first = playerTotals(a), second = playerTotals(b);
    const delta = order === "wins" ? second.wins - first.wins || second.podiums - first.podiums : order === "events" ? second.finalEvents - first.finalEvents : 0;
    return delta || a.profile.username.localeCompare(b.profile.username) || a.profile.robloxId.localeCompare(b.profile.robloxId);
  });
}
/** Legacy username links can redirect ONLY if every matching final SOLO row is linked to one ID.
 * Unlinked history is explicitly separate; collisions are shown as choices, never combined. */
export function resolveLegacyHistory(events: ArenaEvent[], profiles: AvatarProfiles, username: string) {
  const normalized = normalizedRobloxUsername(username);
  const matches = publishedPlayerEvents(events).filter(e => e.status === "finished" && e.mode === "solo").flatMap(event => resultRows(event).filter(row => normalized !== null && normalizedRobloxUsername(row.username) === normalized).map(row => ({ event, row, profile: avatarProfile(profiles, avatarTarget(event, row.id)) })));
  const ids = [...new Set(matches.flatMap(m => m.profile ? [m.profile.robloxId] : []))];
  const unlinked = matches.filter(m => !m.profile);
  return { matches, ids, unlinked, redirectId: ids.length === 1 && !unlinked.length ? ids[0] : null };
}
export type IdentityChampion = { key: string; target: AvatarTarget; name: string; username: string; href: string; linked: boolean; wins: number; podiums: number; appearances: number };
/** Keep unlinked legacy names separate from confirmed IDs (including names reused by another account). */
export function identitySoloChampions(events: ArenaEvent[], profiles: AvatarProfiles): IdentityChampion[] {
  const records = new Map<string, IdentityChampion>();
  const ordered = publishedPlayerEvents(events).filter(e => e.mode === "solo" && e.status === "finished").sort((a, b) => b.eventDate.localeCompare(a.eventDate) || a.id.localeCompare(b.id));
  for (const event of ordered) {
    const seen = new Set<string>();
    const counts = new Map<string, number>();
    for (const p of event.participants) {
      const profile = avatarProfile(profiles, avatarTarget(event, p.id));
      if (profile) counts.set(profile.robloxId, (counts.get(profile.robloxId) ?? 0) + 1);
    }
    for (const row of resultRows(event)) {
      const target = avatarTarget(event, row.id), profile = avatarProfile(profiles, target);
      const username = normalizedRobloxUsername(row.username);
      if (profile && counts.get(profile.robloxId) !== 1 || !profile && !username) continue;
      const key = profile ? `id:${profile.robloxId}` : `legacy:${username}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const record = records.get(key) ?? { key, target: profile ? target : null, name: profile?.displayName || row.name, username: profile?.username || username!, href: profile ? playerHref(profile.robloxId) : legacyPlayerHref(username!), linked: !!profile, wins: 0, podiums: 0, appearances: 0 };
      record.wins += Number(row.rank === 1);
      record.podiums += Number(row.rank <= 3);
      record.appearances++;
      records.set(key, record);
    }
  }
  return [...records.values()].filter(p => p.wins > 0).sort((a, b) => b.wins - a.wins || b.podiums - a.podiums || b.appearances - a.appearances || a.key.localeCompare(b.key));
}

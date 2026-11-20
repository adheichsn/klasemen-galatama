import type { ArenaEvent } from "./arena-types";
import { identityRosterKey, safeAvatarUrl, validIdentityUsername, validRobloxId } from "./player-identity";

/** Read-only presentation data; never included in ArenaData or score writes. */
export type AvatarProfile = { robloxId: string; username: string; displayName: string; avatarUrl: string | null };
export type AvatarTarget = string | null;
export type AvatarProfiles = Record<string, AvatarProfile>;
export type AvatarLinkRow = { event_id: string; participant_id: string; roster_key: string; roblox_id: string; username: string; display_name: string; avatar_url: string | null };
export function avatarTarget(event: ArenaEvent, participantId: string): AvatarTarget {
  const p = event.participants.find(p => p.id === participantId);
  return p ? JSON.stringify([event.id, p.id, identityRosterKey(event, p)]) : null;
}
export function rankAvatarTargets(event: ArenaEvent, id: string): AvatarTarget[] {
  if (event.mode === "solo") return [avatarTarget(event, id)];
  // Include legacy contributors credited to this squad by a ledger snapshot.
  const ids = new Set(event.participants.filter(p => p.squadId === id).map(p => p.id));
  for (const entry of event.entries) if (entry.squadId === id) ids.add(entry.participantId);
  return [...ids].map(participantId => avatarTarget(event, participantId));
}
export function projectAvatarProfiles(events: ArenaEvent[], rows: AvatarLinkRow[]): AvatarProfiles {
  const eligible = new Set(events.filter(e => !e.trashedAt).flatMap(e => e.participants.map(p => avatarTarget(e, p.id))));
  const profiles: AvatarProfiles = {};
  for (const row of rows) {
    const key = JSON.stringify([row.event_id, row.participant_id, row.roster_key]);
    if (!eligible.has(key) || !validRobloxId(row.roblox_id) || !validIdentityUsername(row.username)) continue;
    profiles[key] = { robloxId: row.roblox_id, username: row.username, displayName: row.display_name, avatarUrl: safeAvatarUrl(row.avatar_url) };
  }
  return profiles;
}
export function avatarProfile(profiles: AvatarProfiles, target: AvatarTarget): AvatarProfile | undefined {
  return target && Object.hasOwn(profiles, target) ? profiles[target] : undefined;
}
/** Legacy aggregate is grouped by recorded username; only decorate when every
 * contributing occurrence resolves to the same confirmed Roblox ID. */
export function consistentAvatarTarget(profiles: AvatarProfiles, targets: AvatarTarget[]): AvatarTarget {
  if (!targets.length) return null;
  const first = avatarProfile(profiles, targets[0]);
  return first && targets.every(t => avatarProfile(profiles, t)?.robloxId === first.robloxId) ? targets[0] : null;
}

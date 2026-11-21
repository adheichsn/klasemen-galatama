import type { ArenaEvent, EventMode } from "./arena-types";
import {
  avatarProfile,
  avatarTarget,
  type AvatarProfiles,
} from "./avatar-identity";
import {
  buildPlayerDirectory,
  playerHref,
  type IdentityChampion,
} from "./player-directory";
import { resultRows } from "./tournament-results";

/** Public final snapshots only, newest actual edition first (not import date). */
export function publicFinalEditions(events: ArenaEvent[]) {
  return events
    .filter((e) => e.published && !e.trashedAt && e.status === "finished")
    .sort(
      (a, b) =>
        (b.eventDate || b.finishedAt || "").localeCompare(
          a.eventDate || a.finishedAt || "",
        ) || a.id.localeCompare(b.id),
    );
}
export function finalEditionMatches(
  event: ArenaEvent,
  profiles: AvatarProfiles,
  query: string,
) {
  const q = query.trim().toLowerCase().replace(/^@/, "");
  if (!q) return true;
  const winners = resultRows(event).slice(0, 3);
  const participantIds = winners.flatMap((r) =>
    event.mode === "solo" ? [r.id] : r.members.map((m) => m.id),
  );
  const names = participantIds.flatMap((id) => {
    const p = event.participants.find((person) => person.id === id);
    const profile = avatarProfile(profiles, avatarTarget(event, id));
    return [
      p?.name,
      p?.username,
      profile?.username,
      profile?.displayName,
      profile?.robloxId,
    ];
  });
  return [
    event.title,
    event.location,
    ...winners.map((r) => r.name),
    ...names,
  ].some((s) => s?.toLowerCase().includes(q));
}
/** Each confirmed member earns one personal medal per finished edition;
 * never aggregate team names across editions or award duplicate identities. */
export function teamModeChampions(
  events: ArenaEvent[],
  profiles: AvatarProfiles,
  mode: Exclude<EventMode, "solo">,
): IdentityChampion[] {
  return buildPlayerDirectory(
    publicFinalEditions(events).filter((e) => e.mode === mode),
    profiles,
  )
    .filter((p) => p.stats[mode].wins > 0)
    .map((p) => ({
      key: `id:${p.profile.robloxId}`,
      target: p.target,
      name: p.profile.displayName || p.profile.username,
      username: p.profile.username,
      href: playerHref(p.profile.robloxId),
      linked: true,
      wins: p.stats[mode].wins,
      podiums: p.stats[mode].podiums,
      appearances: p.stats[mode].events,
    }))
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        b.appearances - a.appearances ||
        a.key.localeCompare(b.key),
    );
}

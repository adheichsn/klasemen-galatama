import type {
  ArenaEvent,
  MatchTimer,
  Participant,
  ScoreEntry,
} from "./arena-types";
export function secondsLeft(timer: MatchTimer, now: number) {
  return timer.runningSince === null
    ? timer.remainingSec
    : Math.max(
        0,
        timer.remainingSec - Math.floor((now - timer.runningSince) / 1000),
      );
}
export function timeLabel(seconds: number) {
  const s = Math.max(0, seconds);
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
}
export const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
export function participantPoints(entries: ScoreEntry[], id: string) {
  return entries.reduce(
    (sum, entry) => sum + (entry.participantId === id ? entry.delta : 0),
    0,
  );
}
export function standings(event: ArenaEvent) {
  // A reversed catch must not count toward number of catches or bonus tie-breakers.
  const cancelledIds = new Set(
    event.entries.flatMap((e) =>
      e.reversesEntryId ? [e.reversesEntryId] : [],
    ),
  );
  const validCatches = event.entries.filter(
    (e) => e.kind === "catch" && !cancelledIds.has(e.id),
  );
  const scoreById = new Map<string, number>();
  const catchesById = new Map<string, number>();
  const bonusById = new Map<string, number>();
  for (const entry of event.entries)
    scoreById.set(
      entry.participantId,
      (scoreById.get(entry.participantId) || 0) + entry.delta,
    );
  for (const entry of validCatches) {
    catchesById.set(
      entry.participantId,
      (catchesById.get(entry.participantId) || 0) + (entry.quantity || 1),
    );
    if (
      event.tieBonusId &&
      entry.bonuses?.some((b) => b.id === event.tieBonusId)
    )
      bonusById.set(
        entry.participantId,
        (bonusById.get(entry.participantId) || 0) + (entry.quantity || 1),
      );
  }
  const sort = <
    T extends {
      name: string;
      points: number;
      catches: number;
      bonusCatches: number;
    },
  >(
    rows: T[],
  ) =>
    rows.sort(
      (a, b) =>
        b.points - a.points ||
        (event.tieBreaker === "bonus"
          ? b.bonusCatches - a.bonusCatches
          : event.tieBreaker === "catches"
            ? b.catches - a.catches
            : 0) ||
        a.name.localeCompare(b.name),
    );
  if (event.mode === "solo")
    return sort(
      event.participants.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.username ? `@${p.username.replace(/^@/, "")}` : "Peserta",
        points: scoreById.get(p.id) || 0,
        catches: catchesById.get(p.id) || 0,
        bonusCatches: bonusById.get(p.id) || 0,
        players: 1,
      })),
    );
  return sort(
    event.squads.map((s) => {
      const members = event.participants.filter((p) => p.squadId === s.id);
      return {
        id: s.id,
        name: s.name,
        subtitle: `${members.length} anggota`,
        players: members.length,
        points: members.reduce((sum, p) => sum + (scoreById.get(p.id) || 0), 0),
        catches: members.reduce(
          (sum, p) => sum + (catchesById.get(p.id) || 0),
          0,
        ),
        bonusCatches: members.reduce(
          (sum, p) => sum + (bonusById.get(p.id) || 0),
          0,
        ),
      };
    }),
  );
}
export function playerDisplay(player: Participant) {
  return player.name || (player.username ? `@${player.username}` : "Peserta");
}
export function validPoints(n: number) {
  return Number.isSafeInteger(n) && Math.abs(n) <= 1_000_000;
}
export function isReversed(entries: ScoreEntry[], id: string) {
  return entries.some((e) => e.reversesEntryId === id);
}
export function downloadArena(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

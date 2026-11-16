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
  const cancelledIds = new Set(
    event.entries.flatMap((entry) =>
      entry.reversesEntryId ? [entry.reversesEntryId] : [],
    ),
  );
  const players = new Map(event.participants.map((p) => [p.id, p]));
  const scoreById = new Map<string, number>();
  const catchesById = new Map<string, number>();
  const bonusById = new Map<string, number>();
  const credit = (map: Map<string, number>, key: string, amount: number) =>
    map.set(key, (map.get(key) || 0) + amount);
  for (const entry of event.entries) {
    // In Squad mode use the team captured when the transaction was recorded.
    // Older V1/V2 transactions fall back to the member's current squad.
    const key =
      event.mode === "solo"
        ? entry.participantId
        : entry.squadId || players.get(entry.participantId)?.squadId;
    if (!key) continue;
    credit(scoreById, key, entry.delta);
    if (entry.kind !== "catch" || cancelledIds.has(entry.id)) continue;
    const quantity = entry.quantity || 1;
    credit(catchesById, key, quantity);
    if (
      event.tieBonusId &&
      entry.bonuses?.some((b) => b.id === event.tieBonusId)
    )
      credit(bonusById, key, quantity);
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
        subtitle: p.username
          ? `@${p.username.replace(/^@/, "")}`
          : "Peserta individu",
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
        points: scoreById.get(s.id) || 0,
        catches: catchesById.get(s.id) || 0,
        bonusCatches: bonusById.get(s.id) || 0,
      };
    }),
  );
}
export function squadContribution(event: ArenaEvent, squadId: string) {
  if (event.mode !== "squad") return [];
  const reversed = new Set(
    event.entries.flatMap((entry) =>
      entry.reversesEntryId ? [entry.reversesEntryId] : [],
    ),
  );
  return event.participants
    .filter((p) => p.squadId === squadId)
    .map((p) => ({
      ...p,
      points: participantPoints(event.entries, p.id),
      catches: event.entries
        .filter(
          (x) =>
            x.participantId === p.id &&
            x.kind === "catch" &&
            !reversed.has(x.id),
        )
        .reduce((sum, x) => sum + (x.quantity || 1), 0),
    }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
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

import type { ScoreEntry, Tournament } from "./types";
export function playerScore(entries: ScoreEntry[], playerId: string): number {
  return entries.reduce(
    (sum, entry) => sum + (entry.playerId === playerId ? entry.delta : 0),
    0,
  );
}
export function teamScore(entries: ScoreEntry[], teamId: string): number {
  return entries.reduce(
    (sum, entry) => sum + (entry.teamId === teamId ? entry.delta : 0),
    0,
  );
}
export function leaderboard(data: Tournament) {
  return data.teams
    .map((team) => ({ ...team, points: teamScore(data.entries, team.id) }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
export function isReversed(entries: ScoreEntry[], entryId: string) {
  return entries.some((entry) => entry.reversesEntryId === entryId);
}
export function secondsLeft(timer: Tournament["timer"], now: number): number {
  if (timer.runningSince === null) return timer.remainingSec;
  return Math.max(
    0,
    timer.remainingSec - Math.floor((now - timer.runningSince) / 1000),
  );
}
export function formatTime(s: number) {
  const h = Math.floor(s / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((s % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(s % 60)
    .toString()
    .padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
export function formatPoints(n: number) {
  return `${n > 0 ? "+" : ""}${n}`;
}

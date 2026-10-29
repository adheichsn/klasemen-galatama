import type { Tournament } from "./types";
export const STORAGE_KEY = "galatama-nextjs-mvp-v1";
export function looksLikeTournament(value: unknown): value is Tournament {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Tournament>;
  return (
    v.version === 1 &&
    typeof v.title === "string" &&
    typeof v.usn === "string" &&
    typeof v.map === "string" &&
    Array.isArray(v.teams) &&
    v.teams.every(
      (t) =>
        typeof t?.id === "string" &&
        typeof t?.name === "string" &&
        Array.isArray(t?.players) &&
        t.players.every(
          (p) =>
            typeof p?.id === "string" &&
            typeof p?.username === "string" &&
            typeof p?.displayName === "string",
        ),
    ) &&
    Array.isArray(v.rules) &&
    v.rules.every(
      (r) =>
        typeof r?.id === "string" &&
        typeof r?.name === "string" &&
        typeof r?.points === "number" &&
        Number.isFinite(r.points),
    ) &&
    Array.isArray(v.entries) &&
    v.entries.every(
      (e) =>
        typeof e?.id === "string" &&
        typeof e?.teamId === "string" &&
        typeof e?.playerId === "string" &&
        typeof e?.delta === "number" &&
        Number.isFinite(e.delta) &&
        typeof e?.createdAt === "string",
    ) &&
    !!v.timer &&
    Number.isFinite(v.timer.durationSec) &&
    Number.isFinite(v.timer.remainingSec) &&
    (v.timer.runningSince === null || Number.isFinite(v.timer.runningSince))
  );
}
export function downloadJson(data: Tournament) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `galatama-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

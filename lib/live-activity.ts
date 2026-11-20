import type { ArenaEvent, ScoreEntry } from "./arena-types";

export type PublicActivity = {
  id: string;
  participantId: string;
  at: string;
  name: string;
  squad?: string;
  action: "catch" | "manual" | "reversal";
  detail: string;
  points: number;
};

/** Only expose the same already-public score ledger fields. No evidence refs,
 * staff notes, private audit metadata or admin identities. */
export function recentPublicActivity(
  event: ArenaEvent,
  limit = 10,
): PublicActivity[] {
  const people = new Map(event.participants.map((p) => [p.id, p]));
  const squads = new Map(event.squads.map((s) => [s.id, s.name]));
  const timestamp = (entry: ScoreEntry): number => {
    const value = Date.parse(entry.createdAt);
    return Number.isFinite(value) ? value : 0;
  };
  return [...event.entries]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .slice(0, Math.max(0, Math.min(30, limit)))
    .map((entry) => {
      const person = people.get(entry.participantId);
      return {
        id: entry.id,
        participantId: entry.participantId,
        at: entry.createdAt,
        name: person?.name || "Peserta",
        squad:
          event.mode === "squad"
            ? squads.get(entry.squadId || person?.squadId || "")
            : undefined,
        action: entry.kind,
        detail:
          entry.kind === "catch"
            ? (entry.description || "Tangkapan baru").slice(0, 140)
            : entry.kind === "reversal"
              ? "Pembatalan poin"
              : "Penyesuaian poin",
        points: entry.delta,
      };
    });
}

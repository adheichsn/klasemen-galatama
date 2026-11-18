import type { ArenaEvent, ScoreEntry } from "./arena-types";
import { standings } from "./arena-utils";

/**
 * V2.9 analytics are calculated from a single event's score ledger. No extra
 * tables, mutable counters or global fish catalogue are used. In particular,
 * the points/name on a catch are the historical snapshot at entry creation.
 */
export type AnalyticsBreakdown = {
  id: string;
  name: string;
  catches: number;
  records: number;
  points: number;
};
export type BonusBreakdown = AnalyticsBreakdown & { awardedPoints: number };
export type Contributor = {
  id: string;
  name: string;
  username: string;
  squadId: string | null;
  squad: string;
  catches: number;
  points: number;
};
export type SquadBreakdown = {
  id: string;
  name: string;
  points: number;
  catches: number;
  memberCount: number;
  contributors: Contributor[];
};
export type TournamentAnalyticsData = {
  mode: ArenaEvent["mode"];
  participantCount: number;
  squadCount: number;
  validCatches: number;
  catchRecords: number;
  reversedCatches: number;
  reversedAdjustments: number;
  catchPoints: number;
  adjustmentPoints: number;
  netPoints: number;
  averagePerCatch: number;
  fish: AnalyticsBreakdown[];
  bonuses: BonusBreakdown[];
  contributors: Contributor[];
  squads: SquadBreakdown[];
};

function quantityOf(entry: ScoreEntry): number {
  return Number.isSafeInteger(entry.quantity) && (entry.quantity ?? 0) > 0
    ? entry.quantity!
    : 1;
}

export function tournamentAnalytics(
  event: ArenaEvent,
): TournamentAnalyticsData {
  const reversed = new Set(
    event.entries.flatMap((entry) =>
      entry.kind === "reversal" && entry.reversesEntryId
        ? [entry.reversesEntryId]
        : [],
    ),
  );
  const fish = new Map<string, AnalyticsBreakdown>();
  const bonuses = new Map<string, BonusBreakdown>();
  const people = new Map(event.participants.map((p) => [p.id, p]));
  const squadNames = new Map(event.squads.map((s) => [s.id, s.name]));
  const scores = new Map<string, Contributor>();
  const squadCatches = new Map<string, number>();

  for (const p of event.participants) {
    scores.set(p.id, {
      id: p.id,
      name: p.name || p.username || "Peserta",
      username: p.username,
      squadId: p.squadId,
      squad: p.squadId ? squadNames.get(p.squadId) || "Squad" : "",
      catches: 0,
      points: 0,
    });
  }

  let validCatches = 0;
  let catchRecords = 0;
  let reversedCatches = 0;
  let reversedAdjustments = 0;
  let catchPoints = 0;
  let adjustmentPoints = 0;

  for (const entry of event.entries) {
    // All ledger deltas are additive. A reversal cancels the original delta.
    const contributor = scores.get(entry.participantId);
    if (contributor) contributor.points += entry.delta;
    if (entry.kind === "reversal") continue;
    if (reversed.has(entry.id)) {
      if (entry.kind === "catch") reversedCatches += quantityOf(entry);
      else reversedAdjustments++;
      continue;
    }
    if (entry.kind === "manual") {
      adjustmentPoints += entry.delta;
      continue;
    }
    if (entry.kind !== "catch") continue;

    const qty = quantityOf(entry);
    validCatches += qty;
    catchRecords++;
    catchPoints += entry.delta;
    if (contributor) contributor.catches += qty;
    const snapSquad = entry.squadId || people.get(entry.participantId)?.squadId;
    if (event.mode === "squad" && snapSquad)
      squadCatches.set(snapSquad, (squadCatches.get(snapSquad) || 0) + qty);

    // Prefer immutable entry snapshots. Legacy data without fish identity is
    // grouped honestly as unknown rather than attributed to current rules.
    const fishKey = entry.fishId || `legacy:${entry.fishName || "unknown"}`;
    const fishName =
      entry.fishName?.trim() || "Ikan lama (nama tidak tercatat)";
    const currentFish = fish.get(fishKey) || {
      id: fishKey,
      name: fishName,
      catches: 0,
      records: 0,
      points: 0,
    };
    currentFish.catches += qty;
    currentFish.records++;
    currentFish.points += entry.delta;
    fish.set(fishKey, currentFish);

    for (const bonus of entry.bonuses || []) {
      const key = bonus.id || `legacy:${bonus.name}`;
      const row = bonuses.get(key) || {
        id: key,
        name: bonus.name || "Bonus lama",
        catches: 0,
        records: 0,
        points: 0,
        awardedPoints: 0,
      };
      row.catches += qty;
      row.records++;
      row.awardedPoints += bonus.points * qty;
      row.points = row.awardedPoints;
      bonuses.set(key, row);
    }
  }

  const contributors = [...scores.values()].sort(
    (a, b) =>
      b.points - a.points ||
      b.catches - a.catches ||
      a.name.localeCompare(b.name),
  );
  // Use the existing standings algorithm for team totals and tiebreakers, so
  // these values agree with the public leaderboard even for legacy snapshots.
  const squadStandings = event.mode === "squad" ? standings(event) : [];
  const squads =
    event.mode === "squad"
      ? squadStandings.map((team) => ({
          id: team.id,
          name: team.name,
          points: team.points,
          catches: squadCatches.get(team.id) || 0,
          memberCount: event.participants.filter((p) => p.squadId === team.id)
            .length,
          contributors: contributors.filter((p) => p.squadId === team.id),
        }))
      : [];

  return {
    mode: event.mode,
    participantCount: event.participants.length,
    squadCount: event.mode === "squad" ? event.squads.length : 0,
    validCatches,
    catchRecords,
    reversedCatches,
    reversedAdjustments,
    catchPoints,
    adjustmentPoints,
    netPoints: event.entries.reduce((sum, entry) => sum + entry.delta, 0),
    averagePerCatch: validCatches ? catchPoints / validCatches : 0,
    fish: [...fish.values()].sort(
      (a, b) =>
        b.points - a.points ||
        b.catches - a.catches ||
        a.name.localeCompare(b.name),
    ),
    bonuses: [...bonuses.values()].sort(
      (a, b) => b.catches - a.catches || a.name.localeCompare(b.name),
    ),
    contributors,
    squads,
  };
}

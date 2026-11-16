import type { ArenaEvent, BonusRule } from "./arena-types";

/** Participants, squads and scores belong to the mode chosen before registration. */
export function canSwitchMode(e: ArenaEvent) {
  return (
    e.status === "draft" &&
    e.entries.length === 0 &&
    e.participants.length === 0 &&
    e.squads.length === 0
  );
}
/** A scored member cannot move squads; this protects historical team rankings. */
export function canAssignSquad(
  e: ArenaEvent,
  participantId: string,
  squadId: string | null,
) {
  const p = e.participants.find((player) => player.id === participantId);
  if (!p || e.mode !== "squad") return false;
  if (squadId !== null && !e.squads.some((s) => s.id === squadId)) return false;
  return (
    p.squadId === squadId ||
    !e.entries.some((entry) => entry.participantId === participantId)
  );
}
/** Calculate from a tournament's own enabled rules; no shared global prices. */
export function calculateCatch(
  e: ArenaEvent,
  fishId: string,
  bonusIds: string[],
  quantity: number,
) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99)
    return null;
  const fish = e.fish.find((f) => f.id === fishId && f.enabled);
  if (!fish || !Number.isSafeInteger(fish.points)) return null;
  const bonuses: BonusRule[] = e.bonuses.filter(
    (b) => b.enabled && bonusIds.includes(b.id),
  );
  const perFish = fish.points + bonuses.reduce((sum, b) => sum + b.points, 0);
  const delta = perFish * quantity;
  if (!Number.isSafeInteger(delta) || Math.abs(delta) > 1_000_000) return null;
  return {
    fish,
    bonuses: bonuses.map((b) => ({ id: b.id, name: b.name, points: b.points })),
    delta,
  };
}

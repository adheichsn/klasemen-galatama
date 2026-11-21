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
  if (!p || e.mode === "solo") return false;
  if (squadId !== null && !e.squads.some((s) => s.id === squadId)) return false;
  if (
    e.mode === "duo" &&
    squadId &&
    p.squadId !== squadId &&
    e.participants.filter((member) => member.squadId === squadId).length >= 2
  )
    return false;
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

/** DUO permits incomplete drafts, but scoring/start/final require two distinct members per pair. */
export function completeDuoRoster(e: ArenaEvent): boolean {
  if (e.mode !== "duo") return true;
  const teams = new Map(e.squads.map((s) => [s.id, 0]));
  if (
    teams.size < 1 ||
    teams.size !== e.squads.length ||
    new Set(e.participants.map((p) => p.id)).size !== e.participants.length
  )
    return false;
  const usernames = new Set<string>();
  for (const p of e.participants) {
    if (!p.squadId || !teams.has(p.squadId)) return false;
    const key = p.username.trim().replace(/^@/, "").toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(key) || usernames.has(key)) return false;
    usernames.add(key);
    teams.set(p.squadId, teams.get(p.squadId)! + 1);
  }
  return [...teams.values()].every((n) => n === 2);
}

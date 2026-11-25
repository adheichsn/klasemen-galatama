import type { ArenaEvent, ScoreEntry } from "./arena-types";
import { calculateCatch } from "./arena-rules";
import {
  startMatch,
  finishMatch,
  pauseMatch,
  resumeMatch,
} from "./match-operations";

export type LiveCommand =
  | { kind: "start" | "pause" | "resume" | "finish" }
  | {
    kind: "catch";
    player: string;
    fish: string;
    bonuses: string[];
    quantity: number;
    reference: string;
  }
  | { kind: "manual"; player: string; points: number; reason: string }
  | { kind: "reverse"; entryId: string };

export function validCommand(value: unknown): value is LiveCommand {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  const id = (x: unknown) => typeof x === "string" && x.length > 0;
  switch (c.kind) {
    case "start":
    case "pause":
    case "resume":
    case "finish":
      return true;
    case "catch":
      return (
        id(c.player) &&
        id(c.fish) &&
        Array.isArray(c.bonuses) &&
        c.bonuses.every(id) &&
        Number.isSafeInteger(c.quantity) &&
        typeof c.reference === "string"
      );
    case "manual":
      return (
        id(c.player) &&
        Number.isSafeInteger(c.points) &&
        typeof c.reason === "string" &&
        !!c.reason.trim() &&
        c.reason.length <= 300
      );
    case "reverse":
      return id(c.entryId);
    default:
      return false;
  }
}

export function applyLiveCommand(
  e: ArenaEvent,
  c: LiveCommand,
  id: string,
  now: number,
): ArenaEvent | null {
  if (e.trashedAt || e.historical || e.status === "finished") return null;
  if (c.kind === "start") return startMatch(e, now);
  if (e.status !== "live") return null;
  if (c.kind === "finish") return finishMatch(e, now);
  if (c.kind === "pause") return pauseMatch(e, now);
  if (c.kind === "resume") return resumeMatch(e, now);
  let entry: ScoreEntry;
  const createdAt = new Date(now).toISOString();
  if (c.kind === "reverse") {
    const old = e.entries.find((x) => x.id === c.entryId);
    if (!old || old.kind === "reversal") return null;
    entry = {
      id,
      createdAt,
      kind: "reversal",
      participantId: old.participantId,
      squadId:
        old.squadId ??
        e.participants.find((p) => p.id === old.participantId)?.squadId ??
        null,
      delta: -old.delta,
      description: `Pembatalan: ${old.description}`,
      reversesEntryId: old.id,
    };
  } else if (c.kind === "catch" || c.kind === "manual") {
    const player = e.participants.find((p) => p.id === c.player);
    if (!player) return null;
    const base = {
      id,
      createdAt,
      participantId: player.id,
      squadId: player.squadId,
    };
    if (c.kind === "manual") {
      entry = {
        ...base,
        kind: "manual",
        delta: c.points,
        description: c.reason.trim(),
      };
    } else {
      const result = calculateCatch(e, c.fish, c.bonuses, c.quantity);
      if (!result || result.bonuses.length !== c.bonuses.length) return null;
      const { fish, bonuses, delta } = result;
      entry = {
        ...base,
        kind: "catch",
        delta,
        fishId: fish.id,
        fishName: fish.name,
        basePoints: fish.points,
        quantity: c.quantity,
        bonuses,
        description: `${fish.name} ×${c.quantity}${bonuses.length ? " • " + bonuses.map((b) => b.name).join(", ") : ""}`,
        ...(c.reference.trim() ? { catchRef: c.reference.trim() } : {}),
      };
    }
  } else return null;
  return { ...e, entries: [entry, ...e.entries] };
}

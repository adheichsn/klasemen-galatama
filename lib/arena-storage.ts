import type {
  ArenaData,
  ArenaEvent,
  ScoreEntry,
  Participant,
  FishRule,
  BonusRule,
} from "./arena-types";
import { newId } from "./arena-data";
import { validBannerUrl } from "./banner";
export const ARENA_STORAGE_KEY = "galatama-arena-v2";
export const LEGACY_STORAGE_KEY = "galatama-nextjs-mvp-v1";
type RecordMap = Record<string, unknown>;
const isObject = (x: unknown): x is RecordMap =>
  !!x && typeof x === "object" && !Array.isArray(x);
const isString = (x: unknown): x is string => typeof x === "string";
const isBool = (x: unknown): x is boolean => typeof x === "boolean";
const validPoints = (x: unknown) =>
  Number.isSafeInteger(x) && Math.abs(x as number) <= 1_000_000;
export function validArena(x: unknown): x is ArenaData {
  if (
    !isObject(x) ||
    x.version !== 2 ||
    !isString(x.activeEventId) ||
    !Array.isArray(x.events) ||
    x.events.length > 500
  )
    return false;
  return (
    x.events.every((e: unknown) => {
      if (
        !isObject(e) ||
        !isString(e.id) ||
        !isString(e.title) ||
        !isString(e.subtitle) ||
        !isString(e.location) ||
        !isString(e.host) ||
        !isString(e.eventDate) ||
        !["solo", "squad"].includes(String(e.mode)) ||
        !["draft", "live", "finished"].includes(String(e.status)) ||
        !isBool(e.published) ||
        (e.bannerUrl !== undefined && !validBannerUrl(e.bannerUrl)) ||
        (e.featured !== undefined && !isBool(e.featured)) ||
        (e.trashedAt !== undefined && !isString(e.trashedAt)) ||
        (e.trashedBy !== undefined && !isString(e.trashedBy)) ||
        (e.rosterLocked !== undefined && !isBool(e.rosterLocked)) ||
        (e.squadSizeLimit !== undefined &&
          (!Number.isSafeInteger(e.squadSizeLimit) ||
            (e.squadSizeLimit as number) < 0 ||
            (e.squadSizeLimit as number) > 100)) ||
        !["catches", "bonus", "alphabetical"].includes(String(e.tieBreaker)) ||
        !(e.tieBonusId === null || isString(e.tieBonusId)) ||
        !isString(e.createdAt) ||
        (e.startedAt !== undefined && !isString(e.startedAt)) ||
        (e.finishedAt !== undefined && !isString(e.finishedAt))
      )
        return false;
      if (
        !isObject(e.timer) ||
        !Number.isFinite(e.timer.durationSec) ||
        !Number.isFinite(e.timer.remainingSec) ||
        !(
          e.timer.runningSince === null || Number.isFinite(e.timer.runningSince)
        )
      )
        return false;
      if (
        ![
          e.fish,
          e.bonuses,
          e.writtenRules,
          e.faqs,
          e.participants,
          e.squads,
          e.entries,
        ].every(Array.isArray)
      )
        return false;
      if (
        (e.fish as unknown[]).length > 500 ||
        (e.entries as unknown[]).length > 100000 ||
        (e.participants as unknown[]).length > 2000
      )
        return false;
      const validNamed = (items: unknown[]) =>
        items.every((v) => isObject(v) && isString(v.id) && isString(v.name));
      if (
        !validNamed(e.fish as unknown[]) ||
        !validNamed(e.bonuses as unknown[]) ||
        !validNamed(e.squads as unknown[]) ||
        !(e.squads as RecordMap[]).every(
          (v) =>
            v.captainId === undefined ||
            v.captainId === null ||
            isString(v.captainId),
        )
      )
        return false;
      if (
        !(e.fish as RecordMap[]).every(
          (v) => validPoints(v.points) && isBool(v.enabled),
        ) ||
        !(e.bonuses as RecordMap[]).every(
          (v) => validPoints(v.points) && isBool(v.enabled),
        )
      )
        return false;
      if (
        !(e.writtenRules as unknown[]).every(
          (v) =>
            isObject(v) &&
            isString(v.id) &&
            isString(v.group) &&
            isString(v.content),
        )
      )
        return false;
      if (
        !(e.faqs as unknown[]).every(
          (v) =>
            isObject(v) &&
            isString(v.id) &&
            isString(v.question) &&
            isString(v.answer),
        )
      )
        return false;
      if (
        !(e.participants as unknown[]).every(
          (v) =>
            isObject(v) &&
            isString(v.id) &&
            isString(v.name) &&
            isString(v.username) &&
            isBool(v.checkedIn) &&
            (v.squadId === null || isString(v.squadId)),
        )
      )
        return false;
      if (
        !(e.entries as unknown[]).every((v) => {
          if (
            !isObject(v) ||
            !isString(v.id) ||
            !isString(v.participantId) ||
            !["catch", "manual", "reversal"].includes(String(v.kind)) ||
            !validPoints(v.delta) ||
            !isString(v.description) ||
            !isString(v.createdAt)
          )
            return false;
          if (
            v.catchRef !== undefined &&
            (!isString(v.catchRef) || v.catchRef.length > 80)
          )
            return false;
          if (v.reversesEntryId !== undefined && !isString(v.reversesEntryId))
            return false;
          if (
            v.squadId !== undefined &&
            v.squadId !== null &&
            !isString(v.squadId)
          )
            return false;
          if (v.fishId !== undefined && !isString(v.fishId)) return false;
          if (v.fishName !== undefined && !isString(v.fishName)) return false;
          if (v.basePoints !== undefined && !validPoints(v.basePoints))
            return false;
          if (
            v.quantity !== undefined &&
            (!Number.isInteger(v.quantity) ||
              (v.quantity as number) < 1 ||
              (v.quantity as number) > 99)
          )
            return false;
          if (
            v.bonuses !== undefined &&
            (!Array.isArray(v.bonuses) ||
              !(v.bonuses as unknown[]).every(
                (b) =>
                  isObject(b) &&
                  isString(b.id) &&
                  isString(b.name) &&
                  validPoints(b.points),
              ))
          )
            return false;
          return true;
        })
      )
        return false;
      return true;
    }) &&
    (x.events.length === 0 || x.events.some((e) => e.id === x.activeEventId))
  );
}
export function migrateLegacy(x: unknown): ArenaData | null {
  if (
    !isObject(x) ||
    x.version !== 1 ||
    !Array.isArray(x.teams) ||
    !Array.isArray(x.rules) ||
    !Array.isArray(x.entries) ||
    !isObject(x.timer)
  )
    return null;
  try {
    const squads = x.teams.map((t: RecordMap) => ({
      id: String(t.id),
      name: String(t.name || "Clan"),
      color: String(t.color || "#2563eb"),
    }));
    const participants: Participant[] = x.teams.flatMap((t: RecordMap) =>
      (t.players as RecordMap[]).map((p: RecordMap, i: number) => ({
        id: String(p.id),
        name: String(p.displayName || p.username || `Peserta ${i + 1}`),
        username: String(p.username || ""),
        checkedIn: !!p.checkedIn,
        squadId: String(t.id),
      })),
    );
    const fish: FishRule[] = x.rules
      .filter((r: RecordMap) => r.category === "Tarikan")
      .map((r: RecordMap) => ({
        id: String(r.id),
        name: String(r.name),
        points: Number(r.points),
        enabled: !!r.enabled,
      }));
    const bonuses: BonusRule[] = x.rules
      .filter((r: RecordMap) => r.category !== "Tarikan")
      .map((r: RecordMap) => ({
        id: String(r.id),
        name: String(r.name),
        points: Number(r.points),
        enabled: !!r.enabled,
      }));
    const entries: ScoreEntry[] = x.entries.map((e: RecordMap) => ({
      id: String(e.id),
      participantId: String(e.playerId),
      squadId: e.teamId ? String(e.teamId) : undefined,
      kind: e.kind as ScoreEntry["kind"],
      delta: Number(e.delta),
      description: String(e.description || ""),
      createdAt: String(e.createdAt),
      reversesEntryId: e.reversesEntryId
        ? String(e.reversesEntryId)
        : undefined,
    }));
    const event: ArenaEvent = {
      id: newId(),
      title: String(x.title || "Galatama Migrasi"),
      subtitle: "Event hasil migrasi dari klasemen versi lama",
      location: String(x.map || ""),
      host: String(x.usn || ""),
      eventDate: "",
      mode: "squad",
      status: "draft",
      published: false,
      tieBreaker: "catches",
      tieBonusId: null,
      fish,
      bonuses,
      writtenRules: [],
      faqs: [],
      squads,
      participants,
      entries,
      timer: {
        durationSec: Number(x.timer.durationSec) || 5400,
        remainingSec: Number(x.timer.remainingSec) || 0,
        runningSince:
          typeof x.timer.runningSince === "number"
            ? x.timer.runningSince
            : null,
      },
      createdAt: new Date().toISOString(),
    };
    const data: ArenaData = {
      version: 2,
      activeEventId: event.id,
      events: [event],
    };
    return validArena(data) ? data : null;
  } catch {
    return null;
  }
}

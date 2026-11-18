import type { ArenaData, ArenaEvent } from "./arena-types";
import { newEvent } from "./arena-data";
import { secondsLeft } from "./arena-utils";

export type EventLifecycleAction = "trash" | "restore" | "delete";
export type EventLifecycleResult =
  | { ok: false; error: string }
  | { ok: true; data: ArenaData; target: ArenaEvent };

/**
 * V2.7.1. Dedicated server-side operation; never process these changes through
 * PUT /api/admin/state. A deleted event can contain any number of score entries.
 * All other events are copied unchanged, including their historical results.
 */
export function applyEventLifecycle(
  source: ArenaData,
  id: string,
  action: EventLifecycleAction,
  now: number,
  actor: string,
): EventLifecycleResult {
  const target = source.events.find((e) => e.id === id);
  if (!target) return { ok: false, error: "Turnamen tidak ditemukan." };
  if (!Number.isFinite(now) || now <= 0)
    return { ok: false, error: "Waktu server tidak valid." };
  const isTrashed = !!target.trashedAt;
  if (action === "trash" && isTrashed)
    return { ok: false, error: "Turnamen sudah berada dalam Trash." };
  if ((action === "restore" || action === "delete") && !isTrashed)
    return { ok: false, error: "Pindahkan event ke Trash terlebih dahulu." };

  let events: ArenaEvent[];
  if (action === "delete") {
    events = source.events.filter((e) => e.id !== id);
  } else {
    events = source.events.map((event) => {
      if (event.id !== id) return event;
      if (action === "restore") {
        const { trashedAt: _at, trashedBy: _by, ...restored } = event;
        return restored;
      }
      return {
        ...event,
        trashedAt: new Date(now).toISOString(),
        trashedBy: actor,
        published: false,
        featured: false,
        // A restored LIVE match always stays paused: never silently restart.
        timer: event.timer.runningSince !== null
          ? { ...event.timer, remainingSec: secondsLeft(event.timer, now), runningSince: null }
          : event.timer,
      };
    });
  }
  // Existing screens expect a selectable active event. Keep an empty draft
  // rather than breaking admin UI when the final visible event is trashed.
  let visible = events.filter((event) => !event.trashedAt);
  if (!visible.length) {
    if (events.length >= 500)
      return { ok: false, error: "Batas 500 event tercapai. Hapus satu event Trash terlebih dahulu." };
    const draft = newEvent("Turnamen Baru", "solo");
    events = [draft, ...events];
    visible = [draft];
  }
  const activeEventId = visible.some((e) => e.id === source.activeEventId)
    ? source.activeEventId
    : visible[0].id;
  return {
    ok: true,
    data: { ...source, activeEventId, events },
    target,
  };
}

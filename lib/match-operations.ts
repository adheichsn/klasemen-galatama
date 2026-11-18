import type { ArenaData, ArenaEvent } from "./arena-types";
import { secondsLeft } from "./arena-utils";
import { tournamentReadiness } from "./tournament-readiness";

/** Operations deliberately keep ArenaData V2 and its PostgreSQL schema unchanged. */
export function startMatch(event: ArenaEvent, now = Date.now()): ArenaEvent {
  if (event.status !== "draft" || !tournamentReadiness(event).canStart)
    return event;
  return {
    ...event,
    status: "live",
    startedAt: new Date(now).toISOString(),
    finishedAt: undefined,
    timer: {
      ...event.timer,
      remainingSec: event.timer.durationSec,
      runningSince: now,
    },
  };
}

export function pauseMatch(event: ArenaEvent, now = Date.now()): ArenaEvent {
  if (event.status !== "live" || event.timer.runningSince === null)
    return event;
  return {
    ...event,
    timer: {
      ...event.timer,
      remainingSec: secondsLeft(event.timer, now),
      runningSince: null,
    },
  };
}

export function resumeMatch(event: ArenaEvent, now = Date.now()): ArenaEvent {
  if (
    event.status !== "live" ||
    event.timer.runningSince !== null ||
    event.timer.remainingSec <= 0
  )
    return event;
  return {
    ...event,
    timer: { ...event.timer, runningSince: now },
  };
}

export function finishMatch(event: ArenaEvent, now = Date.now()): ArenaEvent {
  if (event.status !== "live") return event;
  return {
    ...event,
    status: "finished",
    finishedAt: new Date(now).toISOString(),
    timer: {
      ...event.timer,
      remainingSec: secondsLeft(event.timer, now),
      runningSince: null,
    },
  };
}

export function resetDraftClock(event: ArenaEvent): ArenaEvent {
  if (event.status !== "draft") return event;
  return {
    ...event,
    timer: {
      ...event.timer,
      remainingSec: event.timer.durationSec,
      runningSince: null,
    },
  };
}

/**
 * Server-side guard. This runs in the same database transaction as the CAS
 * save, so another tab cannot overwrite a finalized tournament.
 * Completed events allow only publication and cover/featured presentation,
 * never a score, participant, timer, rule, or status change.
 */
export function validateMatchTransition(
  before: ArenaData,
  after: ArenaData,
): string | null {
  const next = new Map(after.events.map((event) => [event.id, event]));
  for (const old of before.events) {
    const current = next.get(old.id);
    if (!current)
      return `Event ${old.title} tidak boleh dihapus lewat Simpan ke Server. Gunakan Trash.`;
    if (
      old.trashedAt !== current.trashedAt ||
      old.trashedBy !== current.trashedBy
    )
      return `Status Trash ${old.title} hanya boleh diubah melalui Recycle Bin.`;
    if (old.trashedAt && JSON.stringify(old) !== JSON.stringify(current))
      return `Event ${old.title} dalam Trash tidak boleh diedit.`;
    if (old.status === "finished") {
      const stripPresentation = (e: ArenaEvent) => {
        const {
          published: _published,
          featured: _featured,
          bannerUrl: _banner,
          ...locked
        } = e;
        return locked;
      };
      if (
        JSON.stringify(stripPresentation(old)) !==
        JSON.stringify(stripPresentation(current))
      ) {
        return `Hasil final ${old.title} terkunci. Hanya publikasi dan banner yang boleh diubah.`;
      }
    } else if (
      old.status !== current.status &&
      !(
        (old.status === "draft" &&
          current.status === "live" &&
          tournamentReadiness(current).canStart) ||
        (old.status === "live" && current.status === "finished")
      )
    ) {
      return `Perubahan status ${old.title} tidak valid. Gunakan Draft → Live → Selesai.`;
    }
  }
  return null;
}

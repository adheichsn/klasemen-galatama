import type { ArenaEvent, ScoreEntry } from "./arena-types";

/** Explicit projection: unknown properties in a JSON snapshot are never public. */
function publicEntry(entry: ScoreEntry): ScoreEntry {
  return {
    id: entry.id,
    participantId: entry.participantId,
    squadId: entry.squadId,
    kind: entry.kind,
    delta: entry.delta,
    // Never forward arbitrary evidence or free-form staff notes.
    description:
      entry.kind === "catch"
        ? [
            entry.fishName || "Tangkapan baru",
            ...(entry.bonuses ?? []).map((b) => b.name),
          ].join(" + ")
        : "",
    createdAt: entry.createdAt,
    quantity: entry.quantity,
    fishId: entry.fishId,
    fishName: entry.fishName,
    basePoints: entry.basePoints,
    bonuses: entry.bonuses?.map((b) => ({
      id: b.id,
      name: b.name,
      points: b.points,
    })),
    reversesEntryId: entry.reversesEntryId,
  };
}
export function projectPublicEvents(events: ArenaEvent[]): ArenaEvent[] {
  return events
    .filter((e) => e.published && !e.trashedAt)
    .map((e) => ({
      id: e.id,
      title: e.title,
      subtitle: e.subtitle,
      location: e.location,
      host: e.host,
      eventDate: e.eventDate,
      mode: e.mode,
      status: e.status,
      published: e.published,
      bannerUrl: e.bannerUrl,
      featured: e.featured,
      historical: e.historical,
      historicalRecordedAt: e.historicalRecordedAt,
      historicalPodium: e.historicalPodium?.slice(),
      tieBreaker: e.tieBreaker,
      tieBonusId: e.tieBonusId,
      rosterLocked: e.rosterLocked,
      squadSizeLimit: e.squadSizeLimit,
      fish: e.fish.map((f) => ({
        id: f.id,
        name: f.name,
        points: f.points,
        enabled: f.enabled,
      })),
      bonuses: e.bonuses.map((b) => ({
        id: b.id,
        name: b.name,
        points: b.points,
        enabled: b.enabled,
      })),
      writtenRules: e.writtenRules.map((r) => ({
        id: r.id,
        group: r.group,
        content: r.content,
      })),
      faqs: e.faqs.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
      })),
      squads: e.squads.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        captainId: s.captainId,
      })),
      participants: e.participants.map((p) => ({
        id: p.id,
        name: p.name,
        username: p.username,
        checkedIn: p.checkedIn,
        squadId: p.squadId,
      })),
      entries: e.entries.map(publicEntry),
      timer: {
        durationSec: e.timer.durationSec,
        remainingSec: e.timer.remainingSec,
        runningSince: e.timer.runningSince,
      },
      createdAt: e.createdAt,
      startedAt: e.startedAt,
      finishedAt: e.finishedAt,
    }));
}

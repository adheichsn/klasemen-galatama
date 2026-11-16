import type { ArenaData, ArenaEvent, EventMode } from "./arena-types";
export const newId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function newEvent(
  title = "Turnamen Baru",
  mode: EventMode = "solo",
): ArenaEvent {
  const id = newId();
  return {
    id,
    title,
    subtitle: "Kompetisi memancing Fish It",
    location: "",
    host: "",
    eventDate: "",
    mode,
    status: "draft",
    published: false,
    bannerUrl: "",
    featured: false,
    tieBreaker: "catches",
    tieBonusId: null,
    fish: [],
    bonuses: [],
    writtenRules: [],
    faqs: [],
    squads: [],
    participants: [],
    entries: [],
    timer: { durationSec: 90 * 60, remainingSec: 90 * 60, runningSince: null },
    createdAt: new Date().toISOString(),
  };
}
export function initialArena(): ArenaData {
  const event = newEvent("Galatama Perdana");
  return { version: 2, activeEventId: event.id, events: [event] };
}

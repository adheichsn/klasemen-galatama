import type { ArenaEvent, EditorSection } from "@/lib/arena-types";

import { completeDuoRoster } from "./arena-rules";

/** Presentation-only readiness: must mirror the existing LIVE guard, never alter scoring. */
export function tournamentReadiness(e: ArenaEvent) {
  const activeFish = e.fish.filter((fish) => fish.enabled).length;
  const hasRoster =
    e.participants.length > 0 &&
    completeDuoRoster(e) &&
    (e.mode === "solo" ||
      (e.squads.length > 0 &&
        e.participants.every(
          (p) => !!p.squadId && e.squads.some((s) => s.id === p.squadId),
        )));
  const sections: Record<EditorSection, boolean> = {
    general: !!e.title.trim(),
    marketing: !!e.bannerUrl || !!e.featured,
    fish: activeFish > 0,
    bonuses: e.bonuses.some((bonus) => bonus.enabled),
    rules: e.writtenRules.length > 0,
    participants: hasRoster,
    faq: e.faqs.length > 0,
  };
  return {
    activeFish,
    hasRoster,
    canStart: activeFish > 0 && hasRoster,
    sections,
    completed: Object.values(sections).filter(Boolean).length,
    optional: ["marketing", "bonuses", "rules", "faq"] as const,
  };
}

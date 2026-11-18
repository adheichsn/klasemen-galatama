import type { ArenaData, ArenaEvent } from "./arena-types";

/** Names/identifiers only: never send tournament contents or staff data on the wire. */
export const PUBLIC_CHANGE_CHANNEL = "weji_arena_public_changes";

function publiclyVisible(event?: ArenaEvent): boolean {
  return !!event && event.published && !event.trashedAt;
}

/** A single server save can affect multiple events. Ignore unpublished drafts,
 * but notify subscribers when a published event becomes hidden/deleted. */
export function changedPublicEventIds(
  previous: ArenaData | null,
  next: ArenaData,
): string[] {
  const oldEvents = new Map(
    (previous?.events ?? []).map((event) => [event.id, event]),
  );
  const newEvents = new Map(next.events.map((event) => [event.id, event]));
  const ids = new Set([...oldEvents.keys(), ...newEvents.keys()]);
  return [...ids].filter((id) => {
    const oldEvent = oldEvents.get(id);
    const newEvent = newEvents.get(id);
    if (!publiclyVisible(oldEvent) && !publiclyVisible(newEvent)) return false;
    return JSON.stringify(oldEvent) !== JSON.stringify(newEvent);
  });
}

export function validPublicEventId(id: unknown): id is string {
  return (
    typeof id === "string" &&
    id.length > 0 &&
    id.length <= 128 &&
    !/[\u0000-\u001f\u007f]/.test(id)
  );
}

import type { ArenaEvent, EventMode, EventStatus } from "./arena-types";

/** Lightweight public listing: no ledger, catch references, or staff-only data. */
export type MarketplaceEvent = Pick<ArenaEvent,
  "id" | "title" | "subtitle" | "location" | "host" | "eventDate" |
  "mode" | "status" | "bannerUrl" | "featured" | "createdAt"
> & { participantCount: number; topPoints?: number };

export type MarketplaceMode = EventMode | "all";
export type MarketplaceStatus = EventStatus | "all";
export type MarketplaceSort = "recommended" | "newest" | "participants" | "alphabetical";
export type MarketplaceFilters = {
  query: string;
  mode: MarketplaceMode;
  status: MarketplaceStatus;
  sort: MarketplaceSort;
};

const weight = (event: MarketplaceEvent) =>
  event.status === "live" ? 3 : event.status === "draft" ? 2 : 1;

/** Pure public catalog filtering. Does not mutate the input array or event data. */
export function filterMarketplaceEvents(
  events: readonly MarketplaceEvent[],
  { query, mode, status, sort }: MarketplaceFilters,
): MarketplaceEvent[] {
  const term = query.trim().toLocaleLowerCase("id-ID");
  return events
    .filter((event) =>
      (mode === "all" || event.mode === mode) &&
      (status === "all" || event.status === status) &&
      (!term || [event.title, event.subtitle, event.location, event.host]
        .join(" ").toLocaleLowerCase("id-ID").includes(term)),
    )
    .sort((a, b) => {
      if (sort === "alphabetical") return a.title.localeCompare(b.title, "id-ID");
      if (sort === "participants") {
        return b.participantCount - a.participantCount || a.title.localeCompare(b.title, "id-ID");
      }
      if (sort === "newest") {
        return (b.eventDate || b.createdAt).localeCompare(a.eventDate || a.createdAt);
      }
      return Number(!!b.featured) - Number(!!a.featured) ||
        weight(b) - weight(a) ||
        (b.eventDate || b.createdAt).localeCompare(a.eventDate || a.createdAt);
    });
}

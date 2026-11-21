/** Pure URL and indexing policy, shared by metadata, robots and sitemap. */
import type { ArenaEvent } from "./arena-types";
import { validRobloxId } from "./player-identity";

export type SeoEnvironment = {
  WEJI_SITE_URL?: string;
  VERCEL_ENV?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  NODE_ENV?: string;
};
export function parseSiteOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.port ||
      !url.hostname.includes(".") ||
      url.hostname.endsWith(".localhost") ||
      url.hostname === "127.0.0.1" ||
      /^[\d.]+$/.test(url.hostname)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}
export function seoPolicy(env: SeoEnvironment) {
  const origin = env.WEJI_SITE_URL?.trim()
    ? parseSiteOrigin(env.WEJI_SITE_URL)
    : parseSiteOrigin(
        env.VERCEL_PROJECT_PRODUCTION_URL
          ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
          : undefined,
      );
  const production = env.VERCEL_ENV
    ? env.VERCEL_ENV === "production"
    : env.NODE_ENV === "production";
  return { origin, index: !!origin && production };
}
export const SITE_NAME = "WEJI ARENA";
export const HOME_TITLE = "WEJI ARENA | Turnamen Galatama Fish It Roblox";
export const HOME_DESCRIPTION =
  "Platform kompetisi Roblox Indonesia. Temukan turnamen Galatama Fish It, pantau klasemen, lihat profil pemain, statistik, hasil pertandingan, dan Hall of Fame.";
export const SOCIAL_IMAGE = "/weji-social.png";
export const PUBLIC_PAGES = [
  "/",
  "/turnamen",
  "/pemain",
  "/arsip",
  "/hall-of-fame",
  "/statistik",
  "/faq",
] as const;
export type SeoEvent = Pick<
  ArenaEvent,
  | "id"
  | "published"
  | "trashedAt"
  | "status"
  | "title"
  | "location"
  | "mode"
  | "subtitle"
  | "bannerUrl"
>;
export function indexableEvent(event: SeoEvent) {
  // A published upcoming draft stays accessible on the site, but is not indexed.
  return (
    event.published &&
    !event.trashedAt &&
    (event.status === "live" || event.status === "finished")
  );
}
export const eventPath = (id: string) => `/turnamen/${encodeURIComponent(id)}`;
export type EventPageKind = "detail" | "hasil" | "statistik";
export function eventSeoPath(id: string, kind: EventPageKind) {
  return `${eventPath(id)}${kind === "detail" ? "" : `/${kind}`}`;
}
export function eventSeoAllowed(event: SeoEvent, kind: EventPageKind) {
  return (
    indexableEvent(event) && (kind !== "hasil" || event.status === "finished")
  );
}
export function sitemapPaths(events: SeoEvent[], publicPlayerIds: string[]) {
  const paths = new Set<string>(PUBLIC_PAGES);
  for (const event of events.filter(indexableEvent)) {
    paths.add(eventPath(event.id));
    paths.add(eventSeoPath(event.id, "statistik"));
    if (event.status === "finished") paths.add(eventSeoPath(event.id, "hasil"));
  }
  for (const id of publicPlayerIds)
    if (validRobloxId(id)) paths.add(`/pemain/id/${id}`);
  return [...paths];
}
export function cleanSeoText(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim();
  const chars = Array.from(text);
  return chars.length <= max
    ? text
    : `${chars
        .slice(0, max - 1)
        .join("")
        .trimEnd()}…`;
}
/** Script-context escaping prevents a title containing </script> from breaking JSON-LD. */
export function serializeJsonLd(value: object) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

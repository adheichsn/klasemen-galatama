import type { MetadataRoute } from "next";
import { sitePolicy } from "@/lib/seo";
import { sitemapPaths } from "@/lib/seo-core";
import { publicSeoDirectory } from "@/lib/seo-server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { origin, index } = sitePolicy();
  if (!index || !origin) return [];
  const { events, players, unavailable } = await publicSeoDirectory();
  // Do not advertise an empty catalog as authoritative during a database outage.
  if (unavailable) throw new Error("Public sitemap temporarily unavailable");
  return sitemapPaths(
    events,
    players.map((p) => p.profile.robloxId),
  ).map((path) => ({ url: new URL(path, origin).href }));
}

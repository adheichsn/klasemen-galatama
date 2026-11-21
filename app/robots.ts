import type { MetadataRoute } from "next";
import { sitePolicy } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  const { origin, index } = sitePolicy();
  if (!index || !origin) return { rules: { userAgent: "*", disallow: "/" } };
  // Allow public assets and page crawling; admin already has an independent X-Robots-Tag and auth.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin/", "/api/public/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}

import { serializeJsonLd, SITE_NAME } from "@/lib/seo-core";
import { sitePolicy } from "@/lib/seo";

export function WebsiteJsonLd() {
  const { origin, index } = sitePolicy();
  if (!origin || !index) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: origin,
          inLanguage: "id-ID",
        }),
      }}
    />
  );
}
export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; path: string }[];
}) {
  const { origin, index } = sitePolicy();
  if (!origin || !index) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [{ name: "Beranda", path: "/" }, ...items].map(
            (item, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: item.name,
              item: new URL(item.path, origin).href,
            }),
          ),
        }),
      }}
    />
  );
}

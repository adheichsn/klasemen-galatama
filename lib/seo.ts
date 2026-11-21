import "server-only";
import type { Metadata } from "next";
import {
  HOME_DESCRIPTION,
  SITE_NAME,
  SOCIAL_IMAGE,
  cleanSeoText,
  seoPolicy,
} from "./seo-core";
export const sitePolicy = () =>
  seoPolicy({
    WEJI_SITE_URL: process.env.WEJI_SITE_URL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    NODE_ENV: process.env.NODE_ENV,
  });
export const nonIndexMetadata: Metadata = {
  robots: { index: false, follow: false },
};
type PageSeo = {
  title: string;
  description?: string;
  path: string;
  image?: string;
  index?: boolean;
  absoluteTitle?: boolean;
};
export function pageMetadata({
  title,
  description = HOME_DESCRIPTION,
  path,
  image,
  index = true,
  absoluteTitle = false,
}: PageSeo): Metadata {
  const policy = sitePolicy();
  const canonical = policy.origin
    ? new URL(path, policy.origin).href
    : undefined;
  const socialTitle = cleanSeoText(
    absoluteTitle ? title : `${title} | ${SITE_NAME}`,
    100,
  );
  const desc = cleanSeoText(description, 180);
  const imageUrl = image?.startsWith("https://")
    ? image
    : policy.origin
      ? new URL(image || SOCIAL_IMAGE, policy.origin).href
      : undefined;
  const images = imageUrl
    ? [
        {
          url: imageUrl,
          alt: SITE_NAME,
          ...(!image ? { width: 1200, height: 630 } : {}),
        },
      ]
    : undefined;
  const canIndex = policy.index && index;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    robots: { index: canIndex, follow: canIndex },
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      title: socialTitle,
      description: desc,
      ...(canonical ? { url: canonical } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: desc,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

import type { Metadata } from "next";
import "./globals.css";
import { HOME_TITLE, HOME_DESCRIPTION } from "@/lib/seo-core";
import { sitePolicy } from "@/lib/seo";
const policy = sitePolicy();
export const metadata: Metadata = {
  ...(policy.origin ? { metadataBase: new URL(policy.origin) } : {}),
  robots: { index: policy.index, follow: policy.index },
  title: {
    default: HOME_TITLE,
    template: "%s | WEJI ARENA",
  },
  description: HOME_DESCRIPTION,
  ...(process.env.WEJI_GOOGLE_SITE_VERIFICATION?.trim()
    ? {
        verification: {
          google: process.env.WEJI_GOOGLE_SITE_VERIFICATION.trim(),
        },
      }
    : {}),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

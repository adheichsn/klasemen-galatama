import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "WEJI ARENA | Fish It Tournament Platform",
    template: "%s | WEJI ARENA",
  },
  description:
    "WEJI ARENA - portal turnamen Fish It. Temukan kompetisi, pantau klasemen, jelajahi arsip dan Hall of Fame.",
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

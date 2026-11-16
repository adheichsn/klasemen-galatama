import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Galatama Arena | Fish It Tournament Platform",
  description:
    "Platform turnamen Fish It: custom scoring, leaderboard, FAQ, archives, dan Hall of Fame.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}

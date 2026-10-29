import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Galatama Arena | Klasemen Turnamen",
  description: "Sistem klasemen dan poin turnamen Galatama Fish It",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

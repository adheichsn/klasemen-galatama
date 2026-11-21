"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Fish, Menu, Search, Trophy, X } from "lucide-react";

const links = [
  { href: "/", text: "Beranda" },
  { href: "/turnamen", text: "Turnamen" },
  { href: "/turnamen?status=live", text: "Live" },
  { href: "/statistik", text: "Statistik" },
  { href: "/pemain", text: "Pemain" },
  { href: "/arsip", text: "Arsip" },
  { href: "/hall-of-fame", text: "Hall of Fame" },
  { href: "/faq", text: "FAQ" },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-white/95 shadow-[0_8px_35px_rgba(25,61,124,.035)] backdrop-blur-xl">
      <div className="border-b border-blue-50 bg-[#f1f6ff]">
        <div className="mx-auto flex max-w-[1260px] items-center justify-center gap-2 px-4 py-1.5 text-center text-[10px] font-extrabold tracking-wide text-blue-700 sm:text-[11px]">
          <Trophy size={13} aria-hidden="true" className="text-amber-500" />
          COMPETE AND MAKE HISTORY
        </div>
      </div>
      <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:gap-6">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="WEJI ARENA - Beranda"
          onClick={() => setOpen(false)}
        >
          <span className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#1543af] text-white shadow-[0_7px_20px_rgba(37,99,235,.23)]">
            <Fish size={23} aria-hidden="true" />
            <span className="absolute -bottom-1 -right-1 size-3.5 rounded-full border-[3px] border-white bg-sky-400" />
          </span>
          <span className="text-[19px] font-black leading-none tracking-[-.055em] text-[#132855] sm:text-[22px]">
            WEJI <span className="text-blue-600">ARENA</span>
            <span className="mt-1.5 block text-[8px] font-extrabold tracking-[.12em] text-slate-400 sm:text-[9px]">
              COMPETITIVE GAMING PLATFORM
            </span>
          </span>
        </Link>
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-1 xl:flex"
        >
          {links.map((item) => {
            const selected =
              item.href === "/"
                ? pathname === "/"
                : item.href.includes("?")
                  ? false
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={selected ? "page" : undefined}
                className={`rounded-xl px-2.5 py-2.5 text-[12px] font-extrabold transition-colors ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"}`}
              >
                {item.text}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/turnamen"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100 sm:w-auto sm:gap-2 sm:px-4"
            aria-label="Cari turnamen"
          >
            <Search size={17} aria-hidden="true" />
            <span className="hidden text-xs font-extrabold sm:inline">
              Cari Event
            </span>
          </Link>
          <Link
            href="/turnamen?status=live"
            className="hidden items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold !text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 lg:inline-flex"
          >
            Live Klasemen <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="weji-mobile-navigation"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            className="inline-flex size-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-[#173A78] xl:hidden"
          >
            {open ? (
              <X size={21} aria-hidden="true" />
            ) : (
              <Menu size={21} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="weji-mobile-navigation"
          aria-label="Navigasi mobile"
          className="border-t border-blue-100 bg-white px-4 pb-4 pt-2 shadow-lg sm:px-6 xl:hidden"
        >
          <div className="mx-auto grid max-w-[1260px] grid-cols-2 gap-2 sm:grid-cols-4">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl border border-blue-50 bg-[#f8fbff] px-4 py-3 text-xs font-bold text-[#25416f] transition hover:bg-blue-50"
              >
                {item.text}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

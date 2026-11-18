"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Fish,
  MapPin,
  Radio,
  Sparkles,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import type { EventMode, EventStatus } from "@/lib/arena-types";
import { validBannerUrl } from "@/lib/banner";

export type FeaturedPromo = {
  id: string;
  title: string;
  subtitle: string;
  location: string;
  mode: EventMode;
  status: EventStatus;
  bannerUrl?: string;
};

export function FeaturedCarousel({
  events,
  eventCount,
  liveCount,
  playerCount,
}: {
  events: FeaturedPromo[];
  eventCount: number;
  liveCount: number;
  playerCount: number;
}) {
  const slides = [
    {
      id: "welcome",
      title: "Your Arena. Your Glory.",
      subtitle:
        "Jelajahi turnamen Fish It, pantau klasemen secara publik, dan abadikan kemenanganmu di WEJI ARENA.",
      href: "/turnamen",
      location: "FISH IT COMMUNITY",
      label: "WELCOME TO WEJI ARENA",
      mode: "solo",
      status: "draft",
      bannerUrl: "",
    },
    ...events.map((event) => ({
      ...event,
      href: `/turnamen/${encodeURIComponent(event.id)}`,
      label:
        event.status === "live" ? "LIVE IN THE ARENA" : "FEATURED TOURNAMENT",
    })),
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const touchStart = useRef<number | null>(null);
  const current = slides[active] ?? slides[0];
  useEffect(() => {
    if (
      slides.length <= 1 ||
      paused ||
      document.visibilityState !== "visible" ||
      reduceMotion
    )
      return;
    const timer = window.setInterval(
      () => setActive((prev) => (prev + 1) % slides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [slides.length, paused, reduceMotion]);
  const move = (direction: number) =>
    setActive((prev) => (prev + direction + slides.length) % slides.length);
  const hasImage = !!current.bannerUrl && validBannerUrl(current.bannerUrl);
  return (
    <section className="relative overflow-hidden bg-[#edf4ff] py-6 sm:py-9">
      <div className="mx-auto max-w-[1260px] px-4 sm:px-6">
        <div
          className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0E2862] via-[#1D4FB6] to-[#267CF0] text-white shadow-[0_22px_65px_rgba(30,75,160,.20)] sm:rounded-[34px]"
          onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return;
            const delta = event.changedTouches[0]?.clientX - touchStart.current;
            if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
            touchStart.current = null;
          }}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setPaused(false);
          }}
        >
          {hasImage && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
              style={{ backgroundImage: `url("${current.bannerUrl}")` }}
            />
          )}
          <div
            className={`absolute inset-0 ${hasImage ? "bg-gradient-to-r from-[#081B42]/95 via-[#0B2D72]/85 to-[#0C387E]/25" : "bg-gradient-to-r from-[#0D2B70] via-[#2057C9] to-[#2680F1]"}`}
          />
          <div className="pointer-events-none absolute -right-28 -top-32 h-96 w-96 rounded-full border-[58px] border-white/[.07]" />
          <div className="pointer-events-none absolute -bottom-44 right-[14%] h-72 w-72 rounded-full border-[40px] border-sky-200/10" />
          {!hasImage && (
            <div className="pointer-events-none absolute right-[5%] top-[18%] hidden items-center justify-center rounded-full border-2 border-white/20 p-16 lg:flex">
              <Waves size={120} strokeWidth={0.65} className="text-white/35" />
              <Fish
                size={80}
                className="absolute -left-14 -top-10 -rotate-12 text-sky-100/30"
              />
            </div>
          )}
          <div className="relative z-10 flex min-h-[348px] flex-col justify-between gap-8 p-7 sm:min-h-[405px] sm:p-11 lg:p-12">
            <motion.div className="max-w-[680px]" key={current.id}
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.38, ease: "easeOut" }} aria-live="off">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[10px] font-extrabold tracking-[.18em] text-blue-100 backdrop-blur-sm">
                {current.status === "live" ? (
                  <Radio size={13} />
                ) : (
                  <Sparkles size={13} />
                )}{" "}
                {current.label}
              </span>
              <h1 className="mt-5 max-w-[700px] text-[37px] font-black leading-[1.1] tracking-[-.055em] text-white sm:text-[54px] lg:text-[61px]">
                {current.id === "welcome" ? (
                  <>
                    Your Arena.
                    <span className="block text-[#9BDFFF]">Your Glory.</span>
                  </>
                ) : (
                  current.title
                )}
              </h1>
              <p className="mt-4 max-w-[510px] text-sm leading-7 text-blue-100 sm:text-base">
                {current.subtitle ||
                  "Bergabunglah dalam keseruan turnamen Fish It dan pantau hasilnya secara langsung."}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={current.href}
                  style={{ color: "#1D4ED8" }}
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-extrabold shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {current.id === "welcome"
                    ? "Explore Tournaments"
                    : "Lihat Turnamen"}{" "}
                  <ArrowRight size={16} />
                </Link>
                <Link
                  href="/hall-of-fame"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-extrabold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Hall of Fame <Trophy size={15} />
                </Link>
              </div>
            </motion.div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-white/20 pt-5">
              <div className="grid grid-cols-3 gap-6 text-white sm:gap-12">
                <div>
                  <b className="block text-xl font-black tabular-nums">
                    {eventCount}
                  </b>
                  <span className="text-[10px] text-blue-100">
                    Turnamen publik
                  </span>
                </div>
                <div>
                  <b className="block text-xl font-black tabular-nums">
                    {liveCount}
                  </b>
                  <span className="text-[10px] text-blue-100">Live Event</span>
                </div>
                <div>
                  <b className="block text-xl font-black tabular-nums">
                    {playerCount}
                  </b>
                  <span className="text-[10px] text-blue-100">
                    Pendaftaran pemain
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2" aria-label="Navigasi banner">
                {slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      aria-label="Banner sebelumnya"
                      onClick={() => move(-1)}
                      className="rounded-full border border-white/30 bg-white/10 p-2.5 text-white hover:bg-white/25"
                    >
                      <ChevronLeft size={17} />
                    </button>
                    <div className="flex items-center gap-1.5" role="group" aria-label="Pilih banner">
                      {slides.map((slide, index) => (
                        <button key={slide.id} type="button" aria-label={`Tampilkan banner ${index + 1}`} aria-current={active === index ? "true" : undefined}
                          onClick={() => setActive(index)}
                          className={`h-1.5 rounded-full transition-all ${active === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/70"}`} />
                      ))}
                    </div>
                    <button
                      type="button"
                      aria-label="Banner berikutnya"
                      onClick={() => move(1)}
                      className="rounded-full border border-white/30 bg-white/10 p-2.5 text-white hover:bg-white/25"
                    >
                      <ChevronRight size={17} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />{" "}
            Platform turnamen komunitas Fish It • SOLO & SQUAD
          </div>
          <Link
            href="/turnamen?status=live"
            className="inline-flex items-center gap-1.5 text-blue-700 hover:underline"
          >
            Pantau pertandingan <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

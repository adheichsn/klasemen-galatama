"use client";

import { useEffect, useRef, useState } from "react";
import { Clock3, Pause, Radio, ShieldCheck } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { secondsLeft, timeLabel } from "@/lib/arena-utils";

/** Shows time derived from the saved server timestamp, never controls the match. */
export default function LiveMatchClock({ event }: { event: ArenaEvent }) {
  const [now, setNow] = useState<number | null>(null);
  const offsetMs = useRef(0);
  useEffect(() => {
    let mounted = true;
    async function syncClock() {
      const sent = Date.now();
      try {
        const response = await fetch("/api/public/time", { cache: "no-store" });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        const received = Date.now();
        const server = (payload as { serverTime?: unknown })?.serverTime;
        if (typeof server === "number" && Number.isFinite(server) && mounted) {
          // Midpoint compensates for network RTT; score timestamps remain server-owned.
          offsetMs.current = server - (sent + received) / 2;
          setNow(received + offsetMs.current);
        }
      } catch {
        /* Browser clock fallback if time endpoint is unavailable. */
      }
    }
    setNow(Date.now());
    void syncClock();
    const interval = window.setInterval(
      () => setNow(Date.now() + offsetMs.current),
      1000,
    );
    const resync = window.setInterval(() => void syncClock(), 60000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncClock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.clearInterval(resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [event.id]);

  const left = now === null ? null : secondsLeft(event.timer, now);
  const percent = Math.max(
    0,
    Math.min(
      100,
      (100 * (left ?? event.timer.remainingSec)) /
        Math.max(event.timer.durationSec, 1),
    ),
  );
  const isFinal = event.status === "finished";
  const isPaused =
    event.status === "live" &&
    event.timer.runningSince === null &&
    (left ?? event.timer.remainingSec) > 0;
  const isExpired = event.status === "live" && left === 0;
  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5"
      aria-label="Status waktu pertandingan"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.13em] text-slate-500">
            {isFinal ? (
              <ShieldCheck size={16} className="text-emerald-600" />
            ) : isPaused ? (
              <Pause size={16} className="text-amber-600" />
            ) : (
              <Radio size={16} className="text-blue-600" />
            )}
            {isFinal
              ? "HASIL FINAL • TERKUNCI"
              : isExpired
                ? "WAKTU HABIS"
                : isPaused
                  ? "PERTANDINGAN DI-PAUSE"
                  : "LIVE MATCH TIMER"}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isFinal
              ? "Peringkat dan poin akhir telah diarsipkan."
              : "Waktu pertandingan berasal dari server; tampilan disinkronkan berkala."}
          </p>
        </div>
        <div
          className={`flex items-center gap-2 font-mono text-2xl font-black tabular-nums sm:text-3xl ${isExpired ? "text-rose-600" : "text-[#142A55]"}`}
        >
          <Clock3 size={22} className="text-blue-600" />
          {left === null ? "--:--:--" : timeLabel(left)}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-blue-100">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${isExpired ? "bg-rose-500" : isFinal ? "bg-emerald-500" : "bg-blue-600"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

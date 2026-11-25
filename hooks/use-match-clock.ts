"use client";
import { useEffect, useRef, useState } from "react";
import {
  clockFromAnchor,
  makeClockAnchor,
  type ClockAnchor,
} from "@/lib/realtime-policy";

export function useMatchClock(id: string, enabled = true) {
  const [now, setNow] = useState<number | null>(null);
  const [synced, setSynced] = useState(false);
  const anchorRef = useRef<ClockAnchor | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setSynced(false);
    let active = true;
    let syncSequence = 0;
    const initialMono = performance.now();
    anchorRef.current = { serverAtMs: Date.now(), observedMonoMs: initialMono };
    const tick = () => {
      if (!active || !anchorRef.current) return;
      setNow(clockFromAnchor(anchorRef.current, performance.now()));
    };
    tick();

    async function syncClock() {
      if (document.visibilityState !== "visible") return;
      const seq = ++syncSequence;
      const sent = performance.now();
      try {
        const response = await fetch("/api/public/time", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        const received = performance.now();
        const serverTime = (payload as { serverTime?: unknown })?.serverTime;
        if (typeof serverTime !== "number") return;
        const anchor = makeClockAnchor(serverTime, sent, received);
        if (!active || seq !== syncSequence || !anchor) return;
        anchorRef.current = anchor;
        setSynced(true);
        tick();
      } catch {
        // Keep the last good anchor, or local monotonic estimate if offline.
      }
    }

    void syncClock();
    const ticker = window.setInterval(tick, 1000);
    const resync = window.setInterval(() => void syncClock(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        tick();
        void syncClock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      syncSequence++;
      window.clearInterval(ticker);
      window.clearInterval(resync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, enabled]);

  return { now, synced };
}

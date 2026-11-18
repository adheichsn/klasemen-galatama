"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, WifiOff } from "lucide-react";

/** SSE is a best-effort low-latency hint. Every page still polls while visible,
 * so transient connection failure and serverless restarts cannot freeze scores. */
export default function PublicAutoRefresh({
  eventId,
  intervalMs = 15000,
  dark = false,
}: {
  eventId?: string;
  intervalMs?: number;
  dark?: boolean;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const pendingRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refresh, Math.max(5000, intervalMs));
    // Refresh immediately when returning to a tab that may have missed events.
    document.addEventListener("visibilitychange", refresh);
    let source: EventSource | null = null;
    if (eventId && typeof EventSource !== "undefined") {
      source = new EventSource(
        `/api/public/stream?eventId=${encodeURIComponent(eventId)}`,
      );
      source.addEventListener("connected", () => {
        if (alive) setConnected(true);
      });
      source.addEventListener("update", () => {
        if (document.visibilityState !== "visible" || pendingRefresh.current)
          return;
        pendingRefresh.current = setTimeout(() => {
          pendingRefresh.current = null;
          if (alive) router.refresh();
        }, 300);
      });
      source.addEventListener("reconnect", () => {
        if (alive) setConnected(false);
      });
      source.onerror = () => {
        if (alive) setConnected(false);
      };
    }
    return () => {
      alive = false;
      source?.close();
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
      if (pendingRefresh.current) clearTimeout(pendingRefresh.current);
      pendingRefresh.current = null;
    };
  }, [eventId, intervalMs, router]);

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${dark ? "bg-white/10 text-blue-100" : "bg-blue-50 text-blue-700"}`}
    >
      {connected ? (
        <Radio size={13} className="text-emerald-400" />
      ) : (
        <WifiOff size={13} className="opacity-70" />
      )}
      {connected
        ? "Terhubung LIVE • update otomatis"
        : `Mode cadangan • refresh ${Math.round(intervalMs / 1000)} detik`}
    </span>
  );
}

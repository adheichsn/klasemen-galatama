"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Radio, WifiOff } from "lucide-react";
import { FALLBACK_POLL_MS, reconnectDelay } from "@/lib/realtime-policy";

/**
 * LISTEN/NOTIFY is a low-latency hint, not the source of truth. Fresh scores are
 * always fetched through the filtered public server page. The visible tab keeps
 * polling even when SSE is healthy, so missed hints / serverless restarts recover.
 */
export default function PublicAutoRefresh({
  eventId,
  intervalMs = FALLBACK_POLL_MS,
  dark = false,
  streamingEnabled = true,
}: {
  eventId?: string;
  intervalMs?: number;
  dark?: boolean;
  streamingEnabled?: boolean;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let alive = true;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    let lastRefresh = 0;
    const visible = () => document.visibilityState === "visible";

    const queueRefresh = (delayMs = 250) => {
      if (!alive || !visible() || refreshTimer) return;
      // Coalesce bursts and avoid overlapping SSE/visibility/poll refresh calls.
      const wait = Math.max(delayMs, 900 - (Date.now() - lastRefresh));
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (!alive || !visible()) return;
        lastRefresh = Date.now();
        router.refresh();
      }, wait);
    };

    const closeSource = () => {
      const previous = source;
      source = null;
      if (previous) {
        previous.onerror = null;
        previous.close();
      }
    };
    const clearRetry = () => {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
    };
    const connect = () => {
      if (
        !alive ||
        !visible() ||
        !eventId ||
        !streamingEnabled ||
        typeof EventSource === "undefined" ||
        source
      )
        return;
      const next = new EventSource(
        `/api/public/stream?eventId=${encodeURIComponent(eventId)}`,
      );
      source = next;
      next.addEventListener("connected", () => {
        if (!alive || source !== next) return;
        retries = 0;
        setConnected(true);
        // Catch any updates missed between SSR and the successful subscription.
        queueRefresh(0);
      });
      next.addEventListener("update", () => queueRefresh(220));
      next.addEventListener("degraded", () => {
        if (alive && source === next) setConnected(false);
        // Keep this SSE open: the broker may reconnect without changing HTTP.
      });
      const retry = () => {
        if (!alive || source !== next) return;
        setConnected(false);
        closeSource();
        if (!visible() || retryTimer) return;
        const delay = reconnectDelay(retries++, Math.random());
        retryTimer = setTimeout(() => {
          retryTimer = null;
          connect();
        }, delay);
      };
      next.addEventListener("reconnect", retry);
      // Own the retry lifecycle instead of allowing EventSource to issue rapid
      // native retries on failing endpoints or short-lived serverless functions.
      next.onerror = retry;
    };

    const onVisibilityChange = () => {
      if (!visible()) {
        closeSource();
        clearRetry();
        setConnected(false);
        return;
      }
      queueRefresh(0);
      retries = 0;
      connect();
    };
    const poll = window.setInterval(
      () => queueRefresh(0),
      Math.max(5000, intervalMs),
    );
    document.addEventListener("visibilitychange", onVisibilityChange);
    connect();
    return () => {
      alive = false;
      closeSource();
      clearRetry();
      if (refreshTimer) clearTimeout(refreshTimer);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [eventId, intervalMs, router, streamingEnabled]);

  return (
    <span
      role="status"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-extrabold ${dark ? "bg-white/10 text-blue-100" : "bg-blue-50 text-blue-700"}`}
    >
      {streamingEnabled && connected ? (
        <Radio size={13} className="text-emerald-400" />
      ) : (
        <WifiOff size={13} className="opacity-70" />
      )}
      {streamingEnabled && connected
        ? "Terhubung LIVE | update otomatis"
        : `Mode cadangan | refresh ${Math.round(Math.max(5000, intervalMs) / 1000)} detik`}
    </span>
  );
}

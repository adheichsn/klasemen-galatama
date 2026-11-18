/** Pure live-view policies shared by the browser and regression tests. */
export const FALLBACK_POLL_MS = 15_000;
export const LIVE_RETRY_BASE_MS = 1_000;
export const LIVE_RETRY_MAX_MS = 30_000;

/** Exponential backoff, bounded and with a little jitter to avoid reconnect storms. */
export function reconnectDelay(attempt: number, random = 0.5): number {
  const step = Math.max(0, Math.min(8, Math.floor(attempt)));
  const jitter = 0.75 + Math.max(0, Math.min(1, random)) * 0.5;
  return Math.round(
    Math.min(LIVE_RETRY_MAX_MS, LIVE_RETRY_BASE_MS * 2 ** step) * jitter,
  );
}

/** Stable timer anchor: from here onward use a monotonic clock (performance.now). */
export type ClockAnchor = { serverAtMs: number; observedMonoMs: number };
export function makeClockAnchor(
  serverTimeMs: number,
  sentMonoMs: number,
  receivedMonoMs: number,
): ClockAnchor | null {
  const rtt = receivedMonoMs - sentMonoMs;
  if (
    !Number.isFinite(serverTimeMs) ||
    !Number.isFinite(rtt) ||
    rtt < 0 ||
    rtt > 10_000
  )
    return null;
  return {
    serverAtMs: serverTimeMs + rtt / 2,
    observedMonoMs: receivedMonoMs,
  };
}
export function clockFromAnchor(anchor: ClockAnchor, monoNow: number): number {
  return anchor.serverAtMs + Math.max(0, monoNow - anchor.observedMonoMs);
}

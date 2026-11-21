import { NextRequest } from "next/server";
import { getPublicEvents } from "@/lib/db";
import {
  listenerDatabaseUrl,
  subscribePublicChanges,
} from "@/lib/public-broker";
import { validPublicEventId } from "@/lib/public-changes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep the stream below common serverless execution limits.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const eventId = request.nextUrl.searchParams.get("eventId");
  if (!validPublicEventId(eventId))
    return new Response("Event tidak valid", { status: 400 });
  try {
    // Do not establish a subscription for a private, trashed, or non-existent event.
    const published = await getPublicEvents();
    if (!published.some((event) => event.id === eventId))
      return new Response("Event tidak tersedia", { status: 404 });
  } catch {
    return new Response("Database tidak tersedia", { status: 503 });
  }

  if (!listenerDatabaseUrl())
    return new Response(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let active = true;
      let stopListening: () => void = () => {};
      let keepalive: ReturnType<typeof setInterval> | undefined;
      let reconnect: ReturnType<typeof setTimeout> | undefined;
      const send = (message: string) => {
        if (!active) return;
        try {
          controller.enqueue(encoder.encode(message));
        } catch {
          cleanup();
        }
      };
      const abort = () => cleanup();
      cleanup = () => {
        if (!active) return;
        active = false;
        stopListening();
        if (keepalive) clearInterval(keepalive);
        if (reconnect) clearTimeout(reconnect);
        request.signal.removeEventListener("abort", abort);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      send(": WEJI ARENA spectator stream\nretry: 2000\n\n");
      stopListening = subscribePublicChanges(
        (changedId) => {
          if (changedId === eventId) send("event: update\ndata: {}\n\n");
        },
        (connected) =>
          send(
            connected
              ? `event: connected\ndata: ${JSON.stringify({ serverTime: Date.now() })}\n\n`
              : "event: degraded\ndata: {}\n\n",
          ),
      );
      keepalive = setInterval(() => send(": keepalive\n\n"), 20000);
      // Periodic reconnect is deliberate for serverless streaming timeouts.
      reconnect = setTimeout(() => {
        send("event: reconnect\ndata: {}\n\n");
        cleanup();
      }, 50000);
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) cleanup();
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

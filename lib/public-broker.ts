import "server-only";
import { Client } from "pg";
import { PUBLIC_CHANGE_CHANNEL, validPublicEventId } from "./public-changes";
import { reconnectDelay } from "./realtime-policy";

type Subscriber = (eventId: string) => void;
type StatusListener = (connected: boolean) => void;
type Broker = {
  listeners: Set<Subscriber>;
  statusListeners: Set<StatusListener>;
  client: Client | null;
  connecting: Promise<void> | null;
  retry: ReturnType<typeof setTimeout> | null;
  retryAttempt: number;
  healthTimer: ReturnType<typeof setInterval> | null;
  checkingHealth: boolean;
};

// A single LISTEN session per active Node process. A serverless instance is
// ephemeral, so spectators must always retain a regular HTTP polling fallback.
const holder = globalThis as typeof globalThis & {
  __wejiPublicBroker?: Broker;
};
const broker: Broker = (holder.__wejiPublicBroker ??= {
  listeners: new Set(),
  statusListeners: new Set(),
  client: null,
  connecting: null,
  retry: null,
  retryAttempt: 0,
  healthTimer: null,
  checkingHealth: false,
});
// Support a hot-reloaded development process holding an older broker shape.
broker.retryAttempt ??= 0;
broker.healthTimer ??= null;
broker.checkingHealth ??= false;

function broadcastStatus(connected: boolean) {
  for (const listener of broker.statusListeners) {
    try {
      listener(connected);
    } catch {
      /* disconnected spectator */
    }
  }
}
function stopHealthCheck() {
  if (broker.healthTimer) clearInterval(broker.healthTimer);
  broker.healthTimer = null;
}
function reconnectSoon() {
  if (!broker.listeners.size || broker.retry || broker.client) return;
  const delay = reconnectDelay(broker.retryAttempt++, Math.random());
  broker.retry = setTimeout(() => {
    broker.retry = null;
    void ensureConnected();
  }, delay);
}
function stopIfUnused() {
  if (broker.listeners.size) return;
  if (broker.retry) clearTimeout(broker.retry);
  broker.retry = null;
  broker.retryAttempt = 0;
  stopHealthCheck();
  const client = broker.client;
  broker.client = null;
  if (client) void client.end().catch(() => undefined);
}

async function ensureConnected(): Promise<void> {
  if (
    !broker.listeners.size ||
    broker.client ||
    broker.connecting ||
    !process.env.DATABASE_URL
  )
    return;

  const pending = (async () => {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 6000,
      query_timeout: 6000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      application_name: "weji-arena-public-listener",
    });
    let closed = false;
    const disconnected = () => {
      if (closed) return;
      closed = true;
      if (broker.client === client) {
        broker.client = null;
        stopHealthCheck();
        broadcastStatus(false);
      }
      reconnectSoon();
    };
    client.on("notification", (message) => {
      if (
        message.channel !== PUBLIC_CHANGE_CHANNEL ||
        !validPublicEventId(message.payload)
      )
        return;
      for (const listener of broker.listeners) {
        try {
          listener(message.payload);
        } catch {
          /* listener isolated */
        }
      }
    });
    client.on("error", () => {
      disconnected();
      void client.end().catch(() => undefined);
    });
    client.on("end", disconnected);
    try {
      await client.connect();
      await client.query(`LISTEN ${PUBLIC_CHANGE_CHANNEL}`);
      if (!broker.listeners.size) {
        closed = true;
        await client.end();
        return;
      }
      broker.client = client;
      broker.retryAttempt = 0;
      broadcastStatus(true);
      // Some intermediary network failures leave a TCP socket silently open.
      // Confirm the dedicated LISTEN session is still usable every 25 seconds.
      stopHealthCheck();
      broker.healthTimer = setInterval(() => {
        if (broker.checkingHealth || broker.client !== client) return;
        broker.checkingHealth = true;
        void client
          .query("SELECT 1")
          .catch(() => {
            disconnected();
            void client.end().catch(() => undefined);
          })
          .finally(() => {
            broker.checkingHealth = false;
          });
      }, 25_000);
    } catch {
      disconnected();
      await client.end().catch(() => undefined);
    }
  })();
  broker.connecting = pending;
  try {
    await pending;
  } finally {
    if (broker.connecting === pending) broker.connecting = null;
    // If the failed attempt outlasted its retry timer, schedule again.
    if (!broker.client && broker.listeners.size && !broker.retry)
      reconnectSoon();
  }
}

/** Subscribe to event IDs only. The actual scores are always fetched through
 * the published-event-filtered public page, never via database notifications. */
export function subscribePublicChanges(
  listener: Subscriber,
  statusListener?: StatusListener,
): () => void {
  broker.listeners.add(listener);
  if (statusListener) {
    broker.statusListeners.add(statusListener);
    // Always establish the initial state; do not report LIVE before LISTEN.
    try {
      statusListener(!!broker.client);
    } catch {
      /* ignored */
    }
  }
  void ensureConnected();
  return () => {
    broker.listeners.delete(listener);
    if (statusListener) broker.statusListeners.delete(statusListener);
    stopIfUnused();
  };
}

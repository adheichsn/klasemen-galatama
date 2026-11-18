import "server-only";
import { Client } from "pg";
import { PUBLIC_CHANGE_CHANNEL, validPublicEventId } from "./public-changes";

type Subscriber = (eventId: string) => void;
type Broker = {
  listeners: Set<Subscriber>;
  statusListeners: Set<(connected: boolean) => void>;
  client: Client | null;
  connecting: Promise<void> | null;
  retry: ReturnType<typeof setTimeout> | null;
};

// One Postgres LISTEN connection per *running Node process*, not per spectator.
// A serverless instance can still restart: browsers retain a polling fallback.
const holder = globalThis as typeof globalThis & {
  __wejiPublicBroker?: Broker;
};
const broker: Broker = (holder.__wejiPublicBroker ??= {
  listeners: new Set(),
  statusListeners: new Set(),
  client: null,
  connecting: null,
  retry: null,
});

function reconnectSoon() {
  if (!broker.listeners.size || broker.retry) return;
  broker.retry = setTimeout(() => {
    broker.retry = null;
    void ensureConnected();
  }, 3000);
}

async function ensureConnected(): Promise<void> {
  if (
    !broker.listeners.size ||
    broker.client ||
    broker.connecting ||
    !process.env.DATABASE_URL
  )
    return;
  broker.connecting = (async () => {
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 6000,
      application_name: "weji-arena-public-listener",
    });
    let closed = false;
    const disconnected = () => {
      if (closed) return;
      closed = true;
      if (broker.client === client) {
        broker.client = null;
        for (const listener of broker.statusListeners) listener(false);
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
          /* broken spectator ignored */
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
      } else {
        broker.client = client;
        for (const listener of broker.statusListeners) listener(true);
      }
    } catch {
      disconnected();
      await client.end().catch(() => undefined);
    }
  })().finally(() => {
    broker.connecting = null;
  });
  await broker.connecting;
}

/** Subscribe to event *identifiers* only. All actual data must be fetched via
 * the existing public filtered server pages, never from NOTIFY payloads. */
export function subscribePublicChanges(
  listener: Subscriber,
  statusListener?: (connected: boolean) => void,
): () => void {
  broker.listeners.add(listener);
  if (statusListener) {
    broker.statusListeners.add(statusListener);
    if (broker.client) statusListener(true);
  }
  void ensureConnected();
  return () => {
    broker.listeners.delete(listener);
    if (statusListener) broker.statusListeners.delete(statusListener);
    if (broker.listeners.size) return;
    if (broker.retry) clearTimeout(broker.retry);
    broker.retry = null;
    const client = broker.client;
    broker.client = null;
    if (client) void client.end().catch(() => undefined);
  };
}

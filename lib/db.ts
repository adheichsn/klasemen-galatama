import "server-only";
import { Pool } from "pg";
import type { ArenaData } from "@/lib/arena-types";
import { initialArena } from "@/lib/arena-data";

const globalForDb = globalThis as typeof globalThis & { __wejiPool?: Pool };
function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL belum dikonfigurasi. Lihat README.md.");
  if (!globalForDb.__wejiPool) {
    globalForDb.__wejiPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 6000,
    });
  }
  return globalForDb.__wejiPool;
}
export type ArenaSnapshot = { data: ArenaData; revision: number };
export async function getArenaSnapshot(): Promise<ArenaSnapshot> {
  const result = await db().query<{ revision: number; payload: ArenaData }>(
    "SELECT revision, payload FROM weji_arena_state WHERE id = 1",
  );
  if (!result.rows.length) return { revision: 0, data: initialArena() };
  return { data: result.rows[0].payload, revision: result.rows[0].revision };
}
export async function getPublicEvents() {
  const { data } = await getArenaSnapshot();
  return data.events
    .filter((e) => e.published)
    .map((e) => ({
      ...e,
      // Public only needs these immutable score fields, not private staff correction notes.
      entries: e.entries.map((entry) => ({
        id: entry.id,
        participantId: entry.participantId,
        squadId: entry.squadId,
        kind: entry.kind,
        delta: entry.delta,
        description: entry.kind === "catch" ? entry.description : "",
        createdAt: entry.createdAt,
        quantity: entry.quantity,
        bonuses: entry.bonuses,
        reversesEntryId: entry.reversesEntryId,
      })),
    }));
}
export type SaveResult =
  | { ok: true; revision: number }
  | { ok: false; conflict: true };
export async function saveArenaSnapshot(
  value: ArenaData,
  expectedRevision: number,
): Promise<SaveResult> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Compare-and-swap protects against stale admin browser snapshots.
    const result =
      expectedRevision === 0
        ? await client.query<{ revision: number }>(
            "INSERT INTO weji_arena_state (id, revision, payload, updated_at) VALUES (1, 1, $1::jsonb, now()) ON CONFLICT (id) DO NOTHING RETURNING revision",
            [JSON.stringify(value)],
          )
        : await client.query<{ revision: number }>(
            "UPDATE weji_arena_state SET revision = revision + 1, payload = $1::jsonb, updated_at = now() WHERE id = 1 AND revision = $2 RETURNING revision",
            [JSON.stringify(value), expectedRevision],
          );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return { ok: false, conflict: true };
    }
    await client.query(
      "INSERT INTO weji_arena_audit (revision, actor, event_count, recorded_at) VALUES ($1, $2, $3, now())",
      [
        result.rows[0].revision,
        process.env.WEJI_ADMIN_USERNAME || "admin",
        value.events.length,
      ],
    );
    await client.query("COMMIT");
    return { ok: true, revision: result.rows[0].revision };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

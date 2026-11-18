import "server-only";
import { Pool } from "pg";
import type { ArenaData } from "@/lib/arena-types";
import { initialArena } from "@/lib/arena-data";
import { validateMatchTransition } from "@/lib/match-operations";
import { prepareSnapshot } from "@/lib/score-integrity";

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
  | { ok: true; revision: number; data: ArenaData }
  | { ok: false; conflict: true }
  | { ok: false; invalid: string };
export async function saveArenaSnapshot(
  value: ArenaData,
  expectedRevision: number,
): Promise<SaveResult> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    // Lock first, then validate historical final results against the authoritative
    // database snapshot in the same transaction as the versioned write.
    const locked = await client.query<{ revision: number; payload: ArenaData }>(
      "SELECT revision, payload FROM weji_arena_state WHERE id = 1 FOR UPDATE",
    );
    if ((locked.rows[0]?.revision ?? 0) !== expectedRevision) {
      await client.query("ROLLBACK");
      return { ok: false, conflict: true };
    }
    if (locked.rows.length) {
      const invalid = validateMatchTransition(locked.rows[0].payload, value);
      if (invalid) {
        await client.query("ROLLBACK");
        return { ok: false, invalid };
      }
    }
    const prepared = prepareSnapshot(locked.rows[0]?.payload ?? null, value, Date.now());
    if (!prepared.ok) {
      await client.query("ROLLBACK");
      return { ok: false, invalid: prepared.error };
    }
    const safeValue = prepared.data;
    const result =
      expectedRevision === 0
        ? await client.query<{ revision: number }>(
            "INSERT INTO weji_arena_state (id, revision, payload, updated_at) VALUES (1, 1, $1::jsonb, now()) ON CONFLICT (id) DO NOTHING RETURNING revision",
            [JSON.stringify(safeValue)],
          )
        : await client.query<{ revision: number }>(
            "UPDATE weji_arena_state SET revision = revision + 1, payload = $1::jsonb, updated_at = now() WHERE id = 1 AND revision = $2 RETURNING revision",
            [JSON.stringify(safeValue), expectedRevision],
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
        safeValue.events.length,
      ],
    );
    for (const change of prepared.activity) {
      await client.query(
        "INSERT INTO weji_arena_score_audit (revision, event_id, event_title, actor, action, entry_id, participant_id, delta, details) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)",
        [result.rows[0].revision, change.eventId, change.eventTitle,
          process.env.WEJI_ADMIN_USERNAME || "admin", change.action,
          change.entryId ?? null, change.participantId ?? null,
          change.delta ?? null, JSON.stringify(change.details)],
      );
    }
    await client.query("COMMIT");
    return { ok: true, revision: result.rows[0].revision, data: safeValue };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Media lives outside the revisioned tournament JSON; readable only via our own API. */
export async function uploadArenaAsset(
  id: string,
  mime: "image/jpeg" | "image/png" | "image/webp",
  bytes: Buffer,
): Promise<void> {
  await db().query(
    "INSERT INTO weji_arena_assets (id, mime_type, bytes) VALUES ($1::uuid, $2, $3)",
    [id, mime, bytes],
  );
}
export async function getArenaAsset(id: string): Promise<{
  mime_type: string;
  bytes: Buffer;
} | null> {
  const result = await db().query<{ mime_type: string; bytes: Buffer }>(
    "SELECT mime_type, bytes FROM weji_arena_assets WHERE id = $1::uuid",
    [id],
  );
  return result.rows[0] ?? null;
}

/** Panitia-only chronological scoring/lifecycle audit. Never used by public pages. */
export async function getScoreAudit(eventId: string, limit = 100) {
  const result = await db().query<{
    id: number; revision: number; actor: string; action: string;
    entry_id: string | null; participant_id: string | null;
    delta: number | null; details: Record<string, string | number | null>;
    recorded_at: string;
  }>(
    "SELECT id, revision, actor, action, entry_id, participant_id, delta, details, recorded_at FROM weji_arena_score_audit WHERE event_id = $1 ORDER BY id DESC LIMIT $2",
    [eventId, Math.min(200, Math.max(1, limit))],
  );
  return result.rows;
}

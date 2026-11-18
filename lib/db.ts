import "server-only";
import { Pool } from "pg";
import { createHash } from "node:crypto";
import type { ArenaData } from "@/lib/arena-types";
import { initialArena } from "@/lib/arena-data";
import { validateMatchTransition } from "@/lib/match-operations";
import { prepareSnapshot } from "@/lib/score-integrity";
import {
  applyEventLifecycle,
  type EventLifecycleAction,
} from "@/lib/event-lifecycle";
import { WEJI_ASSET_URL } from "@/lib/banner";
import {
  changedPublicEventIds,
  PUBLIC_CHANGE_CHANNEL,
} from "@/lib/public-changes";

const globalForDb = globalThis as typeof globalThis & {
  __wejiPool?: Pool;
  __wejiPoolFingerprint?: string;
};
export function getDatabasePool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL belum dikonfigurasi. Lihat README.md.");
  // Development HMR may reload .env.local without restarting Node. Discard
  // the stale pool instead of silently querying the old Supabase project.
  const fingerprint = createHash("sha256").update(url).digest("hex");
  if (
    globalForDb.__wejiPool &&
    globalForDb.__wejiPoolFingerprint !== fingerprint
  ) {
    const previous = globalForDb.__wejiPool;
    globalForDb.__wejiPool = undefined;
    void previous.end().catch(() => undefined);
  }
  if (!globalForDb.__wejiPool) {
    globalForDb.__wejiPool = new Pool({
      connectionString: url,
      max: process.env.NODE_ENV === "production" ? 2 : 5,
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 6_000,
      query_timeout: 10_000,
      statement_timeout: 10_000,
      application_name: "weji-arena-api",
    });
    globalForDb.__wejiPoolFingerprint = fingerprint;
  }
  return globalForDb.__wejiPool;
}
const db = getDatabasePool;

/** Admin-only diagnostic. Verify tables without creating or changing records. */
export async function getDatabaseHealth() {
  const result = await db().query<{
    state_ready: boolean;
    audit_ready: boolean;
    assets_ready: boolean;
    score_audit_ready: boolean;
    event_audit_ready: boolean;
    login_limits_ready: boolean;
  }>(`SELECT
    to_regclass('public.weji_arena_state') IS NOT NULL AS state_ready,
    to_regclass('public.weji_arena_audit') IS NOT NULL AS audit_ready,
    to_regclass('public.weji_arena_assets') IS NOT NULL AS assets_ready,
    to_regclass('public.weji_arena_score_audit') IS NOT NULL AS score_audit_ready,
    to_regclass('public.weji_arena_event_audit') IS NOT NULL AS event_audit_ready,
    to_regclass('public.weji_arena_login_limits') IS NOT NULL AS login_limits_ready`);
  const tables = result.rows[0];
  return { ready: !!tables && Object.values(tables).every(Boolean), tables };
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
    .filter((e) => e.published && !e.trashedAt)
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
        fishId: entry.fishId,
        fishName: entry.fishName,
        basePoints: entry.basePoints,
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
    const prepared = prepareSnapshot(
      locked.rows[0]?.payload ?? null,
      value,
      Date.now(),
    );
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
        [
          result.rows[0].revision,
          change.eventId,
          change.eventTitle,
          process.env.WEJI_ADMIN_USERNAME || "admin",
          change.action,
          change.entryId ?? null,
          change.participantId ?? null,
          change.delta ?? null,
          JSON.stringify(change.details),
        ],
      );
    }
    // NOTIFY happens atomically on COMMIT. Only event IDs are published,
    // never scoring/participant payloads, credentials or staff audit data.
    for (const eventId of changedPublicEventIds(
      locked.rows[0]?.payload ?? null,
      safeValue,
    )) {
      await client.query(`SELECT pg_notify('${PUBLIC_CHANGE_CHANNEL}', $1)`, [
        eventId,
      ]);
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
    id: number;
    revision: number;
    actor: string;
    action: string;
    entry_id: string | null;
    participant_id: string | null;
    delta: number | null;
    details: Record<string, string | number | null>;
    recorded_at: string;
  }>(
    "SELECT id, revision, actor, action, entry_id, participant_id, delta, details, recorded_at FROM weji_arena_score_audit WHERE event_id = $1 ORDER BY id DESC LIMIT $2",
    [eventId, Math.min(200, Math.max(1, limit))],
  );
  return result.rows;
}

/** Dedicated, authenticated Recycle Bin actions. All writes use the same row
 * lock/revision mechanism as the full editor, preventing stale-tab data loss. */
export async function changeEventLifecycle(
  id: string,
  action: EventLifecycleAction,
  expectedRevision: number,
  confirmedTitle?: string,
): Promise<SaveResult> {
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{ revision: number; payload: ArenaData }>(
      "SELECT revision, payload FROM weji_arena_state WHERE id = 1 FOR UPDATE",
    );
    const current = locked.rows[0];
    if (!current || current.revision !== expectedRevision) {
      await client.query("ROLLBACK");
      return { ok: false, conflict: true };
    }
    const actor = process.env.WEJI_ADMIN_USERNAME || "admin";
    const applied = applyEventLifecycle(
      current.payload,
      id,
      action,
      Date.now(),
      actor,
    );
    if (!applied.ok) {
      await client.query("ROLLBACK");
      return { ok: false, invalid: applied.error };
    }
    // Case-sensitive, exact title. No silent delete, including zero-score events.
    if (action === "delete" && confirmedTitle !== applied.target.title) {
      await client.query("ROLLBACK");
      return {
        ok: false,
        invalid: "Ketik nama event persis untuk konfirmasi hapus permanen.",
      };
    }
    const revision = current.revision + 1;
    await client.query(
      "UPDATE weji_arena_state SET revision = $1, payload = $2::jsonb, updated_at = now() WHERE id = 1",
      [revision, JSON.stringify(applied.data)],
    );
    await client.query(
      "INSERT INTO weji_arena_audit (revision, actor, event_count) VALUES ($1, $2, $3)",
      [revision, actor, applied.data.events.length],
    );
    await client.query(
      "INSERT INTO weji_arena_event_audit (revision, event_id, event_title, actor, action, details) VALUES ($1, $2, $3, $4, $5, $6::jsonb)",
      [
        revision,
        id,
        applied.target.title,
        actor,
        action,
        JSON.stringify({
          status: applied.target.status,
          mode: applied.target.mode,
          participants: applied.target.participants.length,
          scoreEntries: applied.target.entries.length,
        }),
      ],
    );
    if (action === "delete") {
      // Score audit details should not outlive a permanently deleted event.
      await client.query(
        "DELETE FROM weji_arena_score_audit WHERE event_id = $1",
        [id],
      );
      // Remove uploaded banner only if no other tournament (including Trash)
      // still references it. External image URLs are never touched.
      const bannerUrl = applied.target.bannerUrl || "";
      if (
        WEJI_ASSET_URL.test(bannerUrl) &&
        !applied.data.events.some((ev) => ev.bannerUrl === bannerUrl)
      ) {
        const assetId = bannerUrl.split("/").at(-1);
        await client.query(
          "DELETE FROM weji_arena_assets WHERE id = $1::uuid",
          [assetId],
        );
      }
    }
    for (const eventId of changedPublicEventIds(
      current.payload,
      applied.data,
    )) {
      await client.query(`SELECT pg_notify('${PUBLIC_CHANGE_CHANNEL}', $1)`, [
        eventId,
      ]);
    }
    await client.query("COMMIT");
    return { ok: true, data: applied.data, revision };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

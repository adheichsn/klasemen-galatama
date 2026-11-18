import "server-only";
import type { ArenaData } from "./arena-types";
import { standings } from "./arena-utils";
import { validateHistoricalFinal } from "./historical-entry";
import { getDatabasePool } from "./db";
import { changedPublicEventIds, PUBLIC_CHANGE_CHANNEL } from "./public-changes";

export type HistoricalFinalizationResult =
  | { ok: true; data: ArenaData; revision: number }
  | { ok: false; conflict: true }
  | { ok: false; invalid: string };

/** Privileged, atomic Draft historical -> FINISHED transition (no LIVE timer). */
export async function finalizeHistoricalEvent(
  eventId: string,
  revision: number,
  confirmTitle: string,
  podium: string[],
): Promise<HistoricalFinalizationResult> {
  const client = await getDatabasePool().connect();
  try {
    await client.query("BEGIN");
    const row = await client.query<{ revision: number; payload: ArenaData }>(
      "SELECT revision, payload FROM weji_arena_state WHERE id=1 FOR UPDATE",
    );
    const current = row.rows[0];
    if (!current || current.revision !== revision) {
      await client.query("ROLLBACK");
      return { ok: false, conflict: true };
    }
    const event = current.payload.events.find((e) => e.id === eventId);
    if (!event) {
      await client.query("ROLLBACK");
      return { ok: false, invalid: "Turnamen historis tidak ditemukan." };
    }
    const now = Date.now();
    const invalid = validateHistoricalFinal(event, now);
    if (invalid) {
      await client.query("ROLLBACK");
      return { ok: false, invalid };
    }
    const ranking = standings(event);
    const podiumRows = podium.map((id) => ranking.find((row) => row.id === id));
    // Panitia may decide the order of tied players/teams using the original
    // event's official tie-break decision. Never put a lower-scoring entrant
    // above a higher-scoring entrant or choose a non-top-three point value.
    if (confirmTitle !== event.title || podium.length !== 3 || new Set(podium).size !== 3 ||
      podiumRows.some((row) => !row) ||
      podiumRows.some((row, i) => !!row && (row.points < ranking[2].points ||
        (i > 0 && row.points > (podiumRows[i - 1]?.points ?? -Infinity))))) {
      await client.query("ROLLBACK");
      return { ok: false, invalid: "Urutan Juara 1–3 tidak valid. Hanya urutan peserta berpoin sama yang boleh diubah." };
    }
    const leaders = [...podium];
    const finalized = {
      ...event,
      status: "finished" as const,
      published: true,
      rosterLocked: true,
      startedAt: undefined,
      finishedAt: undefined, // eventDate is the actual date; no invented end time
      historicalRecordedAt: new Date(now).toISOString(),
      historicalPodium: leaders,
      timer: { ...event.timer, remainingSec: 0, runningSince: null },
    };
    const data: ArenaData = {
      ...current.payload,
      events: current.payload.events.map((item) => item.id === eventId ? finalized : item),
    };
    const nextRevision = revision + 1;
    await client.query(
      "UPDATE weji_arena_state SET revision=$1, payload=$2::jsonb, updated_at=now() WHERE id=1",
      [nextRevision, JSON.stringify(data)],
    );
    const actor = process.env.WEJI_ADMIN_USERNAME || "admin";
    await client.query(
      "INSERT INTO weji_arena_audit (revision, actor, event_count, recorded_at) VALUES ($1, $2, $3, now())",
      [nextRevision, actor, data.events.length],
    );
    await client.query(
      "INSERT INTO weji_arena_score_audit (revision, event_id, event_title, actor, action, details) VALUES ($1,$2,$3,$4,'finish',$5::jsonb)",
      [nextRevision, event.id, event.title, actor, JSON.stringify({ historical: true, eventDate: event.eventDate, participants: event.participants.length, entries: event.entries.length, podium: leaders })],
    );
    for (const id of changedPublicEventIds(current.payload, data))
      await client.query(`SELECT pg_notify('${PUBLIC_CHANGE_CHANNEL}', $1)`, [id]);
    await client.query("COMMIT");
    return { ok: true, data, revision: nextRevision };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

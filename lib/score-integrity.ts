import type { ArenaData, ArenaEvent, ScoreEntry } from "./arena-types";
import { calculateCatch } from "./arena-rules";
import { secondsLeft } from "./arena-utils";
import { validateRosterChange } from "./roster-management";

/**
 * V2.6: Validate a full-snapshot edit against the row locked in PostgreSQL.
 * The server chooses lifecycle timestamps and all timestamps for NEW scores.
 * Existing entries are append-only: adjustments must be reversal/manual entries.
 */
export type ScoreAuditChange = {
  eventId: string;
  eventTitle: string;
  action:
    | "catch"
    | "manual"
    | "reversal"
    | "start"
    | "pause"
    | "resume"
    | "finish";
  entryId?: string;
  participantId?: string;
  delta?: number;
  details: Record<string, string | number | null>;
};
export type PreparedSave =
  | { ok: true; data: ArenaData; activity: ScoreAuditChange[] }
  | { ok: false; error: string };

const fail = (error: string): PreparedSave => ({ ok: false, error });
const copy = <T>(item: T): T => JSON.parse(JSON.stringify(item)) as T;
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const referenceKey = (value: string) => value.trim().toLocaleUpperCase("id-ID");
const validReference = (value: string) =>
  value.length >= 2 &&
  value.length <= 80 &&
  value === value.trim() &&
  !/[\u0000-\u001F]/.test(value);
const addActivity = (
  activity: ScoreAuditChange[],
  event: ArenaEvent,
  action: ScoreAuditChange["action"],
  details: ScoreAuditChange["details"],
  entry?: ScoreEntry,
) => {
  activity.push({
    eventId: event.id,
    eventTitle: event.title,
    action,
    entryId: entry?.id,
    participantId: entry?.participantId,
    delta: entry?.delta,
    details,
  });
};

/**
 * An optional per-fish evidence/reference code is unique across the event,
 * including cancelled entries. Two legitimate identical catches WITHOUT a
 * reference remain allowed. No fingerprint heuristic can prove they are the
 * same fish; the client separately prevents fast accidental double submits.
 */
export function prepareSnapshot(
  previous: ArenaData | null,
  proposed: ArenaData,
  now = Date.now(),
): PreparedSave {
  if (!Number.isFinite(now) || now <= 0)
    return fail("Waktu server tidak valid.");
  const next = copy(proposed);
  const activity: ScoreAuditChange[] = [];
  const existing = new Map(
    previous?.events.map((event) => [event.id, event]) || [],
  );
  if (new Set(next.events.map((event) => event.id)).size !== next.events.length)
    return fail("ID turnamen tidak boleh duplikat.");
  for (const old of previous?.events ?? []) {
    if (!next.events.some((event) => event.id === old.id)) {
      if (old.status !== "draft" || old.entries.length)
        return fail(
          `Event ${old.title} yang sudah berjalan atau berskor tidak dapat dihapus.`,
        );
    }
  }
  for (const event of next.events) {
    const before = existing.get(event.id);
    if (!before) {
      if (
        event.status !== "draft" ||
        event.entries.length ||
        event.timer.runningSince !== null ||
        event.startedAt ||
        event.finishedAt
      )
        return fail(
          `Event baru ${event.title} harus dibuat sebagai Draft kosong, lalu disimpan sebelum mulai.`,
        );
      const rosterError = validateRosterChange(undefined, event);
      if (rosterError) return fail(rosterError);
      continue;
    }
    if (before.status === "finished") continue; // Strict finalized-lock checked separately.
    if (
      event.mode !== before.mode &&
      (before.participants.length ||
        before.squads.length ||
        before.entries.length ||
        before.status !== "draft")
    )
      return fail(
        `Mode SOLO/SQUAD ${event.title} tidak dapat berubah setelah pendaftaran.`,
      );
    for (const member of before.participants) {
      const updated = event.participants.find((p) => p.id === member.id);
      if (
        before.entries.some((entry) => entry.participantId === member.id) &&
        (!updated || updated.squadId !== member.squadId)
      )
        return fail(
          `Anggota ${member.name} dengan skor historis tidak boleh dipindah atau dihapus.`,
        );
    }
    const rosterError = validateRosterChange(before, event);
    if (rosterError) return fail(rosterError);

    if (
      event.timer.durationSec !== before.timer.durationSec &&
      before.status === "live"
    )
      return fail(
        `Durasi ${event.title} tidak boleh diganti setelah pertandingan dimulai.`,
      );
    if (event.status === "draft") {
      if (
        before.status !== "draft" ||
        event.entries.length !== before.entries.length
      )
        return fail(
          `Skor ${event.title} tidak dapat ditambah pada mode Draft.`,
        );
      if (
        event.timer.runningSince !== null ||
        event.startedAt ||
        event.finishedAt
      )
        return fail(`Timer Draft ${event.title} harus dalam keadaan berhenti.`);
      if (
        !Number.isSafeInteger(event.timer.durationSec) ||
        event.timer.durationSec < 60 ||
        event.timer.durationSec > 86400
      )
        return fail(`Durasi Draft ${event.title} harus 1–1440 menit.`);
      event.timer.remainingSec = event.timer.durationSec;
      continue;
    }
    if (before.status === "draft" && event.status === "live") {
      if (event.entries.length !== before.entries.length)
        return fail(
          `Simpan mulai pertandingan ${event.title} terlebih dahulu, baru input skor.`,
        );
      event.startedAt = new Date(now).toISOString();
      event.finishedAt = undefined;
      event.timer = {
        durationSec: event.timer.durationSec,
        remainingSec: event.timer.durationSec,
        runningSince: now,
      };
      addActivity(activity, event, "start", {
        durationSec: event.timer.durationSec,
      });
      continue;
    }
    if (
      before.status !== "live" ||
      !["live", "finished"].includes(event.status)
    )
      return fail(`Status pertandingan ${event.title} tidak valid.`);
    if (event.startedAt !== before.startedAt)
      return fail(
        `Waktu mulai ${event.title} ditetapkan oleh server dan tidak dapat diedit.`,
      );
    if (event.status === "live" && event.finishedAt !== before.finishedAt)
      return fail(`Timestamp final ${event.title} tidak valid.`);

    const oldTimer = before.timer;
    const wasRunning = oldTimer.runningSince !== null;
    const clientRunning = event.timer.runningSince !== null;
    const authoritativeRemaining = secondsLeft(oldTimer, now);
    if (event.status === "finished") {
      // Finalization must be a separate, deliberately reviewed save. Do NOT
      // allow tampering with an existing entry/rule/roster in the same write.
      const lockedFields: (keyof ArenaEvent)[] = [
        "mode",
        "title",
        "subtitle",
        "location",
        "host",
        "eventDate",
        "tieBreaker",
        "tieBonusId",
        "fish",
        "bonuses",
        "writtenRules",
        "faqs",
        "squads",
        "participants",
        "entries",
        "createdAt",
        "startedAt",
      ];
      if (lockedFields.some((field) => !same(before[field], event[field])))
        return fail(
          `Simpan semua skor dan perubahan ${event.title} terlebih dahulu sebelum finalisasi.`,
        );
      event.finishedAt = new Date(now).toISOString();
      event.timer = {
        ...oldTimer,
        remainingSec: authoritativeRemaining,
        runningSince: null,
      };
      addActivity(activity, event, "finish", {
        remainingSec: authoritativeRemaining,
      });
    } else if (wasRunning && !clientRunning) {
      event.timer = {
        ...oldTimer,
        remainingSec: authoritativeRemaining,
        runningSince: null,
      };
      addActivity(activity, event, "pause", {
        remainingSec: authoritativeRemaining,
      });
    } else if (!wasRunning && clientRunning) {
      if (authoritativeRemaining <= 0)
        return fail(
          `Timer ${event.title} sudah habis dan tidak bisa dijalankan lagi.`,
        );
      event.timer = {
        ...oldTimer,
        remainingSec: authoritativeRemaining,
        runningSince: now,
      };
      addActivity(activity, event, "resume", {
        remainingSec: authoritativeRemaining,
      });
    } else {
      // A browser cannot rewind a running or paused clock by editing JSON.
      event.timer = { ...oldTimer };
    }

    const oldEntries = new Map(
      before.entries.map((entry) => [entry.id, entry]),
    );
    if (oldEntries.size !== before.entries.length)
      return fail(`Ada ID transaksi historis ganda pada ${event.title}.`);
    const nextIds = new Set<string>();
    const appended: ScoreEntry[] = [];
    for (const entry of event.entries) {
      if (nextIds.has(entry.id))
        return fail(`ID transaksi duplikat pada ${event.title}.`);
      nextIds.add(entry.id);
      const oldEntry = oldEntries.get(entry.id);
      if (oldEntry) {
        if (!same(oldEntry, entry))
          return fail(
            `Transaksi historis ${entry.id} tidak boleh diubah. Buat koreksi baru.`,
          );
      } else appended.push(entry);
    }
    if (nextIds.size !== before.entries.length + appended.length)
      return fail(`Transaksi historis ${event.title} tidak boleh dihapus.`);
    if (event.status === "finished" && appended.length)
      return fail("Finalisasi harus terpisah dari input skor.");

    const referenceCodes = new Set<string>();
    for (const entry of event.entries) {
      if (entry.catchRef !== undefined) {
        if (entry.kind !== "catch" || !validReference(entry.catchRef))
          return fail(
            "Referensi tangkapan harus 2–80 karakter dan hanya untuk tangkapan.",
          );
        const key = referenceKey(entry.catchRef);
        if (referenceCodes.has(key))
          return fail(
            `Referensi tangkapan ${entry.catchRef} sudah pernah digunakan pada ${event.title}.`,
          );
        referenceCodes.add(key);
      }
    }
    const reversalTargets = new Set<string>();
    for (const entry of event.entries) {
      if (!entry.reversesEntryId) continue;
      if (reversalTargets.has(entry.reversesEntryId))
        return fail(
          `Pembatalan transaksi ${entry.reversesEntryId} tercatat lebih dari sekali.`,
        );
      reversalTargets.add(entry.reversesEntryId);
    }
    for (const entry of appended) {
      const player = event.participants.find(
        (p) => p.id === entry.participantId,
      );
      if (
        !player ||
        (event.mode === "squad" &&
          (!player.squadId || player.squadId !== entry.squadId)) ||
        (event.mode === "solo" && entry.squadId)
      )
        return fail(
          `Peserta atau snapshot squad pada transaksi ${entry.id} tidak valid.`,
        );
      if (entry.kind === "catch") {
        if (!wasRunning || !clientRunning || authoritativeRemaining <= 0)
          return fail(
            `Tangkapan baru hanya bisa disimpan saat timer ${event.title} berjalan dan belum habis.`,
          );
        const result = calculateCatch(
          event,
          entry.fishId || "",
          entry.bonuses?.map((bonus) => bonus.id) || [],
          entry.quantity || 0,
        );
        if (
          !result ||
          result.delta !== entry.delta ||
          result.fish.name !== entry.fishName ||
          result.fish.points !== entry.basePoints ||
          !same(result.bonuses, entry.bonuses || [])
        )
          return fail(
            `Perhitungan tangkapan ${entry.id} tidak cocok dengan aturan ${event.title}.`,
          );
        if (entry.reversesEntryId)
          return fail("Tangkapan tidak boleh memiliki referensi pembatalan.");
      } else if (entry.kind === "manual") {
        if (
          !Number.isSafeInteger(entry.delta) ||
          entry.delta === 0 ||
          !entry.description.trim() ||
          entry.description.length > 300 ||
          entry.reversesEntryId ||
          entry.catchRef
        )
          return fail(`Koreksi manual ${entry.id} tidak valid.`);
      } else if (entry.kind === "reversal") {
        const original = entry.reversesEntryId
          ? oldEntries.get(entry.reversesEntryId)
          : undefined;
        if (
          !original ||
          original.kind === "reversal" ||
          before.entries.some((item) => item.reversesEntryId === original.id) ||
          entry.delta !== -original.delta ||
          entry.participantId !== original.participantId ||
          (entry.squadId ?? null) !==
            (original.squadId ?? player.squadId ?? null)
        )
          return fail(
            `Pembatalan ${entry.id} harus merujuk transaksi tersimpan yang belum pernah dibatalkan.`,
          );
      } else return fail(`Jenis transaksi ${entry.id} tidak dikenal.`);
      // Write time comes from the database writer, not the client clock.
      entry.createdAt = new Date(now).toISOString();
      addActivity(
        activity,
        event,
        entry.kind,
        {
          description: entry.description,
          fishName: entry.fishName || "",
          reference: entry.catchRef || "",
          reversesEntryId: entry.reversesEntryId || "",
        },
        entry,
      );
    }
  }
  return { ok: true, data: next, activity };
}

import type { ArenaEvent, ScoreEntry } from "./arena-types";
import { calculateCatch, completeDuoRoster } from "./arena-rules";
import { standings } from "./arena-utils";

/**
 * V3.1.1: historical events are entered as private Drafts. They NEVER run the
 * match clock. The admin enters actual recorded catches and/or reconciles
 * official final totals. These adjustments are not represented as fish.
 */
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const referenceKey = (value: string) => value.trim().toLocaleUpperCase("id-ID");

export function validHistoricalDate(value: string, now = Date.now()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const millis = Date.UTC(year, month - 1, day);
  return (
    Number.isFinite(millis) &&
    new Date(millis).toISOString().slice(0, 10) === value &&
    value <= new Date(now).toISOString().slice(0, 10)
  );
}

export type HistoricalDraftCheck =
  | { ok: false; error: string }
  | { ok: true; appended: ScoreEntry[] };
export function validateHistoricalDraft(
  before: ArenaEvent,
  event: ArenaEvent,
): HistoricalDraftCheck {
  const fail = (error: string): HistoricalDraftCheck => ({ ok: false, error });
  if (
    !before.historical ||
    !event.historical ||
    before.status !== "draft" ||
    event.status !== "draft"
  )
    return fail("Hanya Draft historis yang boleh menerima poin arsip.");
  if (
    event.published ||
    event.featured ||
    event.timer.runningSince !== null ||
    event.startedAt ||
    event.finishedAt ||
    event.historicalRecordedAt ||
    event.historicalPodium
  )
    return fail(
      "Draft historis harus tetap privat dan tidak boleh menjalankan timer.",
    );
  if (
    !Number.isSafeInteger(event.timer.durationSec) ||
    event.timer.durationSec < 60 ||
    event.timer.durationSec > 86400
  )
    return fail("Durasi historis harus 1–1440 menit.");
  if (event.entries.length && !completeDuoRoster(event))
    return fail(
      "Lengkapi dua anggota setiap pasangan DUO sebelum mencatat skor.",
    );
  if (event.entries.length > 100000)
    return fail("Batas transaksi historis terlampaui.");
  const old = new Map(before.entries.map((entry) => [entry.id, entry]));
  if (old.size !== before.entries.length)
    return fail("ID transaksi historis sebelumnya duplikat.");
  const ids = new Set<string>();
  const refs = new Set<string>();
  const reversals = new Set<string>();
  const appended: ScoreEntry[] = [];
  for (const entry of event.entries) {
    if (ids.has(entry.id)) return fail("ID transaksi historis duplikat.");
    ids.add(entry.id);
    const original = old.get(entry.id);
    if (original) {
      if (!same(original, entry))
        return fail(
          "Skor tersimpan tidak boleh diubah atau dihapus. Gunakan pembatalan.",
        );
    } else appended.push(entry);
    if (entry.catchRef !== undefined) {
      const key = referenceKey(entry.catchRef);
      if (
        entry.kind !== "catch" ||
        key.length < 2 ||
        key.length > 80 ||
        entry.catchRef !== entry.catchRef.trim() ||
        /[\u0000-\u001f]/.test(entry.catchRef) ||
        refs.has(key)
      )
        return fail(
          "Referensi bukti tangkapan tidak valid atau sudah digunakan.",
        );
      refs.add(key);
    }
    if (entry.reversesEntryId) {
      if (reversals.has(entry.reversesEntryId))
        return fail("Satu transaksi tidak boleh dibatalkan dua kali.");
      reversals.add(entry.reversesEntryId);
    }
  }
  if (before.entries.some((entry) => !ids.has(entry.id)))
    return fail("Transaksi historis yang tersimpan tidak boleh dihapus.");
  for (const entry of appended) {
    const player = event.participants.find((p) => p.id === entry.participantId);
    if (
      !player ||
      (event.mode !== "solo" &&
        (!player.squadId || entry.squadId !== player.squadId)) ||
      (event.mode === "solo" && entry.squadId)
    )
      return fail("Peserta atau squad historis tidak valid.");
    if (entry.kind === "catch") {
      const result = calculateCatch(
        event,
        entry.fishId || "",
        entry.bonuses?.map((b) => b.id) || [],
        entry.quantity || 0,
      );
      if (
        !result ||
        result.delta !== entry.delta ||
        result.fish.name !== entry.fishName ||
        result.fish.points !== entry.basePoints ||
        !same(result.bonuses, entry.bonuses || []) ||
        entry.reversesEntryId
      )
        return fail(
          "Poin tangkapan tidak sesuai dengan aturan historis yang dicatat.",
        );
    } else if (entry.kind === "manual") {
      if (
        !Number.isSafeInteger(entry.delta) ||
        !entry.delta ||
        Math.abs(entry.delta) > 1000000 ||
        !entry.description?.trim() ||
        entry.description.length > 300 ||
        entry.reversesEntryId ||
        entry.catchRef
      )
        return fail("Penyesuaian poin resmi historis tidak valid.");
    } else if (entry.kind === "reversal") {
      const original = entry.reversesEntryId
        ? old.get(entry.reversesEntryId)
        : undefined;
      if (
        !original ||
        original.kind === "reversal" ||
        before.entries.some((item) => item.reversesEntryId === original.id) ||
        entry.delta !== -original.delta ||
        entry.participantId !== original.participantId ||
        (entry.squadId ?? null) !== (original.squadId ?? player.squadId ?? null)
      )
        return fail(
          "Pembatalan harus merujuk transaksi historis yang sudah tersimpan.",
        );
    } else return fail("Jenis transaksi tidak valid.");
  }
  return { ok: true, appended };
}

export function validateHistoricalFinal(
  event: ArenaEvent,
  now = Date.now(),
): string | null {
  if (!event.historical || event.status !== "draft" || event.trashedAt)
    return "Hanya Draft historis yang bisa difinalisasi melalui jalur ini.";
  if (!validHistoricalDate(event.eventDate, now))
    return "Masukkan tanggal pertandingan historis yang valid dan tidak di masa depan.";
  if (!event.title.trim() || event.title.length > 100 || !event.location.trim())
    return "Lengkapi nama dan lokasi pertandingan sebelum arsip final.";
  if (
    !Number.isSafeInteger(event.timer.durationSec) ||
    event.timer.durationSec < 60 ||
    event.timer.durationSec > 86400 ||
    event.timer.runningSince !== null ||
    event.startedAt ||
    event.finishedAt
  )
    return "Timer arsip harus berhenti; durasi 1–1440 menit.";
  if (
    event.published ||
    event.featured ||
    event.historicalRecordedAt ||
    event.historicalPodium
  )
    return "Draft historis harus privat sebelum finalisasi.";
  if (!completeDuoRoster(event))
    return "Setiap pasangan DUO harus memiliki tepat dua anggota dengan username Roblox unik.";
  if (event.participants.length < 3)
    return "Untuk menentukan podium Juara 1–3, daftarkan sedikitnya tiga peserta.";
  if (
    event.mode !== "solo" &&
    (event.squads.length < 3 ||
      event.participants.some(
        (p) => !p.squadId || !event.squads.some((s) => s.id === p.squadId),
      ))
  )
    return "Untuk pertandingan tim, daftarkan sedikitnya tiga tim dengan anggota yang valid.";
  if (!event.entries.length)
    return "Catat tangkapan atau total poin resmi sebelum mengarsipkan.";
  const ranking = standings(event);
  if (ranking.length < 3) return "Podium Juara 1–3 belum lengkap.";
  if (!ranking.some((row) => row.points !== 0))
    return "Seluruh skor masih nol; periksa hasil resmi terlebih dahulu.";
  return null;
}

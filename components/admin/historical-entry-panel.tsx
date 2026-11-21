"use client";
import { avatarTarget, rankAvatarTargets } from "@/lib/avatar-identity";
import { PlayerIdentity, RankIdentity } from "@/components/player-avatar";
import { useState } from "react";
import {
  Archive,
  Fish,
  LockKeyhole,
  Save,
  Settings2,
  Trophy,
} from "lucide-react";
import type { ArenaStore } from "@/hooks/use-arena";
import { participantPoints, standings, fmt } from "@/lib/arena-utils";
import { validateHistoricalFinal } from "@/lib/historical-entry";

export function HistoricalEntryPanel({
  store,
  onConfigure,
  onCatch,
  onReview,
}: {
  store: ArenaStore;
  onConfigure: () => void;
  onCatch: () => void;
  onReview: () => void;
}) {
  const e = store.active;
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  if (!e.historical || e.status !== "draft") return null;
  const invalid = validateHistoricalFinal(e);
  const rank = standings(e);
  const addOfficial = (participantId: string) => {
    const raw = targets[participantId] ?? "";
    const number = Number(raw);
    if (!raw.trim() || !Number.isSafeInteger(number)) {
      setFeedback("Isi total poin resmi dengan angka bulat.");
      return;
    }
    if (store.setHistoricalOfficialPoints(participantId, number)) {
      setTargets((old) => ({ ...old, [participantId]: "" }));
      setFeedback(
        "Total poin resmi diperbarui secara lokal. Klik Simpan ke Server sebelum finalisasi.",
      );
    } else
      setFeedback(
        "Tidak bisa menyimpan total tersebut. Periksa batas poin, peserta, dan squad.",
      );
  };
  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
            Historical Tournament Entry
          </span>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black text-slate-900">
            <Archive size={20} /> Catat Event yang Sudah Selesai
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-slate-600">
            Arsip ini masih privat. Masukkan data pertandingan sebenarnya;
            countdown tidak akan pernah dijalankan. Setiap event historis harus
            disimpan sebelum difinalisasi.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
          DRAFT HISTORIS
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onConfigure}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2 text-xs font-bold text-blue-800 hover:bg-blue-50"
        >
          <Settings2 size={15} /> 1. Atur event & peserta
        </button>
        <button
          type="button"
          onClick={onCatch}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
        >
          <Fish size={15} /> 2. Catat tangkapan
        </button>
      </div>
      <div className="mt-5">
        <h3 className="text-sm font-black text-slate-800">
          3. Rekonsiliasi total poin resmi
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Isi total akhir menurut catatan panitia setelah mencatat tangkapan
          yang tersedia. Sistem hanya menambahkan <b>selisih skor</b> sebagai
          koreksi manual, bukan menciptakan ikan fiktif. Untuk DUO dan SQUAD,
          masukkan kontribusi akhir masing-masing anggota.
        </p>
        <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Peserta</th>
                <th className="p-3">Poin tercatat</th>
                <th className="p-3">Total resmi</th>
                <th className="p-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {e.participants.map((p) => (
                <tr className="border-t border-slate-100" key={p.id}>
                  <td className="p-3">
                    <PlayerIdentity
                      target={avatarTarget(e, p.id)}
                      name={p.name}
                      subtitle={`@${p.username || "—"}`}
                      size="sm"
                      link={false}
                    />
                    {e.mode !== "solo" && (
                      <span className="block text-slate-500">
                        {e.squads.find((s) => s.id === p.squadId)?.name ||
                          "Belum pilih tim"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 font-black text-blue-700">
                    {fmt(participantPoints(e.entries, p.id))} PTS
                  </td>
                  <td className="p-2">
                    <input
                      aria-label={`Total poin resmi ${p.name}`}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-blue-500"
                      type="number"
                      step="1"
                      placeholder="Contoh: 25"
                      value={targets[p.id] ?? ""}
                      onChange={(ev) =>
                        setTargets((old) => ({
                          ...old,
                          [p.id]: ev.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => addOfficial(p.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 font-bold text-blue-700 hover:bg-blue-100"
                    >
                      <Save size={13} /> Terapkan
                    </button>
                  </td>
                </tr>
              ))}
              {!e.participants.length && (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    Belum ada peserta. Tambahkan melalui Tournament Builder
                    dahulu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {feedback && (
          <p
            role="status"
            className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800"
          >
            {feedback}
          </p>
        )}
      </div>
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <Trophy size={16} /> Preview Juara 1–3
        </h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {rank.slice(0, 3).map((row, i) => (
            <div
              key={row.id}
              className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
            >
              <span className="block font-bold text-slate-500">#{i + 1}</span>
              <RankIdentity
                targets={rankAvatarTargets(e, row.id)}
                name={row.name}
                team={e.mode !== "solo"}
                size="sm"
              />
              <strong className="text-blue-600">{fmt(row.points)} PTS</strong>
            </div>
          ))}
        </div>
        {invalid && (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            Sebelum finalisasi: {invalid}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Saat review, panitia dapat memilih Juara 1–3 resmi. Posisi peserta
          yang memiliki poin sama boleh disesuaikan; peserta berpoin lebih
          rendah tidak boleh mengungguli peserta dengan poin lebih tinggi.
        </p>
        <button
          type="button"
          disabled={!!invalid || store.dirty || store.eventBusy || store.saving}
          onClick={onReview}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-xs font-extrabold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LockKeyhole size={15} /> 4. Review & Finalisasi Arsip
        </button>
        {store.dirty && (
          <p className="mt-2 text-xs font-bold text-amber-700">
            Klik Simpan ke Server di header sebelum membuka finalisasi.
          </p>
        )}
      </div>
    </section>
  );
}

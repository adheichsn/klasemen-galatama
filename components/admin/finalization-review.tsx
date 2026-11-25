"use client";
import { useState } from "react";
import { AlertTriangle, LockKeyhole, Trophy } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { fmt, standings } from "@/lib/arena-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function FinalizationReview({
  event,
  dirty,
  onClose,
  onConfirm,
  busy,
}: {
  event: ArenaEvent;
  dirty: boolean;
  onClose: () => void;
  onConfirm: () => Promise<string | null>;
  busy: boolean;
}) {
  const [error, setError] = useState("");
  const [approved, setApproved] = useState(false);
  const leaders = standings(event).slice(0, 3);
  const catches = event.entries.filter(
    (entry) =>
      entry.kind === "catch" &&
      !event.entries.some((other) => other.reversesEntryId === entry.id),
  );
  const scoreSum = event.entries.reduce((sum, entry) => sum + entry.delta, 0);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="!w-[min(95vw,620px)] !max-w-[620px] !p-0">
        <div className="rounded-2xl bg-white">
          <header className="border-b border-blue-100 bg-blue-50 p-6 pr-16">
            <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-blue-700">
              <LockKeyhole size={16} /> PEMERIKSAAN HASIL FINAL
            </div>
            <DialogTitle className="text-xl font-black text-[#142A55]">
              Review sebelum mengunci hasil
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">
              {event.title} • {event.mode.toUpperCase()}. Setelah disimpan
              sebagai final, skor dan roster tidak bisa diubah.
            </DialogDescription>
          </header>
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-lg text-slate-900">
                  {fmt(event.participants.length)}
                </b>
                <span className="text-xs text-slate-500">Peserta</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-lg text-slate-900">
                  {fmt(catches.length)}
                </b>
                <span className="text-xs text-slate-500">Entri ikan valid</span>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <b className="block text-lg text-slate-900">{fmt(scoreSum)}</b>
                <span className="text-xs text-slate-500">Total poin</span>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                <Trophy size={17} className="text-amber-500" /> Podium sementara
              </h3>
              {leaders.length ? (
                leaders.map((row, index) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between gap-3 border-t border-slate-100 py-2 text-sm"
                  >
                    <span className="truncate text-slate-600">
                      #{index + 1} {row.name}
                    </span>
                    <b className="shrink-0 text-blue-700">
                      {fmt(row.points)} PTS
                    </b>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500">Belum ada peserta.</p>
              )}
            </div>
            {dirty ? (
              <p
                role="alert"
                className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800"
              >
                <AlertTriangle className="shrink-0" size={17} /> Ada perubahan
                yang belum disimpan. Tutup dialog, klik Simpan ke Server, baru
                lakukan finalisasi.
              </p>
            ) : (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-blue-50 p-3 text-xs font-semibold leading-5 text-blue-900">
                <input
                  type="checkbox"
                  className="mt-1 size-4 accent-blue-600"
                  checked={approved}
                  onChange={(e) => setApproved(e.target.checked)}
                />
                Saya telah mengecek tangkapan, pembatalan, koreksi, dan podium.
                Saya memahami bahwa Final Result Lock bersifat permanen.
              </label>
            )}
          </div>
          {error && (
            <p role="alert" className="px-5 text-sm text-rose-700">
              {error}
            </p>
          )}
          <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-100 p-5">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700"
            >
              Kembali
            </button>
            <button
              type="button"
              disabled={!approved || dirty || busy}
              onClick={async () => {
                const message = await onConfirm();
                if (message) {
                  setError(message);
                  setApproved(false);
                }
              }}
              className="rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LockKeyhole className="mr-2 inline" size={15} /> Kunci Hasil
              Final
            </button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

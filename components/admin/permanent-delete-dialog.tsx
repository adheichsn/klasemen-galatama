"use client";
import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export default function PermanentDeleteDialog({
  event,
  busy,
  onClose,
  onDelete,
}: {
  event: ArenaEvent;
  busy: boolean;
  onClose: () => void;
  onDelete: (title: string) => Promise<boolean>;
}) {
  const [typed, setTyped] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const ready = typed === event.title && accepted && !busy;
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && !busy && onClose()}>
      <DialogContent className="!w-[min(95vw,540px)] !p-0">
        <div className="border-b border-rose-100 bg-rose-50 px-6 py-5 pr-16">
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-rose-800">
            <Trash2 size={23} /> Hapus Event Permanen
          </DialogTitle>
          <DialogDescription className="mt-2 text-sm leading-6 text-rose-900">
            Tindakan ini tidak bisa dibatalkan atau dipulihkan lewat WEJI ARENA.
          </DialogDescription>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <b className="block break-words text-slate-900">{event.title}</b>
            <span className="mt-1 block text-slate-500">
              {event.mode.toUpperCase()} • {event.status.toUpperCase()}
            </span>
            <span className="mt-2 block font-bold text-rose-700">
              {event.participants.length} peserta • {event.entries.length}{" "}
              transaksi skor
            </span>
          </div>
          <p className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs leading-5 text-rose-900">
            <AlertTriangle className="shrink-0" size={18} />
            Event, seluruh tangkapan dan poin, arsip, data roster, serta riwayat
            skor event ini akan dihapus dari database aktif. Banner unggahan
            yang tidak digunakan event lain ikut dihapus. Audit tindakan
            penghapusan tetap dicatat.
          </p>
          <label className="block text-sm font-bold text-slate-700">
            Ketik nama event persis untuk melanjutkan
            <input
              autoFocus
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-rose-500"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={event.title}
              disabled={busy}
              autoComplete="off"
            />
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm font-semibold leading-5 text-slate-700">
            <input
              className="mt-1 size-4 accent-rose-600"
              type="checkbox"
              checked={accepted}
              disabled={busy}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            Saya memahami penghapusan permanen tetap berlaku walaupun event
            sudah memiliki skor atau sudah Finished.
          </label>
          {error && (
            <p role="alert" className="text-sm font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-slate-100 p-5">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700"
            disabled={busy}
            onClick={onClose}
          >
            Batal
          </button>
          <button
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!ready}
            onClick={async () => {
              const success = await onDelete(typed);
              if (!success)
                setError(
                  "Penghapusan gagal. Periksa pesan di dashboard, lalu coba lagi.",
                );
            }}
          >
            <Trash2 size={16} className="mr-2 inline" />
            {busy ? "Menghapus..." : "Hapus Permanen"}
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

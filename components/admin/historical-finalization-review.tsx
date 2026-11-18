"use client";
import { useState } from "react";
import { LockKeyhole, Trophy } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { fmt, standings } from "@/lib/arena-utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export default function HistoricalFinalizationReview({ event, busy, onClose, onConfirm }: {
  event: ArenaEvent;
  busy: boolean;
  onClose: () => void;
  onConfirm: (title: string, podiumIds: string[]) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [title, setTitle] = useState("");
  const [approved, setApproved] = useState(false);
  const [error, setError] = useState("");
  const ranking = standings(event);
  const [selectedIds, setSelectedIds] = useState<string[]>(ranking.slice(0, 3).map((row) => row.id));
  const selectedRows = selectedIds.map((id) => ranking.find((row) => row.id === id));
  const validPodium = selectedIds.length === 3 && new Set(selectedIds).size === 3 &&
    selectedRows.every((row, i) => !!row && row.points >= (ranking[2]?.points ?? Infinity) &&
      (i === 0 || row.points <= (selectedRows[i - 1]?.points ?? -Infinity)));
  const confirm = async () => {
    setError("");
    const result = await onConfirm(title, selectedIds);
    if (!result.ok) setError(result.error || "Gagal finalisasi.");
    else onClose();
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="!w-[min(95vw,600px)] !max-w-[600px] !p-0">
      <div className="rounded-2xl bg-white p-5 sm:p-7">
        <DialogTitle className="flex items-center gap-2 text-xl font-black text-slate-900"><LockKeyhole size={20} /> Finalisasi Arsip Historis</DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-6 text-slate-600">Pertandingan berlangsung pada <b>{event.eventDate}</b> selama <b>{event.timer.durationSec / 60} menit</b>. Event akan langsung menjadi <b>FINISHED</b> dan dipublikasikan tanpa timer LIVE.</DialogDescription>
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-blue-900"><Trophy size={16} /> Tentukan Juara 1–3 sesuai hasil resmi</p>
          {selectedIds.map((id, index) => (
            <label key={index} className="flex items-center justify-between gap-2 border-t border-blue-100 py-2 text-xs">
              <span className="font-bold">Juara #{index + 1}</span>
              <select aria-label={`Juara ${index + 1}`} value={id} onChange={(ev) => setSelectedIds((old) => old.map((item, i) => i === index ? ev.target.value : item))} className="w-[70%] rounded-lg border border-blue-200 bg-white px-2 py-2 text-blue-900">
                {ranking.map((row) => <option value={row.id} key={row.id}>{row.name} — {fmt(row.points)} PTS</option>)}
              </select>
            </label>
          ))}
          {!validPodium && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">Pilih tiga juara berbeda dan urutkan dari poin tertinggi. Perubahan urutan hanya diizinkan untuk peserta/tim yang poinnya seri.</p>}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-600">Pastikan urutan Juara 1–3 sesuai hasil resmi. Catatan penyesuaian manual tidak dianggap tangkapan. Setelah finalisasi skor, roster, tanggal, dan aturan terkunci.</p>
        <label className="mt-4 block text-xs font-bold text-slate-700">Ketik nama event persis untuk mengonfirmasi</label>
        <input value={title} onChange={(ev) => setTitle(ev.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-sm" placeholder={event.title} />
        <label className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700"><input className="mt-1" type="checkbox" checked={approved} onChange={(ev) => setApproved(ev.target.checked)} /> Saya sudah mencocokkan tanggal, peserta, total poin resmi, dan ketiga juara. Saya memahami arsip akan dikunci permanen.</label>
        {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p>}
        <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Batal</button><button type="button" onClick={() => void confirm()} disabled={busy || !approved || !validPodium || title !== event.title} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{busy ? "Memfinalisasi..." : "Kunci & Publish FINISHED"}</button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

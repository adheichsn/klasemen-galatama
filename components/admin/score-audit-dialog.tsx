"use client";
import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmt } from "@/lib/arena-utils";

type Activity = {
  id: number;
  revision: number;
  actor: string;
  action: string;
  participant_id: string | null;
  delta: number | null;
  details: { description?: string; reference?: string; remainingSec?: number };
  recorded_at: string;
};
const verbs: Record<string, string> = {
  catch: "Tangkapan",
  manual: "Koreksi manual",
  reversal: "Pembatalan",
  start: "Mulai pertandingan",
  pause: "Pause timer",
  resume: "Lanjut timer",
  finish: "Finalisasi",
};
export default function ScoreAuditDialog({
  eventId,
  eventTitle,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/admin/audit?eventId=${encodeURIComponent(eventId)}`,
          { cache: "no-store", signal },
        );
        const payload = await response.json();
        if (!response.ok)
          throw new Error(payload.error || "Gagal mengambil audit.");
        setActivity(payload.activity || []);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof Error ? err.message : "Audit belum tersedia.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [eventId],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="!w-[min(96vw,720px)] !max-w-[720px] !p-0">
        <div className="rounded-2xl bg-white">
          <header className="border-b border-blue-100 bg-blue-50 px-6 py-5 pr-16">
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#142A55]">
              <History size={21} /> Audit Skor & Operasional
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-slate-500">
              {eventTitle} • Catatan tersimpan di PostgreSQL saat Simpan ke
              Server, bukan aktivitas lokal yang belum disimpan.
            </DialogDescription>
          </header>
          <div className="flex items-center justify-between px-6 pt-4">
            <span className="text-xs font-semibold text-slate-500">
              100 aktivitas terakhir • akun panitia saat penyimpanan
            </span>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto px-6 py-4">
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
              >
                {error}
              </p>
            )}
            {loading && (
              <p className="py-6 text-center text-sm text-slate-500">
                Memuat audit...
              </p>
            )}
            {!loading && !error && activity.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">
                Belum ada aktivitas V2.6 yang tersimpan untuk turnamen ini.
                Riwayat V2.5 tetap ada di transaksi lama.
              </p>
            )}
            {!loading &&
              activity.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-xs text-slate-800">
                      {verbs[item.action] || item.action}
                    </b>
                    {item.delta !== null && (
                      <strong className="text-xs text-blue-700">
                        {item.delta > 0 ? "+" : ""}
                        {fmt(item.delta)} PTS
                      </strong>
                    )}
                  </div>
                  {item.details.description && (
                    <p className="mt-1 text-xs text-slate-600">
                      {item.details.description}
                    </p>
                  )}
                  {item.details.reference && (
                    <p className="mt-1 text-[11px] text-blue-700">
                      Bukti: {item.details.reference}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-slate-400">
                    {new Date(item.recorded_at).toLocaleString("id-ID")} •{" "}
                    {item.actor} • revisi #{item.revision}
                  </p>
                </div>
              ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

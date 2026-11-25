"use client";
import {
  ArrowRight,
  CircleAlert,
  ClipboardList,
  Fish,
  Globe2,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { tournamentReadiness } from "@/lib/tournament-readiness";

type Props = {
  event: ArenaEvent;
  dirty: boolean;
  onOpenScore: () => void;
  onOpenBuilder: () => void;
  onOpenEvents: () => void;
};

export function AdminCommandCenter({
  event,
  dirty,
  onOpenScore,
  onOpenBuilder,
  onOpenEvents,
}: Props) {
  const readiness = tournamentReadiness(event);
  const isLive = event.status === "live";
  const isHistoricalDraft = !!event.historical && event.status === "draft";
  const guidance = isHistoricalDraft
    ? "Arsip historis: masukkan tangkapan nyata dan hasil poin resmi tanpa menjalankan timer, lalu finalisasi melalui review."
    : isLive
      ? "Pertandingan sedang berlangsung. Masukkan tangkapan dan cek konfirmasi skor dari server."
      : event.status === "finished"
        ? "Hasil event sudah diarsipkan. Riwayat dan aturan lama tetap tersimpan."
        : readiness.canStart
          ? "Roster dan ikan aktif siap. Periksa aturan sebelum memulai pertandingan."
          : "Persiapkan katalog ikan dan roster peserta sebelum mengaktifkan turnamen.";
  const actions = [
    {
      label: "Input tangkapan",
      detail: isHistoricalDraft
        ? "Catat skor historis"
        : isLive
          ? `Catat skor ${event.mode.toUpperCase()}`
          : "Tersedia saat event LIVE",
      icon: Fish,
      onClick: onOpenScore,
      disabled: !isLive && !isHistoricalDraft,
    },
    {
      label: "Atur turnamen",
      detail: "Ikan, bonus, aturan, roster",
      icon: Settings2,
      onClick: onOpenBuilder,
      disabled: false,
    },
    {
      label: "Daftar turnamen",
      detail: "Cari, duplikat, dan arsipkan",
      icon: ClipboardList,
      onClick: onOpenEvents,
      disabled: false,
    },
  ];
  return (
    <section
      aria-label="Pusat kendali panitia"
      className="rounded-[22px] border border-blue-100 bg-white p-4 shadow-[0_12px_36px_rgba(37,70,136,.05)] sm:p-5"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-extrabold tracking-[.16em] text-blue-600">
            PANITIA WORKSPACE
          </p>
          <h2 className="!text-lg font-extrabold tracking-tight text-slate-900">
            Pusat Kendali Turnamen
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">{guidance}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${dirty ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}
        >
          {dirty ? <CircleAlert size={14} /> : <ShieldCheck size={14} />}
          {dirty ? "Belum disimpan" : "Sinkron ke server"}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {actions.map(({ label, detail, icon: Icon, onClick, disabled }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={onClick}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8faff] p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold text-slate-900">
                {label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
                {detail}
              </span>
            </span>
            <ArrowRight
              size={16}
              className="text-slate-400 group-hover:text-blue-600"
            />
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Fish size={14} className="text-blue-600" /> {readiness.activeFish}{" "}
          ikan aktif
        </span>
        <span className="inline-flex items-center gap-1.5">
          <UsersRound size={14} className="text-blue-600" />{" "}
          {event.participants.length} peserta {event.mode.toUpperCase()}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe2 size={14} className="text-blue-600" />{" "}
          {event.published ? "Terbit di publik" : "Belum dipublikasikan"}
        </span>
      </div>
    </section>
  );
}

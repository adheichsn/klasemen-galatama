import "@/styles/public-effects.css";
import Link from "next/link";
import {
  ArrowRight,
  Archive,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Clock3,
  Fish,
  Globe2,
  Medal,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  LockKeyhole,
  Sparkles,
  Trophy,
  Users,
  Waves,
} from "lucide-react";
import type { ArenaEvent, EventMode } from "@/lib/arena-types";
import { fmt, standings } from "@/lib/arena-utils";
import { validBannerUrl } from "@/lib/banner";
import { LiveRanking } from "@/components/live-ranking";

export const dateLabel = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "Jadwal menyusul";
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
export const modeText = (mode: EventMode) =>
  mode === "solo" ? "SOLO" : "SQUAD";
export const stageText = (e: ArenaEvent) =>
  e.status === "live"
    ? "LIVE NOW"
    : e.status === "finished"
      ? "SELESAI"
      : "SEGERA HADIR";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-blue-100/80 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1260px] items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="WEJI ARENA - Beranda"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563eb] text-white shadow-lg shadow-blue-200">
            <Fish size={23} />
          </span>
          <span className="text-lg font-black tracking-[-.06em] text-[#132855] sm:text-[22px]">
            WEJI <span className="text-blue-600">ARENA</span>
            <span className="block text-[9px] font-bold tracking-[.22em] text-slate-400">
              FISH IT TOURNAMENTS
            </span>
          </span>
        </Link>
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-7 text-[13px] font-bold text-slate-600 lg:flex"
        >
          <Link className="hover:text-blue-600" href="/">
            Beranda
          </Link>
          <Link className="hover:text-blue-600" href="/turnamen">
            Turnamen
          </Link>
          <Link className="hover:text-blue-600" href="/turnamen?status=live">
            Live Klasemen
          </Link>
          <Link className="hover:text-blue-600" href="/arsip">
            Arsip
          </Link>
          <Link className="hover:text-blue-600" href="/hall-of-fame">
            Hall of Fame
          </Link>
          <Link className="hover:text-blue-600" href="/faq">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/turnamen"
            className="hidden items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-xs font-bold text-blue-700 sm:flex"
          >
            <Search size={15} /> Cari Event
          </Link>
          <details className="relative lg:hidden">
            <summary
              className="flex cursor-pointer list-none rounded-xl border border-blue-100 bg-blue-50 p-2.5 text-[#18345F]"
              aria-label="Menu"
            >
              <Menu size={19} />
            </summary>
            <div className="absolute right-0 top-12 flex min-w-[200px] flex-col gap-1 rounded-2xl border border-blue-100 bg-white p-2 text-sm font-semibold shadow-2xl">
              <Link className="rounded-lg px-3 py-2 hover:bg-blue-50" href="/">
                Beranda
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-blue-50"
                href="/turnamen"
              >
                Turnamen
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-blue-50"
                href="/turnamen?status=live"
              >
                Live Klasemen
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-blue-50"
                href="/arsip"
              >
                Arsip
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-blue-50"
                href="/hall-of-fame"
              >
                Hall of Fame
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-blue-50"
                href="/faq"
              >
                FAQ
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="mt-20 border-t border-blue-100 bg-white">
      <div className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-lg font-black text-[#142A55]">
              <Fish className="text-blue-600" size={22} /> WEJI{" "}
              <span className="text-blue-600">ARENA</span>
            </div>
            <p className="mt-2 max-w-lg text-sm text-slate-500">
              Arena kompetisi Fish It: turnamen, klasemen, juara, dan kisah di
              balik setiap pertandingan.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-bold text-slate-500">
            <Link href="/turnamen">Turnamen</Link>
            <Link href="/arsip">Arsip</Link>
            <Link href="/faq">FAQ</Link>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-5 text-xs text-slate-400">
          © WEJI ARENA — Community Tournament Platform. Tidak berafiliasi dengan
          Roblox atau Fish It.
        </div>
      </div>
    </footer>
  );
}
export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="weji-public min-h-screen bg-[#f5f8ff] text-[#172b4d]">
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  desc,
  href,
  link,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  href?: string;
  link?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="mb-2 text-[10px] font-black tracking-[.19em] text-blue-600">
          {eyebrow}
        </div>
        <h2 className="text-2xl font-black tracking-[-.04em] text-[#152C56] sm:text-[29px]">
          {title}
        </h2>
        {desc && <p className="mt-1.5 text-sm text-slate-500">{desc}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-2 text-xs font-extrabold text-blue-600 hover:gap-3"
        >
          {link || "Lihat Semua"}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
const coverStyles = [
  "from-[#123C9A] via-[#285AE9] to-[#08AEEA]",
  "from-[#0D285D] via-[#4965C8] to-[#8685EB]",
  "from-[#0B3B66] via-[#008CB3] to-[#71D3E5]",
  "from-[#243D87] via-[#5247AF] to-[#DA8BC7]",
];
export function EventCard({
  event,
  index = 0,
}: {
  event: ArenaEvent;
  index?: number;
}) {
  const ranking = standings(event);
  return (
    <article className="group overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-[0_8px_30px_rgba(21,52,111,.035)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_19px_40px_rgba(21,52,111,.10)]">
      <Link
        href={`/turnamen/${encodeURIComponent(event.id)}`}
        className={`weji-event-art relative flex h-44 flex-col justify-between overflow-hidden bg-gradient-to-br ${coverStyles[index % coverStyles.length]} p-5 text-white`}
      >
        {event.bannerUrl && validBannerUrl(event.bannerUrl) && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundImage: `url("${event.bannerUrl}")` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#051A42]/90 via-[#0B2D66]/25 to-[#041A3F]/25" />
          </>
        )}
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full border-[25px] border-white/10" />
        <div className="pointer-events-none absolute bottom-[-70px] left-[16%] h-44 w-44 rounded-full border-[22px] border-white/10" />
        <Waves
          size={90}
          strokeWidth={0.9}
          className="pointer-events-none absolute right-8 top-10 rotate-[-14deg] text-white/20"
        />
        <div className="relative flex items-start justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-black tracking-wide backdrop-blur-md">
            <Fish size={12} /> {modeText(event.mode)}
          </span>
          <span
            className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold ${event.status === "live" ? "bg-red-500 text-white" : "bg-white/20 backdrop-blur-md"}`}
          >
            {stageText(event)}
          </span>
        </div>
        <div className="relative">
          {event.featured && (
            <span className="mb-2 inline-flex rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950">
              ★ FEATURED
            </span>
          )}
          <div className="text-[10px] font-extrabold tracking-[.19em] text-blue-100">
            WEJI ARENA • FISH IT
          </div>
          <h3 className="mt-1 line-clamp-2 max-w-[90%] text-xl font-black leading-tight tracking-tight text-white">
            {event.title}
          </h3>
        </div>
      </Link>
      <div className="p-5">
        <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Globe2 size={14} />
            {event.location || "Semua pulau"}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={14} />
            {dateLabel(event.eventDate)}
          </span>
        </div>
        <p className="mt-3 line-clamp-2 min-h-[35px] text-[13px] leading-relaxed text-slate-500">
          {event.subtitle || "Turnamen custom Fish It"}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-blue-50 pt-4 text-xs">
          <span className="flex items-center gap-1 font-bold text-slate-600">
            <Users size={15} className="text-blue-600" />
            {event.participants.length} peserta
          </span>
          <span className="flex items-center gap-1 font-extrabold text-blue-700">
            {ranking.length && event.status !== "draft"
              ? `${fmt(ranking[0].points)} PTS tertinggi`
              : "Lihat Event"}{" "}
            <ChevronRight size={16} />
          </span>
        </div>
      </div>
    </article>
  );
}
export function EmptyEvents({ type = "turnamen" }: { type?: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-blue-200 bg-white px-6 py-14 text-center">
      <Fish size={34} className="mx-auto mb-3 text-blue-400" />
      <h3 className="text-lg font-black text-[#142A55]">
        Belum ada {type} yang dipublikasikan
      </h3>
      <p className="mt-2 text-sm text-slate-500">
        Setelah panitia membuat dan mempublikasikan event, informasinya akan
        muncul di sini.
      </p>
    </div>
  );
}
export function PublicRanking({
  event,
  max,
}: {
  event: ArenaEvent;
  max?: number;
}) {
  const ranking = standings(event);
  const rows = typeof max === "number" ? ranking.slice(0, max) : ranking;
  if (event.status === "live") return <LiveRanking event={event} max={max} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white">
      {event.status === "finished" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-xs font-bold text-emerald-800">
          <span className="inline-flex items-center gap-2">
            <LockKeyhole size={15} /> Hasil final terkunci • arsip resmi
          </span>
          {event.finishedAt && (
            <span>
              {new Date(event.finishedAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}
      {event.status === "finished" && ranking.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-b border-blue-100 bg-gradient-to-br from-white to-blue-50 p-3 sm:gap-3 sm:p-5">
          {[1, 0, 2].map((index) => {
            const r = ranking[index];
            return (
              <div
                key={index}
                className={`min-w-0 rounded-xl border p-3 text-center sm:p-4 ${index === 0 ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-white"}`}
              >
                <span
                  className={`mb-2 inline-flex size-8 items-center justify-center rounded-full text-xs font-black ${index === 0 ? "bg-amber-400 text-amber-950" : "bg-blue-100 text-blue-700"}`}
                >
                  {index + 1}
                </span>
                <p className="truncate text-xs font-black text-[#142A55] sm:text-sm">
                  {r?.name ?? "—"}
                </p>
                <p className="mt-1 text-xs font-black text-blue-700">
                  {r ? fmt(r.points) : "—"} PTS
                </p>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-center justify-between border-b border-blue-100 px-5 py-4">
        <h3 className="flex items-center gap-2 text-base font-black text-[#142A55]">
          <Trophy size={19} className="text-blue-600" /> Klasemen{" "}
          {modeText(event.mode)}
        </h3>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-700">
          {ranking.length} {event.mode === "solo" ? "Peserta" : "Squad"}
        </span>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[460px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Posisi</th>
                <th className="px-5 py-3">
                  {event.mode === "solo" ? "Pemain" : "Squad"}
                </th>
                <th className="px-5 py-3">Tangkapan</th>
                <th className="px-5 py-3 text-right">Poin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((rank, i) => (
                <tr key={rank.id} className="border-t border-slate-100 text-sm">
                  <td className="px-5 py-3 font-extrabold">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-600"}`}
                    >
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-extrabold text-slate-800">
                      {rank.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {rank.subtitle}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-500">
                    {fmt(rank.catches)}
                  </td>
                  <td className="px-5 py-3 text-right font-black tabular-nums text-blue-700">
                    {fmt(rank.points)} PTS
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-6 py-12 text-center text-sm text-slate-500">
          Belum ada peserta terdaftar.
        </div>
      )}
    </div>
  );
}
export function Breadcrumb({ label }: { label: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-400"
    >
      <Link href="/" className="hover:text-blue-600">
        Beranda
      </Link>
      <ChevronRight size={13} />
      <span className="truncate text-blue-700">{label}</span>
    </nav>
  );
}
export function FaqAccordion({
  questions,
}: {
  questions: { id: string; question: string; answer: string }[];
}) {
  return (
    <div className="space-y-3">
      {questions.map((item) => (
        <details
          key={item.id}
          className="group rounded-2xl border border-blue-100 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 text-sm font-bold text-[#142A55]">
            {item.question}
            <ChevronRight
              size={16}
              className="shrink-0 text-blue-600 transition-transform group-open:rotate-90"
            />
          </summary>
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 text-sm leading-7 whitespace-pre-line text-slate-600">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}

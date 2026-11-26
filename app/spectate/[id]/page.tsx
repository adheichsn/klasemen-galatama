import { listenerDatabaseUrl } from "@/lib/public-broker";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import { AvatarScope } from "@/components/player-avatar";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Fish,
  MonitorPlay,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { publicEvents } from "@/lib/public-events";
import { PublicRanking } from "@/components/public-site";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import LiveMatchClock from "@/components/live-match-clock";
import PublicAutoRefresh, { PublicEventUnavailable } from "@/components/public-auto-refresh";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { events } = await publicEvents(id);
  const event = events.find((item) => item.id === id);
  return {
    title: event ? `Spectator ${event.title}` : "Spectator",
    robots: { index: false, follow: false },
  };
}

export default async function SpectatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { events, unavailable } = await publicEvents(id);
  if (unavailable) return <PublicEventUnavailable />;
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  const competitorCount = event.mode === "solo" ? event.participants.length : event.squads.length;
  return (
    <AvatarScope profiles={await publicAvatarProfiles([event])} publicLinks>
      <div className="min-h-screen bg-[#0b1731] px-4 py-5 text-white sm:px-7 lg:px-10">
        <div className="mx-auto max-w-[1600px]">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-5">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-black tracking-tight"
            >
              <span className="rounded-xl bg-blue-600 p-2">
                <Fish size={21} />
              </span>{" "}
              WEJI <span className="text-blue-300">ARENA</span>{" "}
              <span className="ml-2 hidden text-xs font-semibold text-slate-400 sm:inline">
                SPECTATOR
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              {event.status !== "finished" && (
                <PublicAutoRefresh
                  streamingEnabled={!!listenerDatabaseUrl()}
                  eventId={event.id}
                  dark
                />
              )}
              <Link
                href={`/turnamen/${encodeURIComponent(event.id)}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-blue-100 hover:bg-white/10"
              >
                <ArrowLeft size={14} /> Detail Event <ExternalLink size={12} />
              </Link>
            </div>
          </header>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-black tracking-[.2em] text-blue-300">
                <MonitorPlay size={16} /> TOURNAMENT SPECTATOR VIEW
              </p>
              <h1 className="max-w-[960px] text-3xl font-black leading-tight sm:text-5xl">
                {event.title}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                {event.location || "Fish It"} • {event.mode.toUpperCase()} •{" "}
                {competitorCount}{" "}
                {event.mode === "solo"
                  ? "peserta"
                  : event.mode === "duo"
                    ? "pasangan"
                    : "squad"}
              </p>
            </div>
            <span
              className={`rounded-full px-4 py-2 text-xs font-black ${event.status === "live" ? "bg-rose-500/20 text-rose-200" : event.status === "finished" ? "bg-emerald-500/20 text-emerald-200" : "bg-white/10 text-slate-200"}`}
            >
              {event.status === "live" ? (
                "● LIVE"
              ) : event.status === "finished" ? (
                <>
                  <ShieldCheck size={15} className="mr-1 inline" /> FINAL
                  TERKUNCI
                </>
              ) : (
                "SEGERA HADIR"
              )}
            </span>
          </div>
          {(event.status === "live" || event.status === "finished") && (
            <LiveMatchClock event={{ id: event.id, status: event.status, timer: event.timer }} />
          )}
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,.8fr)]">
            <div className="min-w-0 space-y-5">
              <PublicRanking event={event} />
              <p className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} /> Tampilan penonton | tidak ada akses
                untuk mengubah poin atau aturan.
              </p>
            </div>
            <div className="min-w-0 space-y-5">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-blue-300">
                  <Trophy size={14} className="mr-1 inline" /> Kompetisi
                </p>
                <p className="text-3xl font-black">{competitorCount}</p>
                <p className="text-xs text-slate-300">
                  {event.mode === "solo"
                    ? "Peserta terdaftar"
                    : event.mode === "duo"
                      ? "Pasangan terdaftar"
                      : "Squad terdaftar"}
                </p>
              </div>
              <LiveActivityFeed event={event} max={12} />
            </div>
          </div>
          <footer className="mt-8 border-t border-white/10 pt-4 text-xs text-slate-500">
            Skor mengikuti aksi pertandingan yang sudah dikonfirmasi server.
          </footer>
        </div>
      </div>
    </AvatarScope>
  );
}

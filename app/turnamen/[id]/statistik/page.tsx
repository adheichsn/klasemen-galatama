import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChartNoAxesCombined, LockKeyhole } from "lucide-react";
import { TournamentAnalytics } from "@/components/tournament-analytics";
import PublicAutoRefresh from "@/components/public-auto-refresh";
import { Breadcrumb, PublicShell } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";

export const dynamic = "force-dynamic";
export default async function StatisticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Uses the same published, non-trashed filter as the public event page.
  const { events } = await publicEvents();
  const event = events.find((item) => item.id === id);
  if (!event) notFound();
  return (
    <PublicShell profiles={await publicAvatarProfiles([event])}>
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Statistik Turnamen" />
        <div className="mb-8 rounded-[26px] bg-gradient-to-r from-[#142D70] via-[#2152C1] to-[#2980E6] p-7 text-white sm:p-10">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold tracking-[.16em] text-blue-100">
            <ChartNoAxesCombined size={17} />TOURNAMENT INSIGHTS
          </div>
          <h1 className="text-3xl font-black sm:text-4xl">
            Statistik {event.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-blue-100">
            Analitik {event.mode.toUpperCase()} berdasarkan skor dan tangkapan
            yang tercatat selama pertandingan.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/turnamen/${encodeURIComponent(id)}`}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700"
            >
              <ArrowLeft size={15} /> Kembali ke Klasemen
            </Link>
            {event.status === "live" ? (
              <PublicAutoRefresh dark eventId={event.id} />
            ) : event.status === "finished" ? (
              <span className="inline-flex items-center gap-2 text-xs text-blue-100">
                <LockKeyhole size={15} /> Statistik hasil final
              </span>
            ) : null}
          </div>
        </div>
        <TournamentAnalytics event={event} />
      </main>
    </PublicShell>
  );
}

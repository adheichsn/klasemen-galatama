import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowRight,
  ChartNoAxesCombined,
  Fish,
  Trophy,
  Users,
} from "lucide-react";
import { Breadcrumb, PublicShell } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { tournamentAnalytics } from "@/lib/tournament-analytics";
import { fmt } from "@/lib/arena-utils";

export const metadata = pageMetadata({ title: "Statistik Turnamen dan Leaderboard", description: "Lihat statistik turnamen, klasemen, poin dan kontribusi peserta WEJI ARENA, termasuk Galatama Fish It.", path: "/statistik" });
export const dynamic = "force-dynamic";
export default async function TournamentInsightsCatalog({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const q = await searchParams;
  const { events, unavailable } = await publicEvents();
  const filtered = events.filter((event) =>
    q.mode === "solo" || q.mode === "duo" || q.mode === "squad"
      ? event.mode === q.mode
      : true,
  );
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Statistik Turnamen" />
        <div className="mb-8 rounded-[26px] bg-gradient-to-r from-[#142D70] via-[#2152C1] to-[#2980E6] p-7 text-white sm:p-10">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-black tracking-[.15em] text-blue-100">
            <ChartNoAxesCombined size={17} /> WEJI ARENA ANALYTICS
          </div>
          <h1 className="text-3xl font-black sm:text-4xl">
            Tournament Insights
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">
            Statistik tangkapan, bonus, dan performa pemain dari setiap turnamen
            Fish It yang dipublikasikan.
          </p>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { label: "Semua", value: "" },
            { label: "SOLO", value: "solo" },
            { label: "DUO", value: "duo" },
            { label: "SQUAD", value: "squad" },
          ].map((f) => (
            <Link
              key={f.value}
              href={f.value ? `/statistik?mode=${f.value}` : "/statistik"}
              className={`rounded-xl px-4 py-2 text-xs font-extrabold ${(!q.mode && !f.value) || q.mode === f.value ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-600"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {unavailable && (
          <p
            role="alert"
            className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            Data turnamen belum bisa dimuat. Coba lagi nanti.
          </p>
        )}
        {filtered.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => {
              const stat = tournamentAnalytics(e);
              return (
                <article
                  key={e.id}
                  className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg"
                >
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold text-blue-700">
                    {e.mode.toUpperCase()} ·{" "}
                    {e.status === "live"
                      ? "LIVE"
                      : e.status === "finished"
                        ? "SELESAI"
                        : "DRAFT"}
                  </span>
                  <h2 className="mt-4 line-clamp-2 text-lg font-black text-[#142A55]">
                    {e.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {e.location || "Semua pulau"}
                  </p>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-y border-slate-100 py-4 text-center text-[11px]">
                    <div>
                      <Fish size={17} className="mx-auto mb-1 text-blue-600" />
                      <b className="text-[#142A55]">{fmt(stat.validCatches)}</b>
                      <div className="text-slate-400">Secret</div>
                    </div>
                    <div>
                      <Trophy
                        size={17}
                        className="mx-auto mb-1 text-blue-600"
                      />
                      <b className="text-[#142A55]">{fmt(stat.netPoints)}</b>
                      <div className="text-slate-400">Poin</div>
                    </div>
                    <div>
                      <Users size={17} className="mx-auto mb-1 text-blue-600" />
                      <b className="text-[#142A55]">
                        {fmt(stat.participantCount)}
                      </b>
                      <div className="text-slate-400">Peserta</div>
                    </div>
                  </div>
                  <Link
                    href={`/turnamen/${encodeURIComponent(e.id)}/statistik`}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-extrabold text-blue-700 hover:gap-3"
                  >
                    Lihat Statistik <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          !unavailable && (
            <p className="rounded-xl border border-blue-100 bg-white p-10 text-center text-sm text-slate-500">
              Belum ada turnamen publik untuk filter ini.
            </p>
          )
        )}
      </main>
    </PublicShell>
  );
}

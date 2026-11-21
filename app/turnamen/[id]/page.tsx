import { eventMetadata } from "@/lib/seo-server";
import { eventSeoAllowed, eventPath } from "@/lib/seo-core";
import { BreadcrumbJsonLd } from "@/components/seo-json-ld";
import { avatarTarget } from "@/lib/avatar-identity";
import { PlayerIdentity } from "@/components/player-avatar";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import Link from "next/link";
import { LiveActivityFeed } from "@/components/live-activity-feed";
import PublicAutoRefresh from "@/components/public-auto-refresh";
import LiveMatchClock from "@/components/live-match-clock";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock3,
  Fish,
  Globe2,
  ListChecks,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { publicEvents } from "@/lib/public-events";
import {
  Breadcrumb,
  dateLabel,
  FaqAccordion,
  PublicRanking,
  PublicShell,
  stageText,
} from "@/components/public-site";
import { fmt, squadContribution } from "@/lib/arena-utils";
import { validBannerUrl } from "@/lib/banner";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return eventMetadata((await params).id, "detail");
}
export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { events } = await publicEvents();
  const e = events.find((x) => x.id === id);
  if (!e) notFound();
  const rules = Array.from(new Set(e.writtenRules.map((x) => x.group)));
  return (
    <PublicShell profiles={await publicAvatarProfiles([e])}>
      {eventSeoAllowed(e, "detail") && (
        <BreadcrumbJsonLd
          items={[
            { name: "Turnamen", path: "/turnamen" },
            { name: e.title, path: eventPath(e.id) },
          ]}
        />
      )}
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label={e.title} />
        <section className="relative mb-8 overflow-hidden rounded-[27px] bg-gradient-to-r from-[#142D70] via-[#2152C1] to-[#2980E6] p-7 text-white sm:p-10">
          {e.bannerUrl && validBannerUrl(e.bannerUrl) && (
            <>
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url("${e.bannerUrl}")` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#081B42]/95 via-[#081B42]/80 to-[#081B42]/30" />
            </>
          )}
          <div className="pointer-events-none absolute -right-12 -top-16 rounded-full border-[48px] border-white/10 p-20" />
          <div className="relative z-10 max-w-[780px]">
            <div className="mb-4 inline-flex gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-extrabold">
              <Trophy size={14} />
              {e.mode.toUpperCase()} • {stageText(e)}
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
              {e.title}
            </h1>
            <p className="mt-3 text-sm leading-7 text-blue-100 sm:text-base">
              {e.subtitle}
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-xs font-bold text-blue-100">
              <span className="inline-flex items-center gap-2">
                <Globe2 size={16} />
                {e.location || "Semua pulau"}
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarDays size={16} />
                {dateLabel(e.eventDate)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 size={16} />
                {fmt(e.timer.durationSec / 60)} menit
              </span>
            </div>
          </div>
        </section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {e.status === "live" ? (
            <PublicAutoRefresh eventId={e.id} />
          ) : (
            <span />
          )}
          {e.status === "finished" && (
            <Link
              href={`/turnamen/${encodeURIComponent(e.id)}/hasil`}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-700"
            >
              <Trophy size={16} /> Hasil Final
            </Link>
          )}
          <Link
            href={`/turnamen/${encodeURIComponent(e.id)}/statistik`}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-50"
          >
            <ChartNoAxesCombined size={16} /> Statistik Turnamen
          </Link>
          <Link
            href={`/spectate/${encodeURIComponent(e.id)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-50"
          >
            <MonitorPlay size={16} /> Spectator / OBS
          </Link>
        </div>
        {(e.status === "live" || e.status === "finished") && (
          <LiveMatchClock event={e} />
        )}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-7">
            <PublicRanking event={e} />
            {(e.status === "live" || e.status === "finished") && (
              <LiveActivityFeed event={e} />
            )}
            {e.mode !== "solo" && e.squads.length > 0 && (
              <section className="rounded-2xl border border-blue-100 bg-white p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#142A55]">
                  <Users size={20} className="text-blue-600" /> Kontribusi
                  Anggota {e.mode === "duo" ? "Pasangan" : "Squad"}
                </h2>
                <div className="space-y-4">
                  {e.squads.map((s) => (
                    <div key={s.id} className="rounded-xl bg-slate-50 p-4">
                      <div className="mb-2 font-extrabold text-[#142A55]">
                        {s.name}
                      </div>
                      {squadContribution(e, s.id).map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between border-t border-slate-200 py-2 text-xs"
                        >
                          <PlayerIdentity
                            target={avatarTarget(e, p.id)}
                            name={p.name}
                            size="sm"
                          />
                          <b className="text-blue-700">{fmt(p.points)} PTS</b>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section className="rounded-2xl border border-blue-100 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#142A55]">
                <ListChecks size={20} className="text-blue-600" /> Peraturan
                Resmi
              </h2>
              {rules.length ? (
                rules.map((group) => (
                  <div className="mb-5" key={group}>
                    <h3 className="mb-2 text-sm font-extrabold text-blue-700">
                      {group}
                    </h3>
                    <ol className="space-y-2 text-sm leading-6 text-slate-600">
                      {e.writtenRules
                        .filter((r) => r.group === group)
                        .map((r, i) => (
                          <li key={r.id}>
                            {i + 1}. {r.content}
                          </li>
                        ))}
                    </ol>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Panitia belum menambahkan peraturan tertulis.
                </p>
              )}
            </section>
            {e.faqs.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-black text-[#142A55]">
                  Pertanyaan Umum
                </h2>
                <FaqAccordion questions={e.faqs} />
              </section>
            )}
          </div>
          <aside className="space-y-6">
            <section className="rounded-2xl border border-blue-100 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#142A55]">
                <Fish size={20} className="text-blue-600" /> Katalog Ikan
              </h2>
              {e.fish.filter((f) => f.enabled).length ? (
                e.fish
                  .filter((f) => f.enabled)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"
                    >
                      <span>{f.name}</span>
                      <b className="text-blue-700">+{fmt(f.points)} PTS</b>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-slate-500">Belum ada ikan aktif.</p>
              )}
            </section>
            <section className="rounded-2xl border border-blue-100 bg-white p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-black text-[#142A55]">
                <Sparkles size={20} className="text-blue-600" /> Bonus Poin
              </h2>
              {e.bonuses.filter((b) => b.enabled).length ? (
                e.bonuses
                  .filter((b) => b.enabled)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between border-b border-slate-100 py-3 text-sm"
                    >
                      <span>{b.name}</span>
                      <b className="text-blue-700">
                        {b.points >= 0 ? "+" : ""}
                        {fmt(b.points)} PTS
                      </b>
                    </div>
                  ))
              ) : (
                <p className="text-sm text-slate-500">Tidak ada bonus aktif.</p>
              )}
              <p className="mt-4 text-xs leading-6 text-slate-400">
                Poin dasar dan bonus ditentukan panitia untuk turnamen ini.
                Transaksi lama mengikuti nilai saat dicatat.
              </p>
            </section>
            <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <div className="flex gap-3">
                <ShieldCheck className="shrink-0 text-blue-600" size={21} />
                <div>
                  <b className="text-sm text-[#142A55]">Public Read-Only</b>
                  <p className="mt-1 text-xs leading-6 text-slate-600">
                    Klasemen dan informasi turnamen dapat dilihat semua orang.
                    Perubahan hanya bisa dilakukan panitia yang telah login.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </PublicShell>
  );
}

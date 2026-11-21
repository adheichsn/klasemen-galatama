import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ExternalLink, Trophy } from "lucide-react";
import { PublicShell, Breadcrumb, dateLabel } from "@/components/public-site";
import { PlayerAvatar } from "@/components/player-avatar";
import { publicEvents } from "@/lib/public-events";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import {
  buildPlayerDirectory,
  playerTotals,
  playerHref,
} from "@/lib/player-directory";
import { validRobloxId } from "@/lib/player-identity";
import { fmt } from "@/lib/arena-utils";
import type { AvatarProfiles } from "@/lib/avatar-identity";

export const dynamic = "force-dynamic";
const PER_PAGE = 12;
export default async function RobloxPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ robloxId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { robloxId } = await params;
  if (!validRobloxId(robloxId)) notFound();
  const { events, unavailable } = await publicEvents();
  if (unavailable)
    return (
      <PublicShell>
        <main className="mx-auto max-w-3xl px-4 py-12">
          <p
            role="status"
            className="rounded-xl bg-amber-50 p-5 text-amber-800"
          >
            Database publik belum tersedia. Coba kembali nanti.
          </p>
          <Link className="mt-4 block text-blue-600" href="/pemain">
            Kembali ke Pemain
          </Link>
        </main>
      </PublicShell>
    );
  let identityUnavailable = false;
  const profiles = await publicAvatarProfiles(events, () => {
    identityUnavailable = true;
  });
  if (identityUnavailable)
    return (
      <PublicShell>
        <main className="mx-auto max-w-3xl px-4 py-12">
          <p
            role="status"
            className="rounded-xl bg-amber-50 p-5 text-amber-800"
          >
            Data profil sementara tidak tersedia. Coba kembali nanti.
          </p>
          <Link className="mt-4 block text-blue-600" href="/pemain">
            Kembali ke Pemain
          </Link>
        </main>
      </PublicShell>
    );
  const player = buildPlayerDirectory(events, profiles).find(
    (p) => p.profile.robloxId === robloxId,
  );
  if (!player) notFound();
  const { profile, target, stats, history } = player;
  const totals = playerTotals(player);
  const query = await searchParams;
  const mode =
    query.mode === "solo" || query.mode === "duo" || query.mode === "squad"
      ? query.mode
      : "all";
  const filtered = history.filter((h) => mode === "all" || h.mode === mode);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const requested = typeof query.page === "string" ? Number(query.page) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0
      ? Math.min(pages, requested)
      : 1;
  const href = (next: number) =>
    `${playerHref(robloxId)}?${new URLSearchParams({ mode, page: String(next) })}`;
  const selectedProfiles: AvatarProfiles = target ? { [target]: profile } : {};
  return (
    <PublicShell profiles={selectedProfiles}>
      <main className="mx-auto max-w-[1060px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Profil Pemain" />
        <Link
          href="/pemain"
          className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} /> Semua Pemain
        </Link>
        <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#132b68] to-[#2c6be3] p-6 text-white sm:p-10">
          <div className="flex flex-wrap items-center gap-4">
            <PlayerAvatar target={target} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black tracking-[.2em] text-blue-200">
                WEJI ARENA PLAYER PROFILE
              </p>
              <h1 className="mt-1 break-words text-3xl font-black sm:text-4xl">
                {profile.displayName || profile.username}
              </h1>
              <p className="mt-2 break-all text-sm text-blue-100">
                @{profile.username} · Roblox ID {profile.robloxId}
              </p>
            </div>
            <a
              href={`https://www.roblox.com/users/${robloxId}/profile`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-blue-700"
            >
              Profil Roblox <ExternalLink size={15} />
            </a>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { n: totals.finalEvents, label: "Edisi final" },
              { n: totals.wins, label: "Gelar juara" },
              { n: totals.podiums, label: "Podium" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-white/10 p-3 sm:p-4">
                <b className="block text-2xl">{fmt(m.n)}</b>
                <span className="text-xs text-blue-100">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <h2 className="mb-4 flex items-center gap-2 text-xl font-black text-[#142A55]">
          <Trophy size={22} className="text-blue-600" /> Pencapaian Pemain
        </h2>
        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["solo", "duo", "squad"] as const).map((m) => (
            <section
              key={m}
              className="rounded-2xl border border-blue-100 bg-white p-5"
            >
              <h3 className="text-sm font-black text-blue-700">
                {m.toUpperCase()}
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  {
                    label: "Juara 1",
                    v: stats[m].wins,
                    c: "bg-amber-50 text-amber-800",
                  },
                  {
                    label: "Juara 2",
                    v: stats[m].silver,
                    c: "bg-slate-100 text-slate-700",
                  },
                  {
                    label: "Juara 3",
                    v: stats[m].bronze,
                    c: "bg-orange-50 text-orange-800",
                  },
                ].map((x) => (
                  <div key={x.label} className={`rounded-xl p-3 ${x.c}`}>
                    <b className="block text-2xl">{x.v}</b>
                    <span className="text-xs">{x.label}</span>
                  </div>
                ))}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-500">
                {[
                  { label: "Edisi final", value: fmt(stats[m].events) },
                  {
                    label: "Peringkat terbaik",
                    value:
                      stats[m].bestRank === null
                        ? "—"
                        : `#${stats[m].bestRank}`,
                  },
                  { label: "Total poin tercatat", value: fmt(stats[m].points) },
                  { label: "Tangkapan tercatat", value: fmt(stats[m].catches) },
                ].map((x) => (
                  <div key={x.label} className="rounded-lg bg-slate-50 p-3">
                    <dt>{x.label}</dt>
                    <dd className="mt-1 text-base font-black text-[#142A55]">
                      {x.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
        <section className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-[#142A55]">
              Riwayat Turnamen
            </h2>
            <div className="flex gap-1" aria-label="Filter mode">
              {["all", "solo", "duo", "squad"].map((m) => (
                <Link
                  key={m}
                  href={`${playerHref(robloxId)}?mode=${m}`}
                  aria-current={mode === m ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === m ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}
                >
                  {m === "all" ? "Semua" : m.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
          {!filtered.length && (
            <p className="py-6 text-sm text-slate-500">
              Belum ada pertandingan pada mode ini.
            </p>
          )}
          <div className="divide-y divide-blue-100">
            {filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE).map((h) => (
              <article
                key={h.eventId}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold text-blue-700">
                    <span>{h.mode.toUpperCase()}</span>
                    <span>
                      {h.status === "finished"
                        ? "FINISHED"
                        : h.status === "live"
                          ? "LIVE"
                          : "TERJADWAL"}
                    </span>
                    {h.rank !== null && (
                      <span>
                        {h.mode !== "solo" ? "Peringkat tim" : "Peringkat"} #
                        {h.rank}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 break-words text-sm font-extrabold text-[#142A55]">
                    {h.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {dateLabel(h.eventDate)} · {h.location || "Semua pulau"}
                    {h.teamName ? ` · Tim ${h.teamName}` : ""}
                  </p>
                  <p className="mt-1 break-words text-xs text-slate-500">
                    Tercatat sebagai {h.recordedName}
                    {h.recordedUsername
                      ? ` (@${h.recordedUsername.replace(/^@/, "")})`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {h.points !== null && (
                    <div className="text-right">
                      <b className="block text-sm text-blue-700">
                        {fmt(h.points)} PTS
                      </b>
                      <span className="text-[11px] text-slate-500">
                        {fmt(h.catches ?? 0)} tangkapan
                      </span>
                    </div>
                  )}
                  <Link
                    href={`/turnamen/${encodeURIComponent(h.eventId)}${h.status === "finished" ? "/hasil" : ""}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                  >
                    {h.status === "finished" ? "Hasil Final" : "Detail Event"}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {pages > 1 && (
            <nav
              className="mt-5 flex items-center justify-center gap-4 text-sm"
              aria-label="Halaman riwayat"
            >
              {page > 1 && (
                <Link href={href(page - 1)} className="font-bold text-blue-600">
                  Sebelumnya
                </Link>
              )}
              <span>
                {page} / {pages}
              </span>
              {page < pages && (
                <Link href={href(page + 1)} className="font-bold text-blue-600">
                  Berikutnya
                </Link>
              )}
            </nav>
          )}
        </section>
        <p className="mt-5 text-xs leading-6 text-slate-500">
          Riwayat mengikuti Roblox User ID yang dikonfirmasi panitia, bukan
          verifikasi kepemilikan akun. Hanya turnamen publik yang ditampilkan.
          Statistik dihitung dari hasil final; poin lintas edisi merupakan
          rekap, bukan perbandingan performa antaraturan. Pada DUO dan SQUAD,
          poin adalah kontribusi individu dan podium mengikuti tim pada roster
          final. Tangkapan yang dibatalkan tidak dihitung; catatan historis yang
          tidak lengkap dapat memiliki total tangkapan lebih rendah dari aktual.
        </p>
      </main>
    </PublicShell>
  );
}

import { identitySoloChampions, playerHref, legacyPlayerHref } from "@/lib/player-directory";
import { avatarTarget, avatarProfile, rankAvatarTargets } from "@/lib/avatar-identity";
import { PlayerIdentity, RankIdentity } from "@/components/player-avatar";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import Link from "next/link";
import {
  ArrowRight,
  Crown,
  LockKeyhole,
  Medal,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { Breadcrumb, PublicShell, dateLabel } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { fmt } from "@/lib/arena-utils";
import {
  finalEvents,
  normalizedRobloxUsername,
  resultRows,
} from "@/lib/tournament-results";
export const dynamic = "force-dynamic";
const PER_PAGE = 9;
export default async function HallOfFame({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string;
    location?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const mode =
    params.mode === "solo" || params.mode === "squad" ? params.mode : "all";
  const location = (params.location || "").slice(0, 150);
  const query = (params.q || "").trim().slice(0, 100).toLocaleLowerCase();
  const pageParam = Number(params.page);
  const page =
    Number.isSafeInteger(pageParam) && pageParam >= 1
      ? Math.min(pageParam, 99999)
      : 1;
  const { events, unavailable } = await publicEvents();
  const completed = finalEvents(events);
  const locations = [
    ...new Set(completed.map((e) => e.location || "Semua pulau")),
  ].sort((a, b) => a.localeCompare(b));
  const filtered = completed.filter(
    (e) =>
      (mode === "all" || e.mode === mode) &&
      (!location || (e.location || "Semua pulau") === location) &&
      (!query ||
        `${e.title} ${e.location} ${resultRows(e)
          .map((r) => r.name)
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(query)),
  );
  let identityUnavailable = false;
  const profiles = await publicAvatarProfiles(filtered, () => { identityUnavailable = true; });
  const allTime = identityUnavailable ? [] : identitySoloChampions(filtered, profiles);
  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pages);
  const showing = filtered.slice(
    (safePage - 1) * PER_PAGE,
    safePage * PER_PAGE,
  );
  const pageHref = (next: number) => {
    const q = new URLSearchParams();
    if (mode !== "all") q.set("mode", mode);
    if (location) q.set("location", location);
    if (query) q.set("q", query);
    q.set("page", String(next));
    return `/hall-of-fame?${q.toString()}`;
  };
  return (
    <PublicShell profiles={profiles}>
      <main className="mx-auto max-w-[1220px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Hall of Fame" />
        <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#102658] via-[#2052b9] to-[#3288ed] p-8 text-white sm:p-11">
          <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[35px] border-white/10" />
          <Crown size={38} className="mb-4 text-amber-300" />
          <p className="text-[11px] font-black tracking-[.2em] text-blue-200">
            LEGENDS OF WEJI ARENA
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Hall of Fame
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">
            Riwayat juara SOLO dan SQUAD, gelar sepanjang edisi, dan klasemen
            resmi dari pertandingan final.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-bold">
            <span className="rounded-full bg-white/15 px-3 py-2">
              {completed.length} Edisi Final
            </span>
            <span className="rounded-full bg-white/15 px-3 py-2">
              {completed.filter((e) => e.mode === "solo").length} SOLO
            </span>
            <span className="rounded-full bg-white/15 px-3 py-2">
              {completed.filter((e) => e.mode === "squad").length} SQUAD
            </span>
          </div>
        </section>
        <form
          action="/hall-of-fame"
          method="get"
          className="mb-8 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-[1fr_155px_190px_auto] sm:items-end"
        >
          <label className="block text-xs font-bold text-slate-600">
            Cari event / juara
            <input
              name="q"
              maxLength={100}
              defaultValue={params.q || ""}
              placeholder="Cari turnamen atau pemenang..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Mode
            <select
              name="mode"
              defaultValue={mode}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="all">Semua</option>
              <option value="solo">SOLO</option>
              <option value="squad">SQUAD</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-slate-600">
            Lokasi
            <select
              name="location"
              defaultValue={location}
              className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="">Semua lokasi</option>
              {locations.map((loc) => (
                <option value={loc} key={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
          >
            <Search size={16} /> Cari
          </button>
        </form>
        {unavailable && (
          <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Database publik belum tersedia. Coba buka lagi setelah koneksi
            pulih.
          </p>
        )}
        {identityUnavailable && <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Rekap identitas pemain sementara tidak tersedia. Hasil per edisi tetap ditampilkan.</p>}
        {mode !== "squad" && allTime.length > 0 && (
          <section className="mb-9 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-2 flex items-center gap-2">
              <Crown className="text-amber-500" size={24} />
              <h2 className="text-xl font-black text-[#142A55]">
                All-Time SOLO Champions
              </h2>
            </div>
            <p className="mb-5 text-xs leading-6 text-slate-500">
              Peringkat berdasarkan jumlah gelar juara, lalu podium. Skor
              berbeda event tidak dijumlahkan.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[490px] text-left text-sm">
                <thead className="bg-blue-50 text-[11px] uppercase text-blue-700">
                  <tr>
                    <th className="rounded-l-lg px-3 py-3">#</th>
                    <th className="px-3 py-3">Pemain</th>
                    <th className="px-3 py-3 text-right">Gelar</th>
                    <th className="px-3 py-3 text-right">Podium</th>
                    <th className="rounded-r-lg px-3 py-3 text-right">Edisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {allTime.slice(0, 20).map((p, i) => (
                    <tr key={p.key} className="hover:bg-blue-50/50">
                      <td className="px-3 py-3 font-black text-blue-600">
                        {i + 1}
                      </td>
                      <td className="px-3 py-3">
                        <PlayerIdentity target={p.target} name={p.name} subtitle={`@${p.username}`} size="sm" />
                        <Link prefetch={false} href={p.href} className="text-[11px] font-bold text-blue-600 hover:underline">{p.linked ? "Profil pemain" : "Arsip username"}</Link>
                        {!p.linked && <p className="text-[10px] text-slate-500">Belum terhubung</p>}
                      </td>
                      <td className="px-3 py-3 text-right font-extrabold">
                        {p.wins}
                      </td>
                      <td className="px-3 py-3 text-right">{p.podiums}</td>
                      <td className="px-3 py-3 text-right">{p.appearances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-slate-500">
              Gelar pemain yang terhubung dikelompokkan berdasarkan Roblox User ID. Catatan username yang belum terhubung dipisahkan dan ditandai sebagai arsip lama, bukan identitas terkonfirmasi.
            </p>
          </section>
        )}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-black text-[#142A55]">
            <Trophy size={22} className="text-blue-600" /> Juara per Edisi
          </h2>
          <span className="text-xs font-bold text-slate-500">
            {filtered.length} turnamen ditemukan
          </span>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {showing.map((event) => {
            const top = resultRows(event).slice(0, 3);
            return (
              <article
                key={event.id}
                className="min-w-0 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700">
                    {event.mode.toUpperCase()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <LockKeyhole size={12} /> Final
                  </span>
                </div>
                <h3 className="mt-3 line-clamp-2 text-lg font-black text-[#142A55]">
                  {event.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {dateLabel(event.eventDate)} •{" "}
                  {event.location || "Semua pulau"}
                </p>
                <div className="mt-5 divide-y divide-blue-50">
                  {top.length ? (
                    top.map((r, i) => {
                      const linked = event.mode === "solo" ? avatarProfile(profiles, avatarTarget(event,r.id)) : undefined;
                      const legacy = event.mode === "solo" ? normalizedRobloxUsername(r.username) : null;
                      const profile = linked ? playerHref(linked.robloxId) : legacy ? legacyPlayerHref(legacy) : null;
                      return (
                        <div
                          key={r.id}
                          className="flex items-center gap-3 py-3"
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-700"}`}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <RankIdentity targets={rankAvatarTargets(event, r.id)} name={r.name} subtitle={r.subtitle} team={event.mode === "squad"} />{profile && <Link prefetch={false} href={profile} className="text-[11px] font-bold text-blue-600 hover:underline">Riwayat pemain</Link>}
                            <p className="text-[11px] text-slate-400">
                              {fmt(r.catches)} Secret
                            </p>
                          </div>
                          <b className="shrink-0 text-xs text-blue-700">
                            {fmt(r.points)} PTS
                          </b>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-4 text-sm text-slate-500">
                      Belum ada peringkat.
                    </p>
                  )}
                </div>
                <Link
                  href={`/turnamen/${encodeURIComponent(event.id)}/hasil`}
                  className="mt-5 inline-flex items-center gap-2 text-xs font-black text-blue-600 hover:underline"
                >
                  Lihat Hasil Final <ArrowRight size={15} />
                </Link>
              </article>
            );
          })}
        </div>
        {!filtered.length && !unavailable && (
          <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center">
            <Users className="mx-auto mb-3 text-blue-400" size={36} />
            <h3 className="font-black text-[#142A55]">
              Belum ada hasil yang cocok
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Coba ubah mode, lokasi, atau kata kunci.
            </p>
          </div>
        )}
        {pages > 1 && (
          <nav
            aria-label="Halaman Hall of Fame"
            className="mt-7 flex items-center justify-center gap-3"
          >
            {safePage > 1 && (
              <Link
                className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-blue-700"
                href={pageHref(safePage - 1)}
              >
                Sebelumnya
              </Link>
            )}
            <span className="text-xs font-bold text-slate-600">
              {safePage} / {pages}
            </span>
            {safePage < pages && (
              <Link
                className="rounded-xl border border-blue-100 bg-white px-4 py-2 text-xs font-bold text-blue-700"
                href={pageHref(safePage + 1)}
              >
                Berikutnya
              </Link>
            )}
          </nav>
        )}
        <p className="mt-7 text-xs leading-6 text-slate-500">
          Untuk SQUAD, pemenang ditampilkan per edisi. Nama squad yang sama pada
          turnamen berbeda tidak otomatis digabung sebagai identitas tim global;
          poin turnamen tidak pernah diakumulasi lintas event.
        </p>
      </main>
    </PublicShell>
  );
}

import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import {
  finalEditionMatches,
  publicFinalEditions,
} from "@/lib/championship-insights";
import { ChampionshipPodium } from "@/components/championship-podium";
import {
  Breadcrumb,
  EmptyEvents,
  EventCard,
  PublicShell,
} from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { LockKeyhole, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
export const dynamic = "force-dynamic";
const PER_PAGE = 6;
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{
    mode?: string | string[];
    q?: string | string[];
    location?: string | string[];
    page?: string | string[];
  }>;
}) {
  const raw = await searchParams;
  const single = (value?: string | string[]) =>
    typeof value === "string" ? value : "";
  const params = {
    mode: single(raw.mode),
    location: single(raw.location),
    q: single(raw.q),
    page: single(raw.page),
  };
  const mode =
    params.mode === "solo" || params.mode === "duo" || params.mode === "squad"
      ? params.mode
      : "";
  const query = (params.q || "").trim().slice(0, 100);
  const location = (params.location || "").slice(0, 150);
  const { events, unavailable } = await publicEvents();
  const completed = publicFinalEditions(events);
  const locations = [
    ...new Set(completed.map((e) => e.location || "Semua pulau")),
  ].sort();
  const candidates = completed.filter(
    (e) =>
      (!mode || e.mode === mode) &&
      (!location || (e.location || "Semua pulau") === location),
  );
  let identityUnavailable = false;
  const profiles = await publicAvatarProfiles(candidates, () => {
    identityUnavailable = true;
  });
  const finished = candidates.filter((e) =>
    finalEditionMatches(e, profiles, query),
  );
  const pages = Math.max(1, Math.ceil(finished.length / PER_PAGE));
  const rawPage = Number(params.page);
  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, pages) : 1;
  const href = (nextMode: string, nextPage = 1) => {
    const q = new URLSearchParams();
    if (nextMode) q.set("mode", nextMode);
    if (query) q.set("q", query);
    if (location) q.set("location", location);
    if (nextPage > 1) q.set("page", String(nextPage));
    return `/arsip?${q.toString()}`;
  };
  return (
    <PublicShell profiles={profiles}>
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Arsip Galatama" />
        <section className="mb-7 rounded-3xl bg-gradient-to-br from-[#102658] via-[#2052b9] to-[#3288ed] p-7 text-white sm:p-10">
          <p className="text-[11px] font-black tracking-widest text-blue-200">
            TOURNAMENT HISTORY
          </p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Galatama Archives
          </h1>
          <p className="mt-2 text-sm text-blue-100">
            Kenang hasil akhir dan para juara dari seluruh edisi, berdasarkan
            tanggal pertandingan asli.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-bold">
            <LockKeyhole size={16} /> {completed.length} turnamen selesai
          </div>
        </section>
        <nav aria-label="Mode arsip" className="my-5 flex flex-wrap gap-2">
          {[
            { label: "Semua", value: "" },
            { label: "SOLO", value: "solo" },
            { label: "DUO", value: "duo" },
            { label: "SQUAD", value: "squad" },
          ].map((f) => (
            <Link
              key={f.value}
              href={href(f.value)}
              aria-current={mode === f.value ? "page" : undefined}
              className={`rounded-xl px-4 py-2 text-xs font-black ${mode === f.value ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-600"}`}
            >
              {f.label} (
              {completed.filter((e) => !f.value || e.mode === f.value).length})
            </Link>
          ))}
        </nav>
        <form
          action="/arsip"
          method="get"
          className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-[1fr_190px_auto] sm:items-end"
        >
          <input type="hidden" name="mode" value={mode} />
          <label className="text-xs font-bold text-slate-600">
            Cari event atau juara
            <input
              name="q"
              defaultValue={query}
              maxLength={100}
              placeholder="Nama, username, tim..."
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Lokasi
            <select
              name="location"
              defaultValue={location}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm"
            >
              <option value="">Semua lokasi</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </label>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">
            <Search size={16} /> Cari
          </button>
        </form>
        {unavailable && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"
          >
            Data arsip belum tersedia. Coba lagi nanti.
          </p>
        )}
        {identityUnavailable && (
          <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            Profil Roblox sementara tidak tersedia. Hasil resmi tetap
            ditampilkan.
          </p>
        )}
        <p className="mb-4 text-xs font-bold text-slate-500">
          {finished.length} edisi ditemukan
        </p>
        {finished.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {finished
              .slice((page - 1) * PER_PAGE, page * PER_PAGE)
              .map((e, i) => (
                <article
                  key={e.id}
                  className="min-w-0 space-y-3 rounded-2xl border border-blue-100 bg-white p-3 shadow-sm"
                >
                  <EventCard event={e} index={i} />
                  <ChampionshipPodium event={e} compact />
                  <Link
                    href={`/turnamen/${encodeURIComponent(e.id)}/hasil`}
                    className="inline-flex items-center gap-2 px-1 py-2 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lihat Hasil Final <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
          </div>
        ) : (
          !unavailable && <EmptyEvents type="arsip Galatama" />
        )}
        {pages > 1 && (
          <nav
            aria-label="Halaman arsip"
            className="mt-7 flex items-center justify-center gap-4 text-sm"
          >
            {page > 1 && (
              <Link
                className="font-bold text-blue-600"
                href={href(mode, page - 1)}
              >
                Sebelumnya
              </Link>
            )}
            <span>
              {page} / {pages}
            </span>
            {page < pages && (
              <Link
                className="font-bold text-blue-600"
                href={href(mode, page + 1)}
              >
                Berikutnya
              </Link>
            )}
          </nav>
        )}
      </main>
    </PublicShell>
  );
}

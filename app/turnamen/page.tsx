import { publicEvents } from "@/lib/public-events";
import {
  Breadcrumb,
  EmptyEvents,
  EventCard,
  PublicShell,
} from "@/components/public-site";
export const dynamic = "force-dynamic";
type Search = { mode?: string; status?: string; q?: string };
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const q = await searchParams;
  const { events } = await publicEvents();
  const filtered = events.filter(
    (e) =>
      (q.mode === "solo" || q.mode === "squad" ? e.mode === q.mode : true) &&
      (q.status === "live" || q.status === "finished" || q.status === "draft"
        ? e.status === q.status
        : true) &&
      (!q.q ||
        `${e.title} ${e.location}`.toLowerCase().includes(q.q.toLowerCase())),
  );
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Turnamen" />
        <div className="mb-7">
          <div className="mb-2 text-[11px] font-black tracking-widest text-blue-600">
            TOURNAMENT CATALOG
          </div>
          <h1 className="text-3xl font-black text-[#142A55] sm:text-4xl">
            Explore Tournaments
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Temukan turnamen SOLO dan SQUAD dengan sistem poin unik.
          </p>
        </div>
        <form
          className="mb-7 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-[1fr_auto_auto_auto]"
          action="/turnamen"
        >
          <input
            name="q"
            defaultValue={q.q || ""}
            placeholder="Cari nama event atau lokasi..."
            className="min-w-0 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
          />
          <select
            name="mode"
            defaultValue={q.mode || "all"}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="all">Semua Mode</option>
            <option value="solo">SOLO</option>
            <option value="squad">SQUAD</option>
          </select>
          <select
            name="status"
            defaultValue={q.status || "all"}
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          >
            <option value="all">Semua Status</option>
            <option value="live">Live</option>
            <option value="draft">Upcoming</option>
            <option value="finished">Finished</option>
          </select>
          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">
            Terapkan Filter
          </button>
        </form>
        <p className="mb-4 text-xs font-semibold text-slate-500">
          {filtered.length} turnamen ditemukan
        </p>
        {filtered.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} />
            ))}
          </div>
        ) : (
          <EmptyEvents />
        )}
      </main>
    </PublicShell>
  );
}

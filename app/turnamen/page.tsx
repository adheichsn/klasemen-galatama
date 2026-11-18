import { MarketplaceCatalog } from "@/components/marketplace-catalog";
import { Breadcrumb, PublicShell } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { standings } from "@/lib/arena-utils";
import type { MarketplaceEvent } from "@/lib/marketplace-filters";
import type { MarketplaceMode, MarketplaceStatus, MarketplaceSort } from "@/lib/marketplace-filters";
export const dynamic = "force-dynamic";

type Search = { mode?: string; status?: string; q?: string; sort?: string };
export default async function EventsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const { events, unavailable } = await publicEvents();
  const catalog: MarketplaceEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    subtitle: event.subtitle,
    location: event.location,
    host: event.host,
    eventDate: event.eventDate,
    mode: event.mode,
    status: event.status,
    bannerUrl: event.bannerUrl,
    featured: event.featured,
    createdAt: event.createdAt,
    participantCount: event.participants.length,
    topPoints: standings(event)[0]?.points,
  }));
  const mode: MarketplaceMode = q.mode === "solo" || q.mode === "squad" ? q.mode : "all";
  const sort: MarketplaceSort = q.sort === "newest" || q.sort === "participants" || q.sort === "alphabetical" ? q.sort : "recommended";
  const status: MarketplaceStatus = q.status === "live" || q.status === "draft" || q.status === "finished" ? q.status : "all";
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1260px] px-4 py-8 sm:px-6 sm:py-12">
        <Breadcrumb label="Katalog Turnamen" />
        <div className="relative mb-8 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#142B60] via-[#1D4FAA] to-[#317BEC] px-6 py-9 text-white sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[46px] border-white/10" />
          <div className="relative">
            <p className="text-[11px] font-black tracking-[.19em] text-blue-200">THE TOURNAMENT COLLECTION</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Cari Arena Kamu Berikutnya.</h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">Jelajahi seluruh event Fish It, filter SOLO atau SQUAD, dan pantau turnamen yang sedang berlangsung.</p>
          </div>
        </div>
        {unavailable && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Data turnamen belum dapat dimuat. Coba muat ulang halaman nanti.</div>}
        <MarketplaceCatalog events={catalog} initialQuery={typeof q.q === "string" ? q.q.slice(0, 100) : ""} initialMode={mode} initialStatus={status} initialSort={sort} />
      </main>
    </PublicShell>
  );
}

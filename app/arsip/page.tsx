import {
  Breadcrumb,
  EmptyEvents,
  EventCard,
  PublicShell,
} from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { LockKeyhole, ArrowRight } from "lucide-react";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const q = await searchParams;
  const { events } = await publicEvents();
  const finished = events
    .filter(
      (e) =>
        e.status === "finished" &&
        (q.mode === "solo" || q.mode === "squad" ? e.mode === q.mode : true),
    )
    .sort((a, b) => (b.finishedAt || b.eventDate || "").localeCompare(a.finishedAt || a.eventDate || ""));
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1260px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Arsip Galatama" />
        <div className="mb-7 text-[11px] font-black tracking-widest text-blue-600">
          TOURNAMENT HISTORY
        </div>
        <h1 className="text-3xl font-black text-[#142A55] sm:text-4xl">
          Galatama Archives
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Kenang hasil akhir dan para juara dari seluruh edisi.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800"><LockKeyhole size={16} /> {finished.length} turnamen selesai • skor dan hasil final dikunci</div>
        <div className="my-7 flex flex-wrap gap-2">
          {[
            { label: "Semua", value: "" },
            { label: "SOLO", value: "solo" },
            { label: "SQUAD", value: "squad" },
          ].map((f) => (
            <a
              key={f.value}
              className={`rounded-xl px-4 py-2 text-xs font-black ${(!q.mode && !f.value) || q.mode === f.value ? "bg-blue-600 text-white" : "border border-blue-100 bg-white text-slate-600"}`}
              href={f.value ? `/arsip?mode=${f.value}` : "/arsip"}
            >
              {f.label}
            </a>
          ))}
        </div>
        {finished.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {finished.map((e, i) => (
              <div key={e.id} className="min-w-0 space-y-2">
                <EventCard event={e} index={i} />
                <Link href={`/turnamen/${encodeURIComponent(e.id)}/hasil`} className="inline-flex items-center gap-2 px-1 text-xs font-bold text-blue-600 hover:underline">
                  Lihat Hasil Final <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <EmptyEvents type="arsip Galatama" />
        )}
      </main>
    </PublicShell>
  );
}

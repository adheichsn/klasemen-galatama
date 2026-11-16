import Link from "next/link";
import { Crown, Medal, Trophy } from "lucide-react";
import { Breadcrumb, PublicShell, dateLabel } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { standings, fmt } from "@/lib/arena-utils";
export const dynamic = "force-dynamic";
export default async function HallOfFame() {
  const { events } = await publicEvents();
  const completed = events
    .filter((e) => e.status === "finished")
    .sort((a, b) => (b.finishedAt || "").localeCompare(a.finishedAt || ""));
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1050px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Hall of Fame" />
        <div className="mb-9 rounded-3xl bg-gradient-to-r from-[#162d70] to-[#2866dc] p-8 text-white sm:p-11">
          <Crown size={36} className="mb-4 text-amber-300" />
          <p className="text-xs font-bold tracking-widest text-blue-200">
            THE LEGENDS OF WEJI ARENA
          </p>
          <h1 className="mt-2 text-4xl font-black">Hall of Fame</h1>
          <p className="mt-3 text-sm text-blue-100">
            Papan kehormatan para juara dari turnamen yang telah selesai.
          </p>
        </div>
        <div className="grid gap-5">
          {completed.map((e) => (
            <section
              key={e.id}
              className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-7"
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-1 text-[10px] font-black text-blue-600">
                    {e.mode.toUpperCase()} • {dateLabel(e.eventDate)}
                  </div>
                  <h2 className="text-lg font-black text-[#142A55]">
                    {e.title}
                  </h2>
                </div>
                <Link
                  href={`/turnamen/${encodeURIComponent(e.id)}`}
                  className="text-xs font-bold text-blue-600"
                >
                  Lihat Klasemen →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {standings(e)
                  .slice(0, 3)
                  .map((r, i) => (
                    <div key={r.id} className="rounded-xl bg-blue-50 p-4">
                      <div className="mb-2 flex items-center gap-2 text-xs font-bold text-blue-700">
                        <Medal size={16} />
                        {["Juara 1", "Juara 2", "Juara 3"][i]}
                      </div>
                      <b className="block truncate text-base text-[#142A55]">
                        {r.name}
                      </b>
                      <span className="mt-1 block text-xs text-slate-500">
                        {fmt(r.points)} PTS
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          ))}
          {!completed.length && (
            <div className="rounded-3xl bg-white p-12 text-center">
              <Trophy className="mx-auto mb-4 text-blue-400" size={38} />
              <h2 className="font-black text-[#142A55]">
                Belum ada juara yang diumumkan
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Pemenang dari turnamen selesai akan tercatat di sini.
              </p>
            </div>
          )}
        </div>
      </main>
    </PublicShell>
  );
}

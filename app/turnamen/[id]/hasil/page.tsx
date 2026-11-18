import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  Crown,
  Fish,
  LockKeyhole,
  Medal,
  Trophy,
  Users,
} from "lucide-react";
import { Breadcrumb, PublicShell, dateLabel } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { fmt } from "@/lib/arena-utils";
import { normalizedRobloxUsername, resultRows } from "@/lib/tournament-results";

export const dynamic = "force-dynamic";
export default async function FinalResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Use published and non-trashed events only: a direct URL cannot reveal a
  // draft, hidden, or deleted tournament, even when the ID is known.
  const { events } = await publicEvents();
  const event = events.find((e) => e.id === id && e.status === "finished");
  if (!event) notFound();
  const rows = resultRows(event);
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Hasil Akhir" />
        <section className="mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#10265b] via-[#1d49ab] to-[#377feb] p-7 text-white sm:p-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold">
            <LockKeyhole size={14} /> HASIL FINAL TERKUNCI
          </span>
          <h1 className="mt-5 text-3xl font-black sm:text-4xl">
            {event.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-blue-100">
            Klasemen akhir resmi • {event.mode.toUpperCase()} •{" "}
            {event.location || "Semua pulau"} • {dateLabel(event.eventDate)}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700"
              href={`/turnamen/${encodeURIComponent(id)}`}
            >
              <ArrowLeft size={15} /> Detail Event
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-4 py-2.5 text-xs font-bold text-white"
              href={`/turnamen/${encodeURIComponent(id)}/statistik`}
            >
              <ChartNoAxesCombined size={15} /> Statistik
            </Link>
          </div>
        </section>
        <div className="mb-7 grid gap-3 sm:grid-cols-3">
          {rows.slice(0, 3).map((row, i) => (
            <div
              key={row.id}
              className={`rounded-2xl border p-5 ${i === 0 ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-white"}`}
            >
              <div className="mb-3 flex items-center gap-2 text-xs font-black text-blue-800">
                {i === 0 ? (
                  <Crown size={20} className="text-amber-500" />
                ) : (
                  <Medal size={20} className="text-blue-500" />
                )}{" "}
                Juara {i + 1}
              </div>
              <h2 className="break-words text-lg font-black text-[#142A55]">
                {row.name}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {event.mode === "solo"
                  ? row.username
                    ? `@${row.username.replace(/^@/, "")}`
                    : "Peserta individu"
                  : `${row.players} anggota squad`}
              </p>
              <div className="mt-4 text-2xl font-black text-blue-700">
                {fmt(row.points)} <span className="text-xs">PTS</span>
              </div>
            </div>
          ))}
        </div>
        <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 px-5 py-5 sm:px-7">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-black text-[#142A55]">
                <Trophy size={20} className="text-blue-600" /> Klasemen Final
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {event.mode === "solo"
                  ? "Peringkat individu"
                  : "Peringkat squad dan kontribusi anggota"}{" "}
                • {rows.length} peserta/tim
              </p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
              {event.mode.toUpperCase()}
            </span>
          </div>
          {rows.length ? (
            <div className="divide-y divide-blue-50">
              {rows.map((row) => {
                const profile =
                  event.mode === "solo"
                    ? normalizedRobloxUsername(row.username)
                    : null;
                return (
                  <div key={row.id} className="px-5 py-4 sm:px-7">
                    <div className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black ${row.rank <= 3 ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700"}`}
                      >
                        {row.rank}
                      </span>
                      <div className="min-w-0">
                        <div className="break-words font-extrabold text-[#142A55]">
                          {row.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                          <span>
                            <Fish size={12} className="mr-1 inline" />
                            {fmt(row.catches)} Secret
                          </span>
                          <span>•</span>
                          <span>{row.subtitle}</span>
                          {profile && (
                            <Link
                              href={`/pemain/${encodeURIComponent(profile)}`}
                              className="font-bold text-blue-600 hover:underline"
                            >
                              Riwayat pemain
                            </Link>
                          )}
                        </div>
                      </div>
                      <strong className="whitespace-nowrap text-sm text-blue-700">
                        {fmt(row.points)} PTS
                      </strong>
                    </div>
                    {event.mode === "squad" && row.members.length > 0 && (
                      <details className="ml-12 mt-3 rounded-xl bg-slate-50 p-3">
                        <summary className="cursor-pointer text-xs font-bold text-blue-700">
                          <Users size={14} className="mr-1 inline" /> Lihat
                          kontribusi {row.members.length} anggota
                        </summary>
                        <div className="mt-2 divide-y divide-slate-200">
                          {row.members.map((m) => (
                            <div
                              key={m.id}
                              className="flex justify-between gap-3 py-2 text-xs"
                            >
                              <span className="min-w-0 break-words text-slate-600">
                                {m.name}{" "}
                                {m.username && (
                                  <span className="text-slate-400">
                                    (@{m.username.replace(/^@/, "")})
                                  </span>
                                )}
                              </span>
                              <b className="shrink-0">{fmt(m.points)} PTS</b>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-10 text-center text-sm text-slate-500">
              Tidak ada peringkat tercatat pada event ini.
            </p>
          )}
        </section>
        <p className="mt-5 text-xs leading-6 text-slate-500">
          Hasil ini menggunakan skor dan aturan tie-breaker yang tersimpan pada
          edisi tersebut. Kontribusi squad mengikuti squad saat transaksi
          dicatat (untuk transaksi lama tanpa snapshot digunakan roster yang
          tersedia). Poin dari turnamen yang berbeda tidak digabung.
        </p>
      </main>
    </PublicShell>
  );
}

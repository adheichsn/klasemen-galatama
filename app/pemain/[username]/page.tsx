import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, Medal, Trophy, UserRound } from "lucide-react";
import { PublicShell, Breadcrumb, dateLabel } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { fmt } from "@/lib/arena-utils";
import {
  normalizedRobloxUsername,
  playerHistory,
} from "@/lib/tournament-results";

export const dynamic = "force-dynamic";
export default async function PlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = normalizedRobloxUsername(raw);
  if (!username) notFound();
  const { events } = await publicEvents();
  const history = playerHistory(events, username);
  if (!history.length) notFound();
  const victories = history.filter((x) => x.row.rank === 1).length;
  const podiums = history.filter((x) => x.row.rank <= 3).length;
  const name = history[0].row.name;
  return (
    <PublicShell>
      <main className="mx-auto max-w-[1030px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Riwayat Pemain" />
        <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#132b68] to-[#2c6be3] p-7 text-white sm:p-10">
          <UserRound size={32} className="mb-4 text-blue-200" />
          <p className="text-xs font-extrabold tracking-widest text-blue-200">
            WEJI ARENA • SOLO PLAYER HISTORY
          </p>
          <h1 className="mt-2 break-words text-3xl font-black">{name}</h1>
          <p className="mt-2 text-sm text-blue-100">
            @{username} • hasil turnamen SOLO yang sudah final dan
            dipublikasikan
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {[
              { n: history.length, label: "Edisi" },
              { n: victories, label: "Gelar Juara" },
              { n: podiums, label: "Podium" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-white/10 p-3">
                <b className="block text-2xl">{m.n}</b>
                <span className="text-xs text-blue-100">{m.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-7">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-[#142A55]">
            <Trophy className="text-blue-600" size={21} /> Riwayat Turnamen
          </h2>
          <div className="divide-y divide-blue-100">
            {history.map(({ event, row }) => (
              <article
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-4 py-5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-black text-blue-600">
                    {row.rank === 1 ? (
                      <Crown size={16} />
                    ) : row.rank <= 3 ? (
                      <Medal size={16} />
                    ) : (
                      <UserRound size={16} />
                    )}{" "}
                    Peringkat #{row.rank}
                  </div>
                  <h3 className="mt-2 break-words text-sm font-extrabold text-[#142A55]">
                    {event.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {event.location || "Semua pulau"} •{" "}
                    {dateLabel(event.eventDate)} • {fmt(row.catches)} Secret
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <b className="text-sm text-blue-700">{fmt(row.points)} PTS</b>
                  <Link
                    href={`/turnamen/${encodeURIComponent(event.id)}/hasil`}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Lihat Hasil
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <p className="mt-5 text-xs leading-6 text-slate-500">
          Riwayat ini dikelompokkan berdasarkan username Roblox yang dimasukkan
          panitia (tidak diverifikasi melalui Roblox). Nama tampilan bisa
          berbeda antarevent; squad tidak dicampur dengan profil SOLO. Tidak ada
          penjumlahan poin lintas turnamen.
        </p>
        <Link
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-blue-600"
          href="/hall-of-fame"
        >
          <ArrowLeft size={16} /> Kembali ke Hall of Fame
        </Link>
      </main>
    </PublicShell>
  );
}

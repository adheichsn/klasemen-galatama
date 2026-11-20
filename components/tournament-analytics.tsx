import { avatarTarget } from "@/lib/avatar-identity";
import { PlayerIdentity } from "@/components/player-avatar";
import {
  Activity,
  ChartNoAxesCombined,
  Fish,
  Medal,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { fmt } from "@/lib/arena-utils";
import { tournamentAnalytics } from "@/lib/tournament-analytics";

const decimal = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

function Metric({
  icon: Icon,
  name,
  value,
  help,
}: {
  icon: typeof Fish;
  name: string;
  value: string;
  help: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span>{name}</span>
        <Icon size={18} className="shrink-0 text-blue-600" aria-hidden />
      </div>
      <div className="text-2xl font-black tracking-tight text-[#142A55] sm:text-3xl">
        {value}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{help}</p>
    </div>
  );
}

function Meter({ value, max }: { value: number; max: number }) {
  const percent =
    max > 0 ? Math.max(0, Math.min(100, (Math.max(0, value) / max) * 100)) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-blue-50" aria-hidden>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#2563eb] to-[#38bdf8]"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Empty() {
  return (
    <p className="rounded-xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
      Belum ada tangkapan valid yang bisa dianalisis.
    </p>
  );
}

/** Read-only analytics for one event, shared by public and panitia. */
export function TournamentAnalytics({ event }: { event: ArenaEvent }) {
  const data = tournamentAnalytics(event);
  const fishMaximum = Math.max(0, ...data.fish.map((item) => item.catches));
  const bonusMaximum = Math.max(0, ...data.bonuses.map((item) => item.catches));
  const topPoint = Math.max(0, ...data.contributors.map((item) => item.points));
  return (
    <div className="space-y-6" data-testid="weji-tournament-analytics">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Fish}
          name="Secret tertangkap"
          value={fmt(data.validCatches)}
          help={`${fmt(data.catchRecords)} input tangkapan valid`}
        />
        <Metric
          icon={Trophy}
          name="Poin klasemen"
          value={fmt(data.netPoints)}
          help="Termasuk koreksi dan pembatalan"
        />
        <Metric
          icon={Users}
          name={event.mode === "solo" ? "Peserta SOLO" : "Peserta / Squad"}
          value={
            event.mode === "solo"
              ? fmt(data.participantCount)
              : `${fmt(data.participantCount)} / ${fmt(data.squadCount)}`
          }
          help={
            event.mode === "solo" ? "Peringkat per pemain" : "Peringkat per tim"
          }
        />
        <Metric
          icon={Target}
          name="Rata-rata poin/ikan"
          value={decimal(data.averagePerCatch)}
          help="Dari tangkapan valid, termasuk bonus"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-[#142A55]">
            <Fish className="text-blue-600" size={21} /> Distribusi Jenis Ikan
          </h2>
          <p className="mb-5 text-xs leading-5 text-slate-500">
            Jumlah Secret serta poin dari setiap jenis ikan. Poin sudah mencakup
            bonus saat dicatat.
          </p>
          {data.fish.length ? (
            <div className="space-y-4">
              {data.fish.map((item) => (
                <div key={item.id}>
                  <div className="mb-2 flex items-start justify-between gap-3 text-xs">
                    <b className="break-words text-[#142A55]">{item.name}</b>
                    <span className="shrink-0 font-bold text-blue-700">
                      {fmt(item.catches)} ikan · {fmt(item.points)} PTS
                    </span>
                  </div>
                  <Meter value={item.catches} max={fishMaximum} />
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-black text-[#142A55]">
            <Sparkles className="text-blue-600" size={21} /> Distribusi Bonus
          </h2>
          <p className="mb-5 text-xs leading-5 text-slate-500">
            Jumlah ikan yang menerima setiap bonus, termasuk kombinasi. Satu
            ikan dapat tercatat di beberapa bonus.
          </p>
          {data.bonuses.length ? (
            <div className="space-y-4">
              {data.bonuses.map((item) => (
                <div key={item.id}>
                  <div className="mb-2 flex items-start justify-between gap-3 text-xs">
                    <b className="break-words text-[#142A55]">{item.name}</b>
                    <span className="shrink-0 font-bold text-blue-700">
                      {fmt(item.catches)} ikan ·{" "}
                      {item.awardedPoints > 0 ? "+" : ""}
                      {fmt(item.awardedPoints)} PTS
                    </span>
                  </div>
                  <Meter value={item.catches} max={bonusMaximum} />
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-black text-[#142A55]">
              <ChartNoAxesCombined className="text-blue-600" size={21} />{" "}
              Performa {event.mode === "solo" ? "Peserta" : "Anggota Squad"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Kontribusi poin bersih per pemain, termasuk koreksi dan pembatalan
              yang tercatat.
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold text-blue-700">
            {event.mode.toUpperCase()}
          </span>
        </div>
        {data.contributors.length ? (
          <div className="space-y-4">
            {data.contributors.map((p, i) => (
              <div
                key={p.id}
                className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-black text-blue-600">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                    <PlayerIdentity target={avatarTarget(event, p.id)} name={p.name} size="sm" />
                    {event.mode === "squad" && (
                      <span className="text-[10px] text-slate-500">
                        {p.squad || "Tanpa Squad"}
                      </span>
                    )}
                  </div>
                  <div className="my-2">
                    <Meter value={p.points} max={topPoint} />
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {fmt(p.catches)} Secret
                  </span>
                </div>
                <b className="text-xs text-blue-700">{fmt(p.points)} PTS</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Belum ada peserta terdaftar.</p>
        )}
      </section>

      {event.mode === "squad" && (
        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#142A55]">
            <Medal className="text-blue-600" size={21} /> Rekap Squad
          </h2>
          {data.squads.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.squads.map((squad, i) => (
                <div
                  key={squad.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <b className="text-sm text-[#142A55]">
                      #{i + 1} {squad.name}
                    </b>
                    <span className="text-sm font-black text-blue-700">
                      {fmt(squad.points)} PTS
                    </span>
                  </div>
                  <div className="mb-3 text-[11px] text-slate-500">
                    {fmt(squad.memberCount)} anggota · {fmt(squad.catches)}{" "}
                    Secret
                  </div>
                  {squad.contributors.map((person) => (
                    <div
                      key={person.id}
                      className="flex justify-between gap-3 border-t border-slate-200 py-2 text-xs"
                    >
                      <PlayerIdentity target={avatarTarget(event, person.id)} name={person.name} size="sm" />
                      <b className="shrink-0 text-[#142A55]">
                        {fmt(person.points)} PTS
                      </b>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Belum ada squad terdaftar.</p>
          )}
        </section>
      )}

      <section className="grid gap-3 rounded-2xl border border-blue-100 bg-[#eff6ff] p-5 sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <Activity size={18} className="shrink-0 text-blue-600" />
          <div>
            <div className="text-xs text-slate-500">Poin tangkapan</div>
            <b className="text-lg text-[#142A55]">
              {fmt(data.catchPoints)} PTS
            </b>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Target size={18} className="shrink-0 text-blue-600" />
          <div>
            <div className="text-xs text-slate-500">
              Koreksi manual (bersih)
            </div>
            <b className="text-lg text-[#142A55]">
              {fmt(data.adjustmentPoints)} PTS
            </b>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <RotateCcw size={18} className="shrink-0 text-blue-600" />
          <div>
            <div className="text-xs text-slate-500">Tangkapan dibatalkan</div>
            <b className="text-lg text-[#142A55]">
              {fmt(data.reversedCatches)} ikan
            </b>
          </div>
        </div>
      </section>
      <p className="text-xs leading-6 text-slate-500">
        Statistik dihitung dari transaksi pada turnamen ini, bukan perkiraan
        katalog. Tangkapan yang dibatalkan dikeluarkan dari distribusi ikan dan
        bonus. Perubahan aturan setelah tangkapan tidak mengubah nilai historis.
        Poin total termasuk koreksi manual; data lama tanpa snapshot nama ikan
        dikelompokkan sebagai ikan lama.
      </p>
    </div>
  );
}

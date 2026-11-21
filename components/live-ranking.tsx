"use client";
import { rankAvatarTargets } from "@/lib/avatar-identity";
import { RankIdentity } from "@/components/player-avatar";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowDownRight, ArrowUpRight, Minus, Trophy } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { fmt, standings } from "@/lib/arena-utils";

type RankChange = { position: number; points: number };
type RankSnapshot = Record<string, RankChange>;

export function LiveRanking({
  event,
  max,
}: {
  event: ArenaEvent;
  max?: number;
}) {
  const ranking = useMemo(() => standings(event), [event]);
  const signature = ranking
    .map((r) => `${r.id}:${r.points}:${r.catches}`)
    .join("|");
  const [changes, setChanges] = useState<RankSnapshot>({});
  const [hadPrevious, setHadPrevious] = useState(false);
  useEffect(() => {
    // Session-only comparison: no extra APIs, account data, or shared server state.
    const key = `weji-live-ranking:${event.id}`;
    const next: RankSnapshot = Object.fromEntries(
      ranking.map((r, i) => [r.id, { position: i + 1, points: r.points }]),
    );
    try {
      const stored = sessionStorage.getItem(key);
      const previous: RankSnapshot = stored ? JSON.parse(stored) : {};
      const exists = !!stored;
      setHadPrevious(exists);
      setChanges(exists ? previous : {});
      sessionStorage.setItem(key, JSON.stringify(next));
    } catch {
      setChanges({});
      setHadPrevious(false);
    }
    // Rank signature tracks score or position changes after Next router.refresh().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, signature]);
  const rows = typeof max === "number" ? ranking.slice(0, max) : ranking;
  return (
    <section
      className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_10px_40px_rgba(32,77,150,.05)]"
      aria-label={`Klasemen LIVE ${event.mode.toUpperCase()}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100 px-4 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-base font-black text-[#142A55]">
          <Trophy size={20} className="text-blue-600" /> Live Leaderboard •{" "}
          {event.mode.toUpperCase()}
        </h2>
        <span className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />{" "}
          LIVE • {ranking.length}{" "}
          {event.mode === "solo"
            ? "Peserta"
            : event.mode === "duo"
              ? "Pasangan"
              : "Squad"}
        </span>
      </div>
      {ranking.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-b border-blue-100 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-3 sm:gap-3 sm:p-5">
          {[1, 0, 2].map((rankIndex) => {
            const r = ranking[rankIndex];
            return (
              <div
                key={rankIndex}
                className={`min-w-0 rounded-xl border p-3 text-center sm:p-4 ${rankIndex === 0 ? "border-amber-200 bg-amber-50" : "border-blue-100 bg-white"}`}
              >
                <span
                  className={`mb-2 inline-flex size-8 items-center justify-center rounded-full text-xs font-black ${rankIndex === 0 ? "bg-amber-400 text-amber-950" : "bg-blue-100 text-blue-700"}`}
                >
                  {rankIndex + 1}
                </span>
                {r ? (
                  <RankIdentity
                    targets={rankAvatarTargets(event, r.id)}
                    name={r.name}
                    subtitle={r.subtitle}
                    team={event.mode !== "solo"}
                    centered
                    size="lg"
                  />
                ) : (
                  <p className="text-xs text-slate-500">—</p>
                )}
                <div className="mt-1 text-xs font-black tabular-nums text-blue-700">
                  {r ? fmt(r.points) : "—"} PTS
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px] text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 sm:px-6">Rank</th>
              <th className="px-3 py-3">
                {event.mode === "solo"
                  ? "Pemain"
                  : event.mode === "duo"
                    ? "Pasangan"
                    : "Squad"}
              </th>
              <th className="px-3 py-3">Tangkapan</th>
              <th className="px-4 py-3 text-right sm:px-6">Poin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const prev = changes[r.id];
              const change = hadPrevious && prev ? prev.position - (i + 1) : 0;
              const pointDiff =
                hadPrevious && prev ? r.points - prev.points : 0;
              return (
                <motion.tr
                  layout
                  key={r.id}
                  initial={{ opacity: 0.8, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28 }}
                  className="border-t border-slate-100 text-sm"
                >
                  <td className="px-4 py-3 sm:px-6">
                    <span className="inline-flex items-center gap-2 font-black text-[#142A55]">
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg ${i === 0 ? "bg-amber-100 text-amber-800" : i === 1 ? "bg-slate-100 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-700"}`}
                      >
                        {i + 1}
                      </span>
                      {change > 0 ? (
                        <span
                          title={`Naik ${change} peringkat`}
                          className="inline-flex items-center text-xs text-emerald-600"
                        >
                          <ArrowUpRight size={15} />
                          {change}
                        </span>
                      ) : change < 0 ? (
                        <span
                          title={`Turun ${-change} peringkat`}
                          className="inline-flex items-center text-xs text-rose-600"
                        >
                          <ArrowDownRight size={15} />
                          {-change}
                        </span>
                      ) : (
                        <Minus size={12} className="text-slate-300" />
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <RankIdentity
                      targets={rankAvatarTargets(event, r.id)}
                      name={r.name}
                      subtitle={r.subtitle}
                      team={event.mode !== "solo"}
                    />
                  </td>
                  <td className="px-3 py-3 tabular-nums text-slate-500">
                    {fmt(r.catches)}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <strong className="block font-black tabular-nums text-blue-700">
                      {fmt(r.points)} PTS
                    </strong>
                    {pointDiff !== 0 && (
                      <span
                        className={`text-[10px] font-bold tabular-nums ${pointDiff > 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {pointDiff > 0 ? "+" : ""}
                        {fmt(pointDiff)} sejak update
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && (
          <p className="p-8 text-center text-sm text-slate-500">
            Belum ada peserta terdaftar.
          </p>
        )}
      </div>
    </section>
  );
}

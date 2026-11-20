"use client";
import { avatarTarget } from "@/lib/avatar-identity";
import { PlayerIdentity } from "@/components/player-avatar";

import { motion } from "motion/react";
import { Activity, Fish, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ArenaEvent } from "@/lib/arena-types";
import { recentPublicActivity } from "@/lib/live-activity";
import { fmt } from "@/lib/arena-utils";

export function LiveActivityFeed({
  event,
  max = 8,
}: {
  event: ArenaEvent;
  max?: number;
}) {
  const rows = recentPublicActivity(event, max);
  return (
    <section
      className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm"
      aria-label="Aktivitas skor pertandingan"
    >
      <div className="flex items-center justify-between border-b border-blue-100 px-4 py-4 sm:px-5">
        <h2 className="flex items-center gap-2 font-black text-[#142A55]">
          <Activity size={19} className="text-blue-600" /> Live Activity
        </h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-bold text-blue-600">
          {rows.length} aktivitas terbaru
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-9 text-center text-sm text-slate-500">
          Belum ada tangkapan atau perubahan poin.
        </p>
      ) : (
        <ol className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
          {rows.map((row) => {
            const Icon =
              row.action === "catch"
                ? Fish
                : row.action === "reversal"
                  ? RotateCcw
                  : SlidersHorizontal;
            return (
              <motion.li
                key={row.id}
                layout
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <PlayerIdentity target={avatarTarget(event, row.participantId)} name={row.name} size="sm" />
                  {row.squad && <p className="break-words text-xs font-medium text-slate-500">{row.squad}</p>}
                  <p className="mt-1 break-words text-xs text-slate-500">
                    {row.detail}
                  </p>
                  <time
                    className="mt-1 block text-[10px] text-slate-400"
                    dateTime={row.at}
                  >
                    {Number.isFinite(Date.parse(row.at))
                      ? new Date(row.at).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          timeZone: "Asia/Jakarta",
                        }) + " WIB"
                      : "—"}
                  </time>
                </div>
                <strong
                  className={`whitespace-nowrap text-xs font-black tabular-nums sm:text-sm ${row.points < 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {row.points > 0 ? "+" : ""}
                  {fmt(row.points)} PTS
                </strong>
              </motion.li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

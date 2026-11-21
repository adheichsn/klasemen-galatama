import { Crown, Medal } from "lucide-react";
import { PlayerIdentity } from "@/components/player-avatar";
import { avatarTarget } from "@/lib/avatar-identity";
import type { ArenaEvent } from "@/lib/arena-types";
import { fmt } from "@/lib/arena-utils";
import { resultRows } from "@/lib/tournament-results";

const colors = [
  "border-amber-200 bg-amber-50 text-amber-800",
  "border-slate-200 bg-slate-50 text-slate-700",
  "border-orange-200 bg-orange-50 text-orange-800",
];
/** Uses official result order. Team members remain individually accessible, including >4 members. */
export function ChampionshipPodium({
  event,
  compact = false,
}: {
  event: ArenaEvent;
  compact?: boolean;
}) {
  const rows = resultRows(event).slice(0, 3);
  if (!rows.length)
    return (
      <p className="py-4 text-sm text-slate-500">
        Belum ada peringkat tercatat.
      </p>
    );
  return (
    <div
      className={compact ? "space-y-2" : "grid items-end gap-3 lg:grid-cols-3"}
    >
      {rows.map((row) => {
        const rank = row.rank;
        const members =
          event.mode === "solo"
            ? [
                {
                  id: row.id,
                  name: row.name,
                  username: row.username,
                  points: row.points,
                  catches: row.catches,
                },
              ]
            : row.members;
        const Icon = rank === 1 ? Crown : Medal;
        const order = !compact
          ? rank === 1
            ? "lg:order-2"
            : rank === 2
              ? "lg:order-1"
              : "lg:order-3"
          : "";
        return (
          <article
            key={row.id}
            className={`min-w-0 rounded-2xl border ${colors[rank - 1]} ${order} ${compact ? "p-3" : "weji-podium-card p-4 sm:p-5 motion-safe:transition-transform motion-safe:hover:-translate-y-1"}`}
          >
            <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs font-black">
              <span className="flex items-center gap-2">
                <Icon size={18} /> Juara {rank}
              </span>
              <span>{fmt(row.points)} PTS</span>
            </header>
            {event.mode !== "solo" && (
              <h3 className="mb-3 break-words font-black text-[#142A55]">
                {row.name}
              </h3>
            )}
            <div
              className={`grid gap-2 ${!compact && event.mode !== "solo" ? "grid-cols-2" : "grid-cols-1"}`}
            >
              {members.map((member) => (
                <div
                  key={member.id}
                  className="min-w-0 rounded-xl bg-white/65 p-2"
                >
                  <PlayerIdentity
                    target={avatarTarget(event, member.id)}
                    name={member.name}
                    subtitle={
                      member.username
                        ? `@${member.username.replace(/^@/, "")}`
                        : undefined
                    }
                    size={compact ? "sm" : event.mode === "solo" ? "lg" : "md"}
                    centered={!compact}
                  />
                  {event.mode !== "solo" && (
                    <p
                      className={`mt-2 text-[11px] font-semibold ${compact ? "" : "text-center"}`}
                    >
                      {fmt(member.points)} PTS · {fmt(member.catches)} Secret
                    </p>
                  )}
                  {event.mode !== "solo" &&
                    event.participants.find((p) => p.id === member.id)
                      ?.squadId !== row.id && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Kontributor historis, bukan roster final
                      </p>
                    )}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs font-medium">
              {fmt(row.catches)} Secret tercatat
              {event.mode !== "solo"
                ? ` · ${members.length} anggota tercatat`
                : ""}
            </p>
            {!compact && (
              <div
                aria-hidden="true"
                className={`mt-3 hidden rounded-xl bg-current/10 lg:block ${rank === 1 ? "h-12" : rank === 2 ? "h-8" : "h-4"}`}
              />
            )}
          </article>
        );
      })}
    </div>
  );
}

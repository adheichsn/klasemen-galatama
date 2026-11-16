import { Check, CircleAlert, ClipboardCheck } from "lucide-react";
import type { ArenaEvent, EditorSection } from "@/lib/arena-types";
import { tournamentReadiness } from "@/lib/tournament-readiness";

export const builderSteps: { id: EditorSection; text: string }[] = [
  { id: "general", text: "Informasi" },
  { id: "marketing", text: "Banner" },
  { id: "fish", text: "Ikan" },
  { id: "bonuses", text: "Bonus" },
  { id: "rules", text: "Rules" },
  { id: "participants", text: "Peserta" },
  { id: "faq", text: "FAQ" },
];

export function BuilderProgress({
  event,
  active,
  onNavigate,
}: {
  event: ArenaEvent;
  active: EditorSection;
  onNavigate: (section: EditorSection) => void;
}) {
  const ready = tournamentReadiness(event);
  return (
    <div className="rounded-[20px] border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-extrabold text-[#142A55]">
            <ClipboardCheck size={17} className="text-blue-600" /> Progres
            Konfigurasi
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {ready.canStart
              ? "Katalog dan roster sudah siap untuk LIVE."
              : "Minimal ada ikan aktif dan peserta yang valid untuk memulai."}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">
          {ready.completed}/7 bagian terisi
        </span>
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label="Bagian pengaturan yang terisi"
        aria-valuenow={ready.completed}
        aria-valuemin={0}
        aria-valuemax={7}
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-[width] duration-300"
          style={{ width: `${(ready.completed / 7) * 100}%` }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {builderSteps.map((step, i) => (
          <button
            type="button"
            key={step.id}
            onClick={() => onNavigate(step.id)}
            aria-current={step.id === active ? "step" : undefined}
            className={`flex items-center justify-between gap-1.5 rounded-xl border px-3 py-2 text-left text-[11px] font-bold transition-colors ${active === step.id ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50"}`}
          >
            <span>
              {i + 1}. {step.text}
            </span>
            {ready.sections[step.id] ? (
              <Check size={14} className="shrink-0 text-emerald-600" />
            ) : (
              <CircleAlert size={13} className="shrink-0 text-slate-300" />
            )}
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-slate-400">
        Banner, bonus, rules, dan FAQ boleh dikosongkan sesuai kebutuhan
        turnamen.
      </p>
    </div>
  );
}

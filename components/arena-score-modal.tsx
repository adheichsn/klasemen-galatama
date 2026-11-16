"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  Fish,
  MinusCircle,
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";
import type { ArenaStore } from "@/hooks/use-arena";
import { fmt } from "@/lib/arena-utils";
import { calculateCatch } from "@/lib/arena-rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const inputStyle =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const labelStyle = "block text-xs font-bold text-slate-600";
const actionStyle =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-45";

export default function ScoreModal({
  store,
  onClose,
}: {
  store: ArenaStore;
  onClose: () => void;
}) {
  const e = store.active;
  const [squad, setSquad] = useState("");
  const [player, setPlayer] = useState("");
  const [playerQuery, setPlayerQuery] = useState("");
  const [fish, setFish] = useState("");
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [qty, setQty] = useState("1");
  const [kind, setKind] = useState<"catch" | "manual">("catch");
  const [manual, setManual] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const quantity = Number(qty);
  const calculated = calculateCatch(e, fish, bonuses, quantity);
  const activeBonuses = e.bonuses.filter((bonus) => bonus.enabled);
  const chosen = e.fish.find((f) => f.id === fish);
  const activeEntries = e.participants
    .filter((p) => e.mode === "solo" || p.squadId === squad)
    .filter((p) =>
      `${p.name} ${p.username}`.toLocaleLowerCase("id-ID").includes(playerQuery.trim().toLocaleLowerCase("id-ID")),
    )
    .sort((a, b) => Number(b.checkedIn) - Number(a.checkedIn) || a.name.localeCompare(b.name, "id"));
  const manualValid =
    manual.trim() !== "" &&
    Number.isSafeInteger(Number(manual)) &&
    Number(manual) !== 0 &&
    reason.trim() !== "";
  const canSubmit =
    !!player &&
    e.status === "live" &&
    (kind === "catch" ? !!calculated : manualValid);

  const submit = (keepOpen: boolean) => {
    setError("");
    setSavedMessage("");
    if (!canSubmit) {
      setError("Pilih peserta dan lengkapi data. Input hanya tersedia saat turnamen LIVE.");
      return;
    }
    const success = kind === "catch"
      ? store.addCatch(player, fish, bonuses, quantity)
      : store.addManual(player, Number(manual), reason);
    if (!success) {
      setError("Gagal mencatat. Pastikan skor, peserta, dan status event valid.");
      return;
    }
    if (!keepOpen || kind !== "catch") {
      onClose();
      return;
    }
    const playerName = e.participants.find((p) => p.id === player)?.name || "Peserta";
    setSavedMessage(`+${fmt(calculated?.delta ?? 0)} poin untuk ${playerName} tercatat. Tambahkan tangkapan berikutnya.`);
    // Keep selected participant for fast consecutive catches, require a fresh fish selection.
    setFish("");
    setBonuses([]);
    setQty("1");
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="!w-[min(95vw,620px)] !max-w-[620px] !p-0">
        <div className="overflow-hidden rounded-2xl bg-white">
          <header className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5 pr-16 sm:px-7">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold tracking-[.15em] text-blue-600">
              <Fish size={15} /> PANITIA • SCORING
            </div>
            <DialogTitle className="!text-xl font-black tracking-tight text-[#142A55] sm:!text-2xl">
              Input Poin {e.mode.toUpperCase()}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
              {e.mode === "solo"
                ? "Pilih peserta, ikan dan bonus. Poin langsung masuk ke individu."
                : "Pilih squad terlebih dahulu, kemudian anggota yang menangkap. Poin masuk ke klasemen tim."}
            </DialogDescription>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone={e.mode === "solo" ? "blue" : "amber"}>{e.mode.toUpperCase()}</Badge>
              <span className="max-w-full truncate text-xs font-semibold text-slate-500">{e.title}</span>
            </div>
          </header>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Jenis input poin">
              {([
                ["catch", "Tangkapan", Fish],
                ["manual", "Koreksi Manual", PlusCircle],
              ] as const).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => { setKind(value); setError(""); setSavedMessage(""); }}
                  className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-extrabold transition sm:px-4 ${kind === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
            {savedMessage && (
              <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700">
                <CircleCheck size={17} className="shrink-0" /> {savedMessage}
              </div>
            )}
            {e.mode === "squad" && (
              <label className={labelStyle}>
                1. Squad penerima poin
                <select
                  value={squad}
                  onChange={(event) => { setSquad(event.target.value); setPlayer(""); setPlayerQuery(""); }}
                  className={inputStyle}
                >
                  <option value="">Pilih squad</option>
                  {e.squads.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({e.participants.filter((p) => p.squadId === s.id).length} anggota)
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelStyle}>
                {e.mode === "squad" ? "2. Cari nama anggota" : "Cari peserta SOLO"}
                <span className="relative block">
                  <Search size={15} className="pointer-events-none absolute bottom-3.5 left-3.5 text-slate-400" />
                  <input
                    value={playerQuery}
                    disabled={e.mode === "squad" && !squad}
                    onChange={(event) => { setPlayerQuery(event.target.value); setPlayer(""); }}
                    placeholder="Nama atau username Roblox"
                    className={`${inputStyle} pl-9`}
                    aria-label="Cari peserta berdasarkan nama atau username"
                  />
                </span>
              </label>
              <label className={labelStyle}>
                {e.mode === "squad" ? "Pilih anggota squad" : "Pilih peserta"}
                <select
                  value={player}
                  disabled={e.mode === "squad" && !squad}
                  onChange={(event) => setPlayer(event.target.value)}
                  className={inputStyle}
                >
                  <option value="">{e.mode === "squad" && !squad ? "Pilih squad dahulu" : "Pilih pemain"}</option>
                  {activeEntries.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.checkedIn ? "✓ " : ""}{p.name}{p.username ? ` (@${p.username})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {kind === "catch" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(110px,1fr)]">
                  <label className={labelStyle}>
                    Jenis Secret / Ikan
                    <select value={fish} onChange={(event) => setFish(event.target.value)} className={inputStyle}>
                      <option value="">Pilih ikan</option>
                      {e.fish.filter((f) => f.enabled).map((f) => (
                        <option key={f.id} value={f.id}>{f.name} • {fmt(f.points)} PTS</option>
                      ))}
                    </select>
                  </label>
                  <label className={labelStyle}>
                    Jumlah tangkapan
                    <input type="number" min={1} max={99} value={qty} onChange={(event) => setQty(event.target.value)} className={inputStyle} />
                  </label>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-[#f8faff] p-4">
                  <p className="mb-3 flex items-center gap-2 text-xs font-extrabold text-[#42669d]">
                    <Sparkles size={17} /> Bonus poin aktif
                  </p>
                  {activeBonuses.length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {activeBonuses.map((b) => (
                        <label key={b.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${bonuses.includes(b.id) ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}>
                          <input
                            type="checkbox"
                            checked={bonuses.includes(b.id)}
                            className="size-4 accent-blue-600"
                            onChange={(event) => setBonuses((current) => event.target.checked ? [...current, b.id] : current.filter((id) => id !== b.id))}
                          />
                          <span className="min-w-0 flex-1 truncate">{b.name}</span>
                          <b className="text-blue-700">{b.points > 0 ? "+" : ""}{fmt(b.points)}</b>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Bonus tidak aktif pada turnamen ini.</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#112650] p-4 text-white">
                  <div className="min-w-0">
                    <span className="text-[10px] font-extrabold tracking-wider text-blue-200">PRATINJAU PERHITUNGAN</span>
                    <p className="mt-1 text-xs leading-5 text-blue-100">
                      {fmt(chosen?.points ?? 0)} dasar {e.bonuses.filter((b) => b.enabled && bonuses.includes(b.id)).map((b) => `+ (${b.name} ${fmt(b.points)})`).join(" ")} × {Number.isFinite(quantity) ? fmt(quantity) : "—"}
                    </p>
                  </div>
                  <b className="whitespace-nowrap text-2xl font-black sm:text-3xl">{calculated ? fmt(calculated.delta) : "—"} <small className="text-[11px] text-blue-200">PTS</small></b>
                </div>
              </>
            ) : (
              <>
                <label className={labelStyle}>
                  Penyesuaian poin (+ / -)
                  <input type="number" value={manual} placeholder="Contoh: -2 atau 5" onChange={(event) => setManual(event.target.value)} className={inputStyle} />
                </label>
                <label className={labelStyle}>
                  Alasan koreksi (wajib)
                  <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Jelaskan alasan perubahan..." className={inputStyle} />
                </label>
                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                  <MinusCircle size={17} className="mt-0.5 shrink-0" /> Koreksi dicatat sebagai transaksi terpisah. Skor asli tidak dihapus.
                </div>
              </>
            )}
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
            <p className="text-[11px] leading-5 text-amber-700">Setelah input selesai, klik <b>Simpan ke Server</b> di dashboard panitia agar skor tampil untuk publik.</p>
          </div>
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
            <button type="button" className={`${actionStyle} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`} onClick={onClose}>Batal</button>
            {kind === "catch" && (
              <button type="button" disabled={!canSubmit} onClick={() => submit(true)} className={`${actionStyle} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}>
                <PlusCircle size={16} /> Tambah & Lanjut
              </button>
            )}
            <button type="button" disabled={!canSubmit} onClick={() => submit(false)} className={`${actionStyle} bg-blue-600 text-white hover:bg-blue-700`}>
              <Check size={16} /> {kind === "catch" ? "Tambah & Tutup" : "Simpan Koreksi"} <ArrowRight size={15} />
            </button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

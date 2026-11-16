"use client";
import { useState } from "react";
import {
  Check,
  Fish,
  MinusCircle,
  PlusCircle,
  Sparkles,
  X,
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
  const [fish, setFish] = useState("");
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [qty, setQty] = useState("1");
  const [kind, setKind] = useState<"catch" | "manual">("catch");
  const [manual, setManual] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const chosen = e.fish.find((f) => f.id === fish);
  const applied = e.bonuses.filter((b) => b.enabled && bonuses.includes(b.id));
  const quantity = Number(qty);
  const calculated = calculateCatch(e, fish, bonuses, quantity);
  const total = calculated?.delta;
  const submit = () => {
    setError("");
    const success =
      kind === "catch"
        ? store.addCatch(player, fish, bonuses, quantity)
        : store.addManual(player, Number(manual), reason);
    if (success) onClose();
    else
      setError(
        "Lengkapi data yang valid. Event harus LIVE, peserta terdaftar, dan nilai poin harus dalam batas yang diizinkan.",
      );
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="!max-w-[600px] !p-0">
        <div className="modal-card !w-full !max-w-none !border-0 !shadow-none">
          <header className="modal-header !pr-14">
            <div>
              <div className="kicker">PANITIA • SCORING</div>
              <DialogTitle className="text-2xl font-extrabold tracking-tight">
                Input Tangkapan {e.mode.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-slate-500">
                {e.mode === "solo"
                  ? "Poin diberikan langsung kepada pemain."
                  : "Pilih squad dahulu, lalu pencatat tangkapan. Nilai otomatis masuk ke tim."}
              </DialogDescription>
            </div>
          </header>
          <div className="modal-body">
            <div className="segment">
              <button
                className={kind === "catch" ? "active" : ""}
                onClick={() => setKind("catch")}
              >
                <Fish size={16} /> Tangkapan
              </button>
              <button
                className={kind === "manual" ? "active" : ""}
                onClick={() => setKind("manual")}
              >
                <PlusCircle size={16} /> Koreksi manual
              </button>
            </div>
            <div className="mb-4 flex items-center gap-2">
              <Badge tone="blue">
                {e.mode === "solo" ? "INDIVIDU" : "SQUAD / TIM"}
              </Badge>
              <span className="text-xs text-slate-500">{e.title}</span>
            </div>
            {e.mode === "squad" && (
              <label className="field">
                1. Pilih Squad
                <select
                  value={squad}
                  onChange={(ev) => {
                    setSquad(ev.target.value);
                    setPlayer("");
                  }}
                >
                  <option value="">Pilih squad penerima poin</option>
                  {e.squads.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (
                      {e.participants.filter((p) => p.squadId === s.id).length}{" "}
                      anggota)
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              {e.mode === "squad"
                ? "2. Pilih Anggota yang Menangkap"
                : "Pilih Peserta SOLO"}
              <select
                disabled={e.mode === "squad" && !squad}
                value={player}
                onChange={(ev) => setPlayer(ev.target.value)}
              >
                <option value="">
                  {e.mode === "squad" && !squad
                    ? "Pilih squad dahulu"
                    : "Pilih pemain"}
                </option>
                {e.participants
                  .filter((p) => e.mode === "solo" || p.squadId === squad)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.username ? `(@${p.username})` : ""}
                    </option>
                  ))}
              </select>
            </label>
            {kind === "catch" ? (
              <>
                <div className="form-grid">
                  <label className="field">
                    Jenis ikan
                    <select
                      value={fish}
                      onChange={(ev) => setFish(ev.target.value)}
                    >
                      <option value="">Pilih ikan</option>
                      {e.fish
                        .filter((f) => f.enabled)
                        .map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} • {fmt(f.points)} PTS
                          </option>
                        ))}
                    </select>
                  </label>
                  <label className="field">
                    Jumlah tangkapan
                    <input
                      value={qty}
                      onChange={(ev) => setQty(ev.target.value)}
                      type="number"
                      min={1}
                      max={99}
                    />
                  </label>
                </div>
                <div className="bonus-box">
                  <div className="bonus-title">
                    <Sparkles size={17} /> Bonus aktif pada tangkapan
                  </div>
                  {e.bonuses.filter((b) => b.enabled).length ? (
                    <div className="bonus-checks">
                      {e.bonuses
                        .filter((b) => b.enabled)
                        .map((b) => (
                          <label
                            key={b.id}
                            className={`bonus-option ${bonuses.includes(b.id) ? "checked" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={bonuses.includes(b.id)}
                              onChange={(ev) =>
                                setBonuses((prev) =>
                                  ev.target.checked
                                    ? [...prev, b.id]
                                    : prev.filter((id) => id !== b.id),
                                )
                              }
                            />
                            <span>{b.name}</span>
                            <b>
                              {b.points > 0 ? "+" : ""}
                              {b.points}
                            </b>
                          </label>
                        ))}
                    </div>
                  ) : (
                    <p className="hint">
                      Belum ada bonus yang diaktifkan. Kamu bisa menambahkannya
                      melalui Tournament Builder.
                    </p>
                  )}
                </div>
                <div className="score-preview">
                  <div>
                    <span>PERHITUNGAN OTOMATIS</span>
                    <p>
                      {fmt(chosen?.points || 0)} dasar{" "}
                      {applied
                        .map((b) => `+ (${b.name} ${fmt(b.points)})`)
                        .join(" ")}{" "}
                      × {Number.isFinite(quantity) ? fmt(quantity) : "—"}
                    </p>
                  </div>
                  <strong>
                    {total !== undefined ? fmt(total) : "—"} <small>PTS</small>
                  </strong>
                </div>
              </>
            ) : (
              <>
                <label className="field">
                  Penyesuaian poin (+ / -)
                  <input
                    type="number"
                    value={manual}
                    placeholder="Contoh: -2 atau 5"
                    onChange={(ev) => setManual(ev.target.value)}
                  />
                </label>
                <label className="field">
                  Alasan koreksi (wajib)
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(ev) => setReason(ev.target.value)}
                    maxLength={300}
                    placeholder="Jelaskan alasan perubahan agar dapat diaudit..."
                  />
                </label>
                <div className="notice">
                  <MinusCircle size={17} />
                  Koreksi dicatat sebagai transaksi baru dan bisa dibatalkan.
                  Catatan asli tidak dihapus.
                </div>
              </>
            )}
            {error && <div className="notice warning">{error}</div>}
          </div>
          <footer className="modal-footer">
            <button className="btn secondary" onClick={onClose}>
              Batal
            </button>
            <button
              className="btn primary"
              disabled={
                !player ||
                (kind === "catch"
                  ? !calculated
                  : !Number.isSafeInteger(Number(manual)) ||
                    !Number(manual) ||
                    !reason.trim())
              }
              onClick={submit}
            >
              <Check size={16} /> Simpan{" "}
              {kind === "catch" ? "Tangkapan" : "Koreksi"}
            </button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

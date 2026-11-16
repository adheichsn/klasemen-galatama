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
export default function ScoreModal({
  store,
  onClose,
}: {
  store: ArenaStore;
  onClose: () => void;
}) {
  const e = store.active;
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
  const per = (chosen?.points || 0) + applied.reduce((a, b) => a + b.points, 0);
  const total = per * quantity;
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
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Input poin"
        onMouseDown={(ev) => ev.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <div className="kicker">PANITIA • SCORING</div>
            <h2>Catat hasil tangkapan</h2>
            <p>Skor langsung dihitung dari aturan aktif event ini.</p>
          </div>
          <button className="icon-button" onClick={onClose} title="Tutup">
            <X size={20} />
          </button>
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
          <label className="field">
            Peserta
            <select
              value={player}
              onChange={(ev) => setPlayer(ev.target.value)}
            >
              <option value="">Pilih peserta</option>
              {e.participants
                .filter((p) => e.mode === "solo" || !!p.squadId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {e.mode === "squad"
                      ? ` • ${e.squads.find((s) => s.id === p.squadId)?.name || "Tanpa tim"}`
                      : ""}
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
                  {Number.isFinite(total) ? fmt(total) : "—"} <small>PTS</small>
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
                ? !chosen ||
                  !Number.isInteger(quantity) ||
                  quantity < 1 ||
                  quantity > 99
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
    </div>
  );
}

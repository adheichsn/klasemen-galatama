"use client";
import { useState } from "react";
import Dialog from "./dialog";
export default function ManualDialog({
  playerLabel,
  onClose,
  onSubmit,
}: {
  playerLabel: string;
  onClose: () => void;
  onSubmit: (delta: number, reason: string) => void;
}) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const n = Number(delta);
  const valid =
    delta.trim() !== "" &&
    Number.isSafeInteger(n) &&
    n !== 0 &&
    Math.abs(n) <= 1000000;
  return (
    <Dialog
      title="Tambah / Kurangi Poin"
      subtitle={playerLabel}
      onClose={onClose}
    >
      <div className="note">
        Masukkan nilai bebas, misalnya <b>+25</b> untuk bonus atau <b>-7</b>{" "}
        untuk penalti.
      </div>
      <label className="field-label">
        Perubahan poin
        <input
          autoFocus
          className="input-large"
          type="number"
          step="1"
          min="-1000000"
          max="1000000"
          placeholder="Contoh: 25 atau -7"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
        />
      </label>
      <div className="quick-values">
        {[1, 2, 5, 10, 25, -1, -2, -5, -10, -25].map((n) => (
          <button
            className={n > 0 ? "quick-positive" : "quick-negative"}
            key={n}
            onClick={() => setDelta(String(n))}
          >
            {n > 0 ? "+" : ""}
            {n}
          </button>
        ))}
      </div>
      <label className="field-label">
        Alasan / catatan (opsional)
        <input
          placeholder="Misalnya: bonus juri, koreksi input, penalti"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
        />
      </label>
      <div className="dialog-footer">
        <div>
          <small>PERUBAHAN</small>
          <strong className={`large-total ${n < 0 ? "danger-text" : ""}`}>
            {valid ? `${n > 0 ? "+" : ""}${n}` : "0"}
          </strong>
        </div>
        <button
          className="primary-button"
          disabled={!valid}
          onClick={() => {
            onSubmit(n, reason);
            onClose();
          }}
        >
          Simpan Poin
        </button>
      </div>
    </Dialog>
  );
}

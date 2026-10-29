"use client";
import { useState } from "react";
import { Plus, Trash2, SlidersHorizontal } from "lucide-react";
import Dialog from "./dialog";
import type { RuleCategory, ScoringRule } from "@/lib/types";
export default function RulesDialog({
  rules,
  onSave,
  onClose,
}: {
  rules: ScoringRule[];
  onSave: (rules: ScoringRule[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ScoringRule[]>(() =>
    rules.map((r) => ({ ...r })),
  );
  const [pointTexts, setPointTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rules.map((r) => [r.id, String(r.points)])),
  );
  const [name, setName] = useState("");
  const [points, setPoints] = useState("1");
  const [category, setCategory] = useState<RuleCategory>("Tarikan");
  const isValidPoints = (value: string) =>
    /^-?\d+$/.test(value.trim()) &&
    Number.isSafeInteger(Number(value)) &&
    Math.abs(Number(value)) <= 1000000;
  const update = (id: string, fields: Partial<ScoringRule>) =>
    setDraft((p) => p.map((r) => (r.id === id ? { ...r, ...fields } : r)));
  const add = () => {
    const value = Number(points);
    if (!name.trim() || !isValidPoints(points) || draft.length >= 100) return;
    const id = crypto.randomUUID();
    setDraft((p) => [
      ...p,
      {
        id,
        name: name.trim().slice(0, 60),
        points: value,
        category,
        enabled: true,
      },
    ]);
    setPointTexts((p) => ({ ...p, [id]: String(value) }));
    setName("");
    setPoints("1");
  };
  const valid = draft.every(
    (r) => r.name.trim().length > 0 && isValidPoints(pointTexts[r.id] ?? ""),
  );
  return (
    <Dialog
      wide
      title="Aturan Tarikan & Poin"
      subtitle="Buat sendiri daftar penilaian tanpa mengedit source code."
      onClose={onClose}
    >
      <div className="note">
        <SlidersHorizontal size={17} /> Perubahan nilai hanya berlaku untuk
        tarikan baru. Skor lama mengikuti nilai pada saat dicatat.
      </div>
      <div className="rules-edit-list">
        <div className="rules-edit-head">
          <span>AKTIF</span>
          <span>NAMA TARIKAN / BONUS</span>
          <span>KATEGORI</span>
          <span>POIN</span>
          <span></span>
        </div>
        {draft.map((rule) => (
          <div className="rules-edit-row" key={rule.id}>
            <input
              aria-label={`Aktifkan ${rule.name}`}
              type="checkbox"
              checked={rule.enabled}
              onChange={(e) => update(rule.id, { enabled: e.target.checked })}
            />
            <input
              aria-label="Nama aturan"
              value={rule.name}
              maxLength={60}
              onChange={(e) => update(rule.id, { name: e.target.value })}
            />
            <select
              aria-label="Kategori aturan"
              value={rule.category}
              onChange={(e) =>
                update(rule.id, { category: e.target.value as RuleCategory })
              }
            >
              <option>Tarikan</option>
              <option>Bonus</option>
              <option>Penalti</option>
            </select>
            <input
              aria-label="Nilai poin"
              type="text"
              inputMode="numeric"
              value={pointTexts[rule.id] ?? ""}
              onChange={(e) =>
                setPointTexts((p) => ({ ...p, [rule.id]: e.target.value }))
              }
            />
            <button
              className="icon-button danger-icon"
              aria-label={`Hapus ${rule.name}`}
              onClick={() => {
                if (
                  window.confirm(
                    `Hapus aturan "${rule.name}"? Riwayat poin lama tetap tersimpan.`,
                  )
                )
                  setDraft((p) => p.filter((r) => r.id !== rule.id));
              }}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
      <section className="add-rule-box">
        <h3>Tambah aturan baru</h3>
        <div className="add-rule-row">
          <input
            placeholder="Nama ikan / bonus"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as RuleCategory)}
          >
            <option>Tarikan</option>
            <option>Bonus</option>
            <option>Penalti</option>
          </select>
          <input
            aria-label="Nilai aturan baru"
            type="number"
            step="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
          />
          <button
            className="outline-button"
            onClick={add}
            disabled={
              !name.trim() || !isValidPoints(points) || draft.length >= 100
            }
          >
            <Plus size={18} /> Tambahkan
          </button>
        </div>
      </section>
      <div className="dialog-footer">
        <small>
          {draft.length} aturan • {draft.filter((r) => r.enabled).length} aktif
        </small>
        <button
          className="primary-button"
          disabled={!valid}
          onClick={() => {
            onSave(
              draft.map((r) => ({
                ...r,
                name: r.name.trim(),
                points: Number(pointTexts[r.id]),
              })),
            );
            onClose();
          }}
        >
          Simpan Perubahan
        </button>
      </div>
    </Dialog>
  );
}

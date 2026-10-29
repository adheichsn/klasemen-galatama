"use client";
import { useMemo, useState } from "react";
import { Fish, Minus, Plus } from "lucide-react";
import Dialog from "./dialog";
import type { ScoringRule, CatchItem } from "@/lib/types";
export default function CatchDialog({
  rules,
  playerLabel,
  onClose,
  onSubmit,
}: {
  rules: ScoringRule[];
  playerLabel: string;
  onClose: () => void;
  onSubmit: (items: CatchItem[]) => void;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const selected = useMemo(
    () =>
      rules
        .filter((r) => r.enabled && (counts[r.id] || 0) > 0)
        .map((r) => ({
          ruleId: r.id,
          name: r.name,
          pointsEach: r.points,
          quantity: counts[r.id],
        })),
    [rules, counts],
  );
  const total = selected.reduce(
    (a, item) => a + item.pointsEach * item.quantity,
    0,
  );
  const update = (id: string, next: number) =>
    setCounts((p) => ({ ...p, [id]: Math.max(0, Math.min(99, next)) }));
  const ordered = rules.filter((r) => r.enabled);
  return (
    <Dialog title="Catat Tarikan Ikan" subtitle={playerLabel} onClose={onClose}>
      <div className="note">
        <Fish size={17} /> Pilih jenis tarikan dan jumlahnya. Nilai mengikuti
        pengaturan event.
      </div>
      <div className="rule-picker">
        {ordered.map((rule) => (
          <div
            key={rule.id}
            className={`rule-choice ${(counts[rule.id] || 0) > 0 ? "active" : ""}`}
          >
            <div>
              <strong>{rule.name}</strong>
              <small>{rule.category}</small>
            </div>
            <span className={`point-tag ${rule.points < 0 ? "negative" : ""}`}>
              {rule.points > 0 ? "+" : ""}
              {rule.points} P
            </span>
            <div className="quantity">
              <button
                aria-label={`Kurangi ${rule.name}`}
                onClick={() => update(rule.id, (counts[rule.id] || 0) - 1)}
              >
                <Minus size={14} />
              </button>
              <span>{counts[rule.id] || 0}</span>
              <button
                aria-label={`Tambah ${rule.name}`}
                onClick={() => update(rule.id, (counts[rule.id] || 0) + 1)}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
        {ordered.length === 0 && (
          <p className="empty-state">
            Belum ada aturan aktif. Buka Pengaturan Poin untuk menambahnya.
          </p>
        )}
      </div>
      <div className="dialog-footer">
        <div>
          <small>TOTAL TARIKAN</small>
          <strong className="large-total">
            {total > 0 ? "+" : ""}
            {total}
          </strong>
        </div>
        <button
          className="primary-button"
          disabled={!selected.length}
          onClick={() => {
            onSubmit(selected);
            onClose();
          }}
        >
          Simpan Tarikan
        </button>
      </div>
    </Dialog>
  );
}

"use client";
import { RotateCcw, ClipboardList } from "lucide-react";
import Dialog from "./dialog";
import { formatPoints, isReversed } from "@/lib/scoring";
import type { TournamentStore } from "@/hooks/use-tournament";
export default function HistoryDialog({
  store,
  onClose,
  playerId,
}: {
  store: TournamentStore;
  onClose: () => void;
  playerId?: string;
}) {
  const entries = store.data.entries.filter(
    (e) => !playerId || e.playerId === playerId,
  );
  const findName = (teamId: string, id: string) => {
    const team = store.data.teams.find((t) => t.id === teamId);
    const pl = team?.players.find((p) => p.id === id);
    return `${team?.name || "Clan lama"} / ${pl?.displayName || pl?.username || "Peserta"}`;
  };
  return (
    <Dialog
      wide
      title="Riwayat Penilaian"
      subtitle="Semua aksi dicatat dengan waktu dan bisa dibatalkan melalui transaksi pembalik."
      onClose={onClose}
    >
      {entries.length ? (
        <div className="history-list">
          {entries.map((e) => (
            <div className="history-entry" key={e.id}>
              <div className={`history-icon ${e.kind}`}>
                <ClipboardList size={18} />
              </div>
              <div className="history-main">
                <b>{e.description}</b>
                <span>
                  {findName(e.teamId, e.playerId)} •{" "}
                  {new Date(e.createdAt).toLocaleString("id-ID")}
                </span>
                {e.details && (
                  <small>
                    {e.details
                      .map(
                        (i) =>
                          `${i.name}: ${i.quantity} × ${i.pointsEach > 0 ? "+" : ""}${i.pointsEach}`,
                      )
                      .join(" · ")}
                  </small>
                )}
              </div>
              <b
                className={`history-score ${e.delta < 0 ? "danger-text" : ""}`}
              >
                {formatPoints(e.delta)}
              </b>
              {e.kind !== "reversal" &&
              !isReversed(store.data.entries, e.id) ? (
                <button
                  title="Batalkan transaksi dengan catatan pembalik"
                  className="icon-button"
                  aria-label="Batalkan transaksi"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Batalkan transaksi poin ini? Aksi pembatalan akan tercatat di riwayat.",
                      )
                    )
                      store.reverseEntry(e.id);
                  }}
                >
                  <RotateCcw size={17} />
                </button>
              ) : (
                <span className="history-done">
                  {e.kind === "reversal" ? "Koreksi" : "Batal"}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">
          Belum ada penilaian. Catat tarikan ikan atau masukkan poin manual
          untuk memulai.
        </p>
      )}
      <div className="dialog-footer">
        <small>{entries.length} transaksi tercatat</small>
        <button className="outline-button" onClick={onClose}>
          Tutup
        </button>
      </div>
    </Dialog>
  );
}

"use client";
import { Plus, Trash2 } from "lucide-react";
import Dialog from "./dialog";
import type { TournamentStore } from "@/hooks/use-tournament";
export default function TeamsDialog({
  store,
  onClose,
}: {
  store: TournamentStore;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Pengaturan Clan"
      subtitle="Edit nama, warna, dan jumlah clan."
      onClose={onClose}
    >
      <div className="team-settings-list">
        {store.data.teams.map((team, index) => {
          const locked = store.data.entries.some((e) => e.teamId === team.id);
          return (
            <div className="team-settings-row" key={team.id}>
              <span className="team-order">
                {String(index + 1).padStart(2, "0")}
              </span>
              <input
                type="color"
                aria-label={`Warna ${team.name}`}
                value={
                  /^#[0-9a-fA-F]{6}$/.test(team.color) ? team.color : "#22c55e"
                }
                onChange={(e) => store.setTeamColor(team.id, e.target.value)}
              />
              <input
                aria-label="Nama clan"
                value={team.name}
                onChange={(e) => store.setTeamName(team.id, e.target.value)}
              />
              <button
                aria-label="Hapus clan"
                title={
                  locked
                    ? "Clan dengan riwayat skor tidak bisa dihapus"
                    : "Hapus clan"
                }
                disabled={locked || store.data.teams.length <= 1}
                className="icon-button danger-icon"
                onClick={() => {
                  if (window.confirm(`Hapus ${team.name}?`))
                    store.removeTeam(team.id);
                }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        className="outline-button full-button"
        disabled={store.data.teams.length >= 12}
        onClick={store.addTeam}
      >
        <Plus size={18} /> Tambah Clan ({store.data.teams.length}/12)
      </button>
      <div className="note tiny-note">
        Untuk menjaga riwayat penilaian, clan yang sudah memiliki poin tidak
        dapat dihapus. Kamu tetap bisa mengubah nama dan warnanya.
      </div>
    </Dialog>
  );
}

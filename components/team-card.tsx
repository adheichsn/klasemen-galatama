"use client";
import {
  Check,
  Fish,
  History,
  Minus,
  Plus,
  UserPlus,
  Trash2,
} from "lucide-react";
import { playerScore, teamScore } from "@/lib/scoring";
import type { Team, ScoreEntry } from "@/lib/types";
import type { TournamentStore } from "@/hooks/use-tournament";

type Props = {
  team: Team;
  entries: ScoreEntry[];
  store: TournamentStore;
  onCatch: (teamId: string, playerId: string) => void;
  onManual: (teamId: string, playerId: string) => void;
  onHistory: (teamId: string, playerId: string) => void;
};
export default function TeamCard({
  team,
  entries,
  store,
  onCatch,
  onManual,
  onHistory,
}: Props) {
  const total = teamScore(entries, team.id);
  return (
    <article
      className="team-card"
      style={{ "--team-color": team.color } as React.CSSProperties}
    >
      <div className="team-head">
        <div className="team-emblem">{team.name.slice(0, 1) || "C"}</div>
        <input
          aria-label={`Nama ${team.name}`}
          className="team-name"
          value={team.name}
          onChange={(e) => store.setTeamName(team.id, e.target.value)}
          placeholder="NAMA CLAN"
        />
        <div className="team-total">
          <span>
            TOTAL
            <br />
            POINT
          </span>
          <strong>{total}</strong>
        </div>
      </div>
      <div className="team-table">
        <div className="player-row table-heading">
          <span>#</span>
          <span>USERNAME</span>
          <span>DISPLAY NAME</span>
          <span>POIN</span>
          <span>AKSI</span>
        </div>
        {team.players.map((player, i) => {
          const score = playerScore(entries, player.id);
          return (
            <div className="player-row" key={player.id}>
              <div className="player-index">
                {String(i + 1).padStart(2, "0")}
              </div>
              <input
                className="player-input"
                value={player.username}
                aria-label={`Username pemain ${i + 1} di ${team.name}`}
                placeholder="Nama Akun"
                onChange={(e) =>
                  store.setPlayer(team.id, player.id, {
                    username: e.target.value.slice(0, 40),
                  })
                }
              />
              <input
                className="player-input"
                value={player.displayName}
                aria-label={`Display name pemain ${i + 1} di ${team.name}`}
                placeholder="Display Name"
                onChange={(e) =>
                  store.setPlayer(team.id, player.id, {
                    displayName: e.target.value.slice(0, 50),
                  })
                }
              />
              <strong className="player-points">{score}</strong>
              <div className="player-actions">
                <button
                  title="Catat tarikan ikan"
                  aria-label={`Tarik ikan untuk ${player.username || `pemain ${i + 1}`}`}
                  className="small-action fish-action"
                  onClick={() => onCatch(team.id, player.id)}
                >
                  <Fish size={17} />
                </button>
                <button
                  title="Tambah / kurangi poin bebas"
                  aria-label="Penyesuaian poin"
                  className="small-action"
                  onClick={() => onManual(team.id, player.id)}
                >
                  <Plus size={15} />
                  <Minus size={12} />
                </button>
                <button
                  title={player.checkedIn ? "Batalkan hadir" : "Tandai hadir"}
                  aria-label="Status hadir"
                  className={`small-action ${player.checkedIn ? "checked" : ""}`}
                  onClick={() =>
                    store.setPlayer(team.id, player.id, {
                      checkedIn: !player.checkedIn,
                    })
                  }
                >
                  <Check size={18} />
                </button>
                <button
                  title="Riwayat poin peserta"
                  aria-label="Riwayat poin"
                  className="small-action muted-action"
                  onClick={() => onHistory(team.id, player.id)}
                >
                  <History size={17} />
                </button>
                {team.players.length > 1 && (
                  <button
                    title={
                      entries.some((e) => e.playerId === player.id)
                        ? "Pemain dengan riwayat tidak bisa dihapus"
                        : "Hapus peserta"
                    }
                    aria-label="Hapus peserta"
                    className="small-action muted-action remove-action"
                    disabled={entries.some((e) => e.playerId === player.id)}
                    onClick={() => {
                      if (window.confirm("Hapus peserta ini?"))
                        store.removePlayer(team.id, player.id);
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <footer className="team-footer">
        <span>
          {team.players.filter((p) => p.checkedIn).length}/{team.players.length}{" "}
          peserta hadir
        </span>
        <button
          className="subtle-action"
          disabled={team.players.length >= 20}
          onClick={() => store.addPlayer(team.id)}
        >
          <UserPlus size={16} /> Tambah peserta
        </button>
      </footer>
    </article>
  );
}

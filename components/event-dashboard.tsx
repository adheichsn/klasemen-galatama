"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Clock3,
  Fish,
  History,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Trophy,
  Users,
  Waves,
  ShieldCheck,
} from "lucide-react";
import { useTournament } from "@/hooks/use-tournament";
import { formatTime, leaderboard, teamScore } from "@/lib/scoring";
import type { ModalName, Selection } from "@/lib/types";
import TeamCard from "./team-card";
import CatchDialog from "./catch-dialog";
import ManualDialog from "./manual-dialog";
import RulesDialog from "./rules-dialog";
import TeamsDialog from "./teams-dialog";
import HistoryDialog from "./history-dialog";
import SettingsDialog from "./settings-dialog";
export default function EventDashboard() {
  const store = useTournament();
  const [modal, setModal] = useState<ModalName>(null);
  const [catchSelection, setCatchSelection] = useState<Selection | null>(null);
  const [manualSelection, setManualSelection] = useState<Selection | null>(
    null,
  );
  const [historyPlayer, setHistoryPlayer] = useState<string | undefined>(
    undefined,
  );
  const ranking = leaderboard(store.data);
  const playerLabel = (selection: Selection) => {
    const team = store.data.teams.find((t) => t.id === selection.teamId);
    const player = team?.players.find((p) => p.id === selection.playerId);
    return `${team?.name || "Clan"} • ${player?.displayName || player?.username || `Peserta #${(team?.players.findIndex((p) => p.id === selection.playerId) ?? 0) + 1}`}`;
  };
  const closeHistory = () => {
    setModal(null);
    setHistoryPlayer(undefined);
  };
  const players = store.data.teams.reduce((n, t) => n + t.players.length, 0);
  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="content-shell">
        <header className="topbar">
          <div className="brand">
            <div className="brand-icon">
              <Fish size={27} />
            </div>
            <div>
              <span className="eyebrow">FISH IT • EVENT MANAGER</span>
              <h1>
                GALATAMA <span>ARENA</span>
              </h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button
              className="ghost-button"
              onClick={() => setModal("history")}
            >
              <History size={17} /> Riwayat
            </button>
            <button
              className="ghost-button"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={17} /> Pengaturan
            </button>
          </div>
        </header>
        <section className="hero">
          <div className="hero-intro">
            <span className="hero-tag">
              <Waves size={15} /> CUSTOM TOURNAMENT CONTROL
            </span>
            <h2>{store.data.title || "GALATAMA SCOREBOARD"}</h2>
            <p>
              Atur tarikan, nilai poin, dan peringkat pertandingan dari satu
              dashboard.
            </p>
          </div>
          <div className="hero-metric">
            <span>
              <Trophy size={15} /> TOTAL POIN TURNAMEN
            </span>
            <strong>
              {store.data.entries.reduce((sum, entry) => sum + entry.delta, 0)}
            </strong>
          </div>
        </section>
        <section className="event-stats">
          <div className="event-field">
            <label>USN / HOST</label>
            <input
              placeholder="Masukkan USN..."
              value={store.data.usn}
              onChange={(e) => store.setMeta("usn", e.target.value)}
            />
          </div>
          <div className="event-field">
            <label>MAP LOKASI</label>
            <input
              placeholder="Pilih map / lokasi..."
              value={store.data.map}
              onChange={(e) => store.setMeta("map", e.target.value)}
            />
          </div>
          <div className="timer-card">
            <div>
              <span>
                <Clock3 size={16} /> MATCH TIMER
              </span>
              <strong className={store.remaining === 0 ? "danger-text" : ""}>
                {formatTime(store.remaining)}
              </strong>
            </div>
            <div className="timer-actions">
              <button
                className="timer-primary"
                aria-label={
                  store.data.timer.runningSince === null
                    ? "Mulai timer"
                    : "Pause timer"
                }
                title={
                  store.data.timer.runningSince === null
                    ? "Mulai timer"
                    : "Pause timer"
                }
                onClick={store.startPause}
              >
                {store.data.timer.runningSince === null ? (
                  <Play size={21} fill="currentColor" />
                ) : (
                  <Pause size={20} fill="currentColor" />
                )}
              </button>
              <button
                title="Reset timer"
                aria-label="Reset timer"
                onClick={() => {
                  if (window.confirm("Reset timer ke durasi awal?"))
                    store.resetTimer();
                }}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </section>
        <section className="mini-stats">
          <div>
            <Users size={18} />
            <span>{store.data.teams.length} Clan</span>
          </div>
          <div>
            <ShieldCheck size={18} />
            <span>{players} Peserta</span>
          </div>
          <div>
            <SlidersHorizontal size={18} />
            <span>
              {store.data.rules.filter((r) => r.enabled).length} Aturan Aktif
            </span>
          </div>
          <div>
            <History size={18} />
            <span>{store.data.entries.length} Transaksi</span>
          </div>
        </section>
        <div className="section-top">
          <div>
            <span className="eyebrow">LIVE SCOREBOARD</span>
            <h2>Daftar Clan & Peserta</h2>
          </div>
          <div className="section-actions">
            <button
              className="outline-button"
              onClick={() => setModal("rules")}
            >
              <SlidersHorizontal size={17} /> Atur Tarikan & Poin
            </button>
            <button
              className="outline-button"
              onClick={() => setModal("teams")}
            >
              <Users size={17} /> Kelola Clan
            </button>
          </div>
        </div>
        <div className="dashboard-layout">
          <section className="teams-grid">
            {store.data.teams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                entries={store.data.entries}
                store={store}
                onCatch={(teamId, playerId) =>
                  setCatchSelection({ teamId, playerId })
                }
                onManual={(teamId, playerId) =>
                  setManualSelection({ teamId, playerId })
                }
                onHistory={(_, playerId) => {
                  setHistoryPlayer(playerId);
                  setModal("history");
                }}
              />
            ))}
            <button
              className="add-team-card"
              onClick={store.addTeam}
              disabled={store.data.teams.length >= 12}
            >
              <Plus size={22} />
              <span>Tambah clan baru</span>
              <small>Maksimal 12 clan</small>
            </button>
          </section>
          <aside className="leaderboard">
            <div className="leaderboard-head">
              <div>
                <span className="eyebrow">STANDINGS</span>
                <h3>
                  <Trophy size={20} /> Klasemen Clan
                </h3>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="leaderboard-list">
              {ranking.map((team, i) => (
                <div className="rank-row" key={team.id}>
                  <span className={`rank-badge rank-${i + 1}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className="rank-color"
                    style={{ background: team.color }}
                  />
                  <div className="rank-name">
                    {team.name || "Tanpa nama"}
                    <small>{team.players.length} peserta</small>
                  </div>
                  <strong>
                    {team.points}
                    <small>PTS</small>
                  </strong>
                </div>
              ))}
            </div>
            <div className="leaderboard-foot">
              <ArrowUpRight size={17} /> Diperbarui otomatis berdasarkan riwayat
              poin
            </div>
          </aside>
        </div>
        <footer className="bottom-bar">
          <span>
            Data tersimpan lokal di browser | Export backup sebelum event
          </span>
        </footer>
      </div>
      {catchSelection && (
        <CatchDialog
          rules={store.data.rules}
          playerLabel={playerLabel(catchSelection)}
          onClose={() => setCatchSelection(null)}
          onSubmit={(details) =>
            store.addCatch(
              catchSelection.teamId,
              catchSelection.playerId,
              details,
            )
          }
        />
      )}
      {manualSelection && (
        <ManualDialog
          playerLabel={playerLabel(manualSelection)}
          onClose={() => setManualSelection(null)}
          onSubmit={(delta, reason) =>
            store.addManual(
              manualSelection.teamId,
              manualSelection.playerId,
              delta,
              reason,
            )
          }
        />
      )}
      {modal === "rules" && (
        <RulesDialog
          rules={store.data.rules}
          onSave={store.setRules}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "teams" && (
        <TeamsDialog store={store} onClose={() => setModal(null)} />
      )}
      {modal === "history" && (
        <HistoryDialog
          store={store}
          playerId={historyPlayer}
          onClose={closeHistory}
        />
      )}
      {modal === "settings" && (
        <SettingsDialog store={store} onClose={() => setModal(null)} />
      )}
    </main>
  );
}

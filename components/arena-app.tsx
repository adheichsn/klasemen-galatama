"use client";
import { useRef, useState } from "react";
import {
  Activity,
  Archive,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  CloudOff,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Eye,
  Fish,
  Flag,
  History,
  Home,
  Info,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Medal,
  Menu,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Upload,
  Users,
  Waves,
  X,
} from "lucide-react";
import { useArena } from "@/hooks/use-arena";
import {
  downloadArena,
  fmt,
  isReversed,
  participantPoints,
  standings,
  timeLabel,
} from "@/lib/arena-utils";
import type { ArenaEvent, EventStatus } from "@/lib/arena-types";
import ArenaBuilder from "./arena-builder";
import ScoreModal from "./arena-score-modal";

type Page = "home" | "events" | "archives" | "hall" | "faq" | "builder";
const mainNav: { id: Page; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "events", label: "Turnamen", icon: CalendarDays },
  { id: "archives", label: "Arsip Galatama", icon: Archive },
  { id: "hall", label: "Hall of Fame", icon: Trophy },
  { id: "faq", label: "Rules & FAQ", icon: BookOpen },
];
const prettyDate = (iso: string) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Tanggal fleksibel";
const statusText: Record<EventStatus, string> = {
  draft: "Draft",
  live: "Live Event",
  finished: "Selesai",
};
const standMedals = ["gold", "silver", "bronze"];
function Empty({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof Fish;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <Icon size={26} />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
function EventTile({
  e,
  onOpen,
  onDuplicate,
  onDelete,
  admin,
}: {
  e: ArenaEvent;
  onOpen: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  admin: boolean;
}) {
  const rank = standings(e);
  return (
    <article className="event-tile">
      <button
        className="event-cover"
        onClick={onOpen}
        aria-label={`Buka ${e.title}`}
      >
        <span className="cover-grid" />
        <span className="cover-ring" />
        <Fish size={65} className="cover-fish" />
        <span className="cover-label">
          GALATAMA <b>ARENA</b>
        </span>
        <span className="cover-bottom">
          <span className={`status-chip ${e.status}`}>
            {statusText[e.status]}
          </span>
          <span>{e.mode.toUpperCase()}</span>
        </span>
      </button>
      <div className="event-tile-body">
        <div className="event-meta">
          <span>
            <MapPin size={13} />
            {e.location || "Lokasi bebas"}
          </span>
          <span>
            <CalendarDays size={13} />
            {prettyDate(e.eventDate)}
          </span>
        </div>
        <h3>{e.title}</h3>
        <p>{e.subtitle || "Kompetisi memancing Fish It"}</p>
        <div className="event-tile-foot">
          <span>
            <Users size={15} />
            {e.participants.length} peserta
          </span>
          <span>
            <Trophy size={15} />
            {rank[0]
              ? `${fmt(rank[0].points)} poin tertinggi`
              : "Belum ada skor"}
          </span>
        </div>
        <div className="event-tile-actions">
          <button className="btn secondary" onClick={onOpen}>
            Lihat Detail <ArrowRight size={15} />
          </button>
          {admin && onDuplicate && (
            <button
              className="icon-button"
              title="Duplikat aturan (tanpa skor dan peserta)"
              onClick={onDuplicate}
            >
              <Copy size={16} />
            </button>
          )}
          {admin && onDelete && (
            <button
              className="icon-button danger"
              title="Hapus draft tanpa skor"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
export default function ArenaApp() {
  const store = useArena();
  const e = store.active;
  const [page, setPage] = useState<Page>("home");
  const [admin, setAdmin] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState<"all" | EventStatus>("all");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const go = (to: Page) => {
    setPage(to);
    setMobileMenu(false);
    setSearch("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const select = (id: string) => {
    store.setActive(id);
    go("home");
  };
  const setEventStatus = (next: EventStatus) => {
    if (
      next === "live" &&
      (!e.fish.some((f) => f.enabled) ||
        !e.participants.length ||
        (e.mode === "squad" && !e.squads.length))
    ) {
      setNotice(
        "Lengkapi minimal satu ikan aktif dan satu peserta (beserta squad untuk mode Squad) sebelum memulai.",
      );
      go("builder");
      return;
    }
    if (
      next === "finished" &&
      !window.confirm(
        "Akhiri turnamen dan kunci semua skor serta peraturan? Arsip akan tersedia di menu Arsip Galatama.",
      )
    )
      return;
    if (
      e.status === "finished" &&
      !window.confirm(
        "Buka kembali event selesai? Status arsip dan hasil final bisa berubah jika skor dikoreksi.",
      )
    )
      return;
    store.status(next);
    setNotice("");
  };
  const load = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 15_000_000)
        throw new Error("File terlalu besar (maksimum 15 MB).");
      const parsed: unknown = JSON.parse(await file.text());
      if (
        !window.confirm(
          "Import backup akan mengganti SEMUA turnamen pada browser ini. Pastikan sudah export backup terlebih dahulu. Lanjutkan?",
        )
      )
        return;
      if (!store.importBackup(parsed))
        throw new Error(
          "Format JSON tidak sesuai Arena V2 atau versi lama V1.",
        );
      setNotice("Backup berhasil diimpor.");
      go("home");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Gagal membaca JSON.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const ranking = standings(e);
  const found = ranking.filter((p) =>
    `${p.name} ${p.subtitle}`.toLowerCase().includes(search.toLowerCase()),
  );
  const totalScore = e.entries.reduce((a, b) => a + b.delta, 0);
  const catchCount = e.entries
    .filter((x) => x.kind === "catch")
    .reduce((a, x) => a + (x.quantity || 1), 0);
  const recent = e.entries.slice(0, 6);
  const finished = store.data.events.filter(
    (x) => x.status === "finished" && (admin || x.published),
  );
  const visibleEvents = store.data.events.filter(
    (x) =>
      (admin || x.published) &&
      (eventFilter === "all" || x.status === eventFilter) &&
      `${x.title} ${x.location}`
        .toLowerCase()
        .includes(eventSearch.toLowerCase()),
  );
  const navItem = (item: { id: Page; label: string; icon: typeof Home }) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        className={`nav-item ${page === item.id ? "active" : ""}`}
        onClick={() => go(item.id)}
      >
        <Icon size={19} strokeWidth={page === item.id ? 2.3 : 1.9} />
        <span>{item.label}</span>
        {page === item.id && <span className="nav-current" />}
      </button>
    );
  };
  if (!store.ready)
    return (
      <div className="loading-screen">
        <Fish size={36} />
        <b>
          GALATAMA <span>ARENA</span>
        </b>
        <p>Menyiapkan klasemen...</p>
      </div>
    );
  return (
    <div className="arena-root">
      {mobileMenu && (
        <button
          aria-label="Tutup menu"
          className="mobile-backdrop"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "mobile-open" : ""}`}>
        <div className="brand-area">
          <div className="brand-mark">
            <Fish size={25} />
          </div>
          <div className="brand-name">
            <strong>
              GALATAMA<span>ARENA</span>
            </strong>
            <small>FISH IT TOURNAMENTS</small>
          </div>
          <button
            className="mobile-close icon-button"
            onClick={() => setMobileMenu(false)}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-caption">MENU UTAMA</div>
          {mainNav.map(navItem)}
          {admin && (
            <>
              <div className="sidebar-caption admin-caption">PANEL PANITIA</div>
              {navItem({
                id: "builder",
                label: "Tournament Builder",
                icon: Settings2,
              })}
            </>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="storage-warning">
            <CloudOff size={18} />
            <div>
              <strong>Mode Lokal</strong>
              <span>Data di browser ini saja</span>
            </div>
          </div>
          <div className="sidebar-signoff">
            <span className="online-dot" /> READY TO COMPETE <Waves size={15} />
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            onClick={() => setMobileMenu(true)}
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumbs">
            <span>GALATAMA ARENA</span>
            <ChevronRight size={15} />
            <b>
              {
                [
                  ...mainNav,
                  { id: "builder", label: "Tournament Builder" },
                ].find((x) => x.id === page)?.label
              }
            </b>
          </div>
          <div className="topbar-end">
            <span className="topbar-date">FISH IT COMMUNITY HUB</span>
            <div
              className="view-switch"
              title="Hanya mode tampilan; tidak menyediakan autentikasi"
            >
              <button
                className={!admin ? "selected" : ""}
                onClick={() => setAdmin(false)}
              >
                <Eye size={15} /> Publik
              </button>
              <button
                className={admin ? "selected" : ""}
                onClick={() => setAdmin(true)}
              >
                <ShieldCheck size={15} /> Panitia
              </button>
            </div>
          </div>
        </header>
        <main className="main-content">
          {store.migrated && (
            <div className="notice migrate">
              <CheckCircle2 size={18} /> Data dari klasemen V1 berhasil
              dimigrasikan sebagai event Squad. Backup V1 asli tetap tersimpan
              dengan key lama.
            </div>
          )}
          {notice && (
            <div className="notice notice-dismiss">
              <Info size={18} />
              {notice}
              <button
                className="icon-button"
                title="Tutup pesan"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!admin && (
            <div className="notice">
              <Info size={18} /> Ini hanya pratinjau UI publik pada browser yang
              sama. Mode Panitia belum dilindungi login; jangan gunakan sebagai
              akses publik produksi.
            </div>
          )}
          {page === "home" && (
            <div className="section-stack home-page">
              <div className="hero-banner">
                <div className="hero-glow" />
                <div className="hero-copy">
                  <div className="hero-kicker">
                    <Radio size={14} />
                    {e.status === "live"
                      ? "LIVE TOURNAMENT"
                      : e.status === "finished"
                        ? "TOURNAMENT COMPLETE"
                        : "TOURNAMENT DASHBOARD"}{" "}
                    <span>•</span> FISH IT
                  </div>
                  <h1>{e.title}</h1>
                  <p>
                    {e.subtitle ||
                      "Kompetisi memancing dengan sistem poin yang fleksibel."}
                  </p>
                  <div className="hero-details">
                    <span>
                      <MapPin size={15} />
                      {e.location || "Semua pulau"}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {prettyDate(e.eventDate)}
                    </span>
                    <span>
                      <Users size={15} />
                      {e.mode === "solo" ? "Solo" : "Squad"}
                    </span>
                  </div>
                  <div className="hero-actions">
                    {admin && (
                      <button
                        className="btn hero-button"
                        onClick={() => go("builder")}
                      >
                        <Settings2 size={16} /> Kelola Event{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="btn hero-outline"
                      onClick={() => go("events")}
                    >
                      Semua Turnamen <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="hero-art">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />
                  <div className="hero-art-center">
                    <Fish size={105} strokeWidth={1.2} />
                  </div>
                  <span className="hero-art-txt">
                    THE NEXT
                    <br />
                    CHAMPION
                  </span>
                </div>
              </div>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Users size={21} />
                  </div>
                  <div>
                    <span>TOTAL PESERTA</span>
                    <strong>{fmt(e.participants.length)}</strong>
                    <small>
                      {e.participants.filter((p) => p.checkedIn).length} sudah
                      check-in
                    </small>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon violet">
                    <Trophy size={21} />
                  </div>
                  <div>
                    <span>TOTAL POIN</span>
                    <strong>{fmt(totalScore)}</strong>
                    <small>Akumulasi pertandingan</small>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon cyan">
                    <Fish size={21} />
                  </div>
                  <div>
                    <span>IKAN TERTANGKAP</span>
                    <strong>{fmt(catchCount)}</strong>
                    <small>
                      {e.fish.filter((f) => f.enabled).length} jenis ikan aktif
                    </small>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon gold">
                    <Activity size={21} />
                  </div>
                  <div>
                    <span>STATUS EVENT</span>
                    <strong className="stat-status">
                      {statusText[e.status]}
                    </strong>
                    <small>
                      {e.mode === "solo"
                        ? "Solo Point System"
                        : "Squad Point System"}
                    </small>
                  </div>
                </div>
              </div>
              <div className="dashboard-columns">
                <section className="panel podium-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="kicker">HALL OF CHAMPIONS</div>
                      <h2>
                        <Crown size={20} /> Top 3 Standings
                      </h2>
                    </div>
                    <span className={`status-chip ${e.status}`}>
                      {statusText[e.status]}
                    </span>
                  </div>
                  {ranking.length ? (
                    <div className="podium">
                      <div className="podium-slot second">
                        {ranking[1] && (
                          <>
                            <div className="podium-medal">2</div>
                            <div className="podium-avatar silver">
                              <Medal size={24} />
                            </div>
                            <strong>{ranking[1].name}</strong>
                            <small>{ranking[1].subtitle}</small>
                            <span>{fmt(ranking[1].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base">
                          <b>02</b>
                        </div>
                      </div>
                      <div className="podium-slot first">
                        {ranking[0] && (
                          <>
                            <div className="podium-crown">
                              <Crown size={25} />
                            </div>
                            <div className="podium-avatar gold">
                              <Trophy size={29} />
                            </div>
                            <strong>{ranking[0].name}</strong>
                            <small>{ranking[0].subtitle}</small>
                            <span>{fmt(ranking[0].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base">
                          <b>01</b>
                        </div>
                      </div>
                      <div className="podium-slot third">
                        {ranking[2] && (
                          <>
                            <div className="podium-medal">3</div>
                            <div className="podium-avatar bronze">
                              <Medal size={24} />
                            </div>
                            <strong>{ranking[2].name}</strong>
                            <small>{ranking[2].subtitle}</small>
                            <span>{fmt(ranking[2].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base">
                          <b>03</b>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Empty
                      icon={Trophy}
                      title="Podium masih kosong"
                      description="Tambahkan peserta melalui Tournament Builder untuk memulai klasemen."
                      action={
                        admin ? (
                          <button
                            className="btn secondary"
                            onClick={() => go("builder")}
                          >
                            Tambah Peserta <ArrowRight size={15} />
                          </button>
                        ) : undefined
                      }
                    />
                  )}
                </section>
                <div className="right-rail">
                  <section className="panel timer-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="kicker">MATCH CONTROL</div>
                        <h2>
                          <Clock3 size={19} /> Waktu Pertandingan
                        </h2>
                      </div>
                      <div
                        className={`live-indicator ${e.status === "live" ? "is-live" : ""}`}
                      >
                        <span />
                        {e.status === "live" ? "LIVE" : e.status.toUpperCase()}
                      </div>
                    </div>
                    <div className="timer-face">
                      <span>COUNTDOWN TIMER</span>
                      <strong>{timeLabel(store.remaining)}</strong>
                      <div>
                        Durasi {fmt(e.timer.durationSec / 60)} menit •{" "}
                        {e.mode.toUpperCase()}
                      </div>
                    </div>
                    {admin && (
                      <div className="timer-controls">
                        <button
                          className="btn primary"
                          disabled={e.status !== "live"}
                          onClick={store.toggleTimer}
                        >
                          {e.timer.runningSince === null ? (
                            <Play size={17} />
                          ) : (
                            <Pause size={17} />
                          )}{" "}
                          {e.timer.runningSince === null
                            ? "Jalankan Timer"
                            : "Pause Timer"}
                        </button>
                        <button
                          className="icon-button bordered"
                          title="Reset timer"
                          disabled={e.status === "finished"}
                          onClick={() => {
                            if (window.confirm("Reset timer event ini?"))
                              store.resetTimer();
                          }}
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    )}
                    {admin && (
                      <div className="event-status-control">
                        {e.status === "draft" ? (
                          <button
                            className="text-action"
                            onClick={() => setEventStatus("live")}
                          >
                            <Radio size={15} /> Mulai pertandingan{" "}
                            <ArrowRight size={15} />
                          </button>
                        ) : e.status === "live" ? (
                          <button
                            className="text-action danger-text"
                            onClick={() => setEventStatus("finished")}
                          >
                            <Flag size={15} /> Akhiri & arsipkan{" "}
                            <ArrowRight size={15} />
                          </button>
                        ) : (
                          <button
                            className="text-action"
                            onClick={() => setEventStatus("live")}
                          >
                            <LockKeyhole size={15} /> Buka kembali event{" "}
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                  <section className="panel glance-panel">
                    <div className="panel-heading">
                      <div>
                        <div className="kicker">QUICK OVERVIEW</div>
                        <h2>
                          <Sparkles size={19} /> Aturan Penilaian
                        </h2>
                      </div>
                      {admin && (
                        <button
                          className="icon-button"
                          onClick={() => go("builder")}
                          title="Ubah aturan"
                        >
                          <Settings2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="glance-list">
                      <div>
                        <span>Jenis ikan aktif</span>
                        <b>{e.fish.filter((f) => f.enabled).length}</b>
                      </div>
                      <div>
                        <span>Bonus poin aktif</span>
                        <b>{e.bonuses.filter((b) => b.enabled).length}</b>
                      </div>
                      <div>
                        <span>Peraturan turnamen</span>
                        <b>{e.writtenRules.length}</b>
                      </div>
                      <div>
                        <span>Riwayat transaksi</span>
                        <b>{e.entries.length}</b>
                      </div>
                    </div>
                    {admin && (
                      <button
                        className="text-action"
                        onClick={() => go("builder")}
                      >
                        Konfigurasi scoring <ArrowRight size={16} />
                      </button>
                    )}
                  </section>
                </div>
              </div>
              <section className="panel standings-panel">
                <div className="panel-heading leaderboard-header">
                  <div>
                    <div className="kicker">THE LEADERBOARD</div>
                    <h2>
                      <Trophy size={20} /> Klasemen{" "}
                      {e.mode === "solo" ? "Individu" : "Squad"}
                    </h2>
                    <p>
                      Peringkat otomatis berdasarkan total poin yang dicatat
                      panitia.
                    </p>
                  </div>
                  <div className="leaderboard-tools">
                    <label className="searchbox">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(ev) => setSearch(ev.target.value)}
                        placeholder="Cari peserta / squad..."
                      />
                    </label>
                    {admin && (
                      <button
                        className="btn primary"
                        disabled={e.status !== "live"}
                        onClick={() => setScoreOpen(true)}
                      >
                        <Plus size={17} /> Input Tangkapan
                      </button>
                    )}
                  </div>
                </div>
                {found.length ? (
                  <div className="table-scroll">
                    <table className="leaderboard-table">
                      <thead>
                        <tr>
                          <th>PERINGKAT</th>
                          <th>{e.mode === "solo" ? "PESERTA" : "SQUAD"}</th>
                          <th>TANGKAPAN</th>
                          <th>TOTAL POIN</th>
                          <th>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {found.map((row) => {
                          const rank =
                            ranking.findIndex((x) => x.id === row.id) + 1;
                          return (
                            <tr key={row.id}>
                              <td>
                                <span
                                  className={`table-rank ${standMedals[rank - 1] || ""}`}
                                >
                                  {String(rank).padStart(2, "0")}
                                </span>
                              </td>
                              <td>
                                <div className="player-name">
                                  <div
                                    className={`name-avatar avatar-${rank <= 3 ? rank : "other"}`}
                                  >
                                    {row.name.slice(0, 1).toUpperCase()}
                                  </div>
                                  <div>
                                    <strong>{row.name}</strong>
                                    <small>{row.subtitle}</small>
                                  </div>
                                  {rank === 1 && (
                                    <Crown size={16} className="crown-small" />
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="catch-count">
                                  <Fish size={15} />
                                  {fmt(row.catches)}
                                </span>
                              </td>
                              <td>
                                <strong className="points-cell">
                                  {fmt(row.points)} <small>PTS</small>
                                </strong>
                              </td>
                              <td>
                                <span className="ranking-label">
                                  {rank <= 3
                                    ? ["TOP RANK", "RUNNER-UP", "TOP 3"][
                                        rank - 1
                                      ]
                                    : "COMPETING"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Empty
                    icon={Search}
                    title={search ? "Tidak ditemukan" : "Belum ada peserta"}
                    description={
                      search
                        ? "Coba kata kunci lain."
                        : "Daftarkan peserta terlebih dahulu di Tournament Builder."
                    }
                    action={
                      admin ? (
                        <button
                          className="btn secondary"
                          onClick={() => go("builder")}
                        >
                          Kelola Peserta <ArrowRight size={15} />
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </section>
              <div className="dashboard-columns activity-layout">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <div className="kicker">MATCH LOG</div>
                      <h2>
                        <History size={19} /> Aktivitas Terbaru
                      </h2>
                    </div>
                    <button
                      className="text-action"
                      onClick={() => setHistoryOpen((v) => !v)}
                    >
                      {historyOpen ? "Lebih sedikit" : "Lihat semua"}{" "}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                  {e.entries.length ? (
                    <div className="activity-list">
                      {(historyOpen ? e.entries : recent).map((item) => (
                        <div className="activity-item" key={item.id}>
                          <div className={`activity-icon ${item.kind}`}>
                            {item.kind === "catch" ? (
                              <Fish size={18} />
                            ) : item.kind === "reversal" ? (
                              <ArrowDownRight size={18} />
                            ) : (
                              <Activity size={18} />
                            )}
                          </div>
                          <div className="activity-desc">
                            <strong>
                              {e.participants.find(
                                (p) => p.id === item.participantId,
                              )?.name || "Peserta lama"}
                            </strong>
                            <span>{item.description}</span>
                            <small>
                              {new Date(item.createdAt).toLocaleString("id-ID")}
                            </small>
                          </div>
                          <div className="activity-value">
                            <strong
                              className={item.delta >= 0 ? "plus" : "minus"}
                            >
                              {item.delta > 0 ? "+" : ""}
                              {fmt(item.delta)} PTS
                            </strong>
                            {admin &&
                              e.status === "live" &&
                              item.kind !== "reversal" &&
                              !isReversed(e.entries, item.id) && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Batalkan catatan ini dengan transaksi pembalik?",
                                      )
                                    )
                                      store.reverse(item.id);
                                  }}
                                >
                                  Batalkan
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={History}
                      title="Belum ada aktivitas"
                      description="Tangkapan dan penyesuaian skor akan tercatat lengkap di sini."
                    />
                  )}
                </section>
                <section className="panel rules-spotlight">
                  <div className="panel-heading">
                    <div>
                      <div className="kicker">COMPETITION GUIDE</div>
                      <h2>
                        <BookOpen size={19} /> Peraturan Event
                      </h2>
                    </div>
                    <button
                      className="icon-button"
                      onClick={() => go("faq")}
                      title="Lihat peraturan"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                  {e.writtenRules.length ? (
                    <div className="rule-list-preview">
                      {e.writtenRules.slice(0, 5).map((r, i) => (
                        <div key={r.id}>
                          <span>{String(i + 1).padStart(2, "0")}</span>
                          <p>
                            <b>{r.group}</b>
                            {r.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={BookOpen}
                      title="Aturan belum ditulis"
                      description="Aturan dapat dibuat sendiri untuk setiap event."
                    />
                  )}
                  <button className="text-action" onClick={() => go("faq")}>
                    Buka Rules & FAQ <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <section className="section-stack archive-preview">
                <div className="section-top">
                  <div>
                    <div className="kicker">RELIVE THE MOMENT</div>
                    <h2>Arsip Galatama</h2>
                    <p>
                      Lihat hasil pertandingan sebelumnya, pemenang, dan aturan
                      yang digunakan.
                    </p>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={() => go("archives")}
                  >
                    Semua Arsip <ArrowRight size={16} />
                  </button>
                </div>
                {finished.length ? (
                  <div className="event-grid">
                    {finished.slice(0, 3).map((x) => (
                      <EventTile
                        key={x.id}
                        e={x}
                        onOpen={() => select(x.id)}
                        admin={admin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="subtle-empty">
                    <Archive size={20} /> Arsip akan muncul di sini setelah ada
                    turnamen yang selesai.
                  </div>
                )}
              </section>
            </div>
          )}
          {page === "builder" &&
            (admin ? (
              <ArenaBuilder store={store} />
            ) : (
              <Empty
                icon={ShieldCheck}
                title="Panel panitia disembunyikan"
                description="Aktifkan mode Panitia untuk mengakses konfigurasi pada prototipe lokal ini."
              />
            ))}
          {page === "events" && (
            <div className="section-stack">
              <div className="page-heading">
                <div>
                  <div className="kicker">EVENT MANAGEMENT</div>
                  <h2>Semua Turnamen</h2>
                  <p>
                    Setiap event mempunyai konfigurasi poin, peserta, dan
                    klasemen tersendiri.
                  </p>
                </div>
                {admin && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      store.create();
                      go("builder");
                    }}
                  >
                    <Plus size={18} /> Buat Turnamen
                  </button>
                )}
              </div>
              <div className="filter-bar">
                <label className="searchbox">
                  <Search size={17} />
                  <input
                    placeholder="Cari turnamen atau lokasi..."
                    value={eventSearch}
                    onChange={(v) => setEventSearch(v.target.value)}
                  />
                </label>
                <div className="filter-buttons">
                  {(["all", "draft", "live", "finished"] as const).map((s) => (
                    <button
                      key={s}
                      className={eventFilter === s ? "selected" : ""}
                      onClick={() => setEventFilter(s)}
                    >
                      {s === "all" ? "Semua" : statusText[s]}
                    </button>
                  ))}
                </div>
              </div>
              {visibleEvents.length ? (
                <div className="event-grid">
                  {visibleEvents.map((x) => (
                    <EventTile
                      key={x.id}
                      e={x}
                      admin={admin}
                      onOpen={() => select(x.id)}
                      onDuplicate={
                        admin
                          ? () => {
                              store.duplicate(x.id);
                              go("builder");
                            }
                          : undefined
                      }
                      onDelete={
                        admin &&
                        x.status === "draft" &&
                        !x.entries.length &&
                        store.data.events.length > 1
                          ? () => {
                              if (window.confirm(`Hapus draft "${x.title}"?`))
                                store.remove(x.id);
                            }
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={CalendarDays}
                  title="Belum ada turnamen"
                  description="Buat turnamen baru atau ubah filter pencarian."
                  action={
                    admin ? (
                      <button
                        className="btn primary"
                        onClick={() => {
                          store.create();
                          go("builder");
                        }}
                      >
                        <Plus size={16} />
                        Buat Turnamen
                      </button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
          {page === "archives" && (
            <div className="section-stack">
              <div className="page-heading">
                <div>
                  <div className="kicker">GALATAMA HISTORY</div>
                  <h2>Arsip Galatama</h2>
                  <p>
                    Dokumentasi hasil final, skor, dan peraturan setiap edisi.
                  </p>
                </div>
                <span className="pill neutral">
                  <Archive size={14} /> {finished.length} arsip
                </span>
              </div>
              {finished.length ? (
                <div className="event-grid">
                  {finished.map((x) => (
                    <EventTile
                      key={x.id}
                      e={x}
                      admin={admin}
                      onOpen={() => select(x.id)}
                    />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Archive}
                  title="Belum ada arsip turnamen"
                  description="Arsip dibuat otomatis ketika status event menjadi Selesai. Riwayat dan nilai poinnya tetap tersimpan."
                />
              )}
            </div>
          )}
          {page === "hall" && (
            <div className="section-stack">
              <div className="page-heading">
                <div>
                  <div className="kicker">LEGENDS NEVER FADE</div>
                  <h2>
                    Hall of Fame <Crown className="title-icon" size={24} />
                  </h2>
                  <p>
                    Para juara dari setiap edisi turnamen yang sudah selesai.
                  </p>
                </div>
                <span className="pill neutral">
                  <Trophy size={14} />
                  {finished.length} edisi
                </span>
              </div>
              {finished.length ? (
                <div className="hall-grid">
                  {finished.map((ev) => {
                    const top = standings(ev).slice(0, 3);
                    return (
                      <div className="panel hall-card" key={ev.id}>
                        <div className="hall-head">
                          <div className="hall-icon">
                            <Trophy size={23} />
                          </div>
                          <div>
                            <span>EDISI TURNAMEN</span>
                            <h3>{ev.title}</h3>
                            <p>
                              {ev.location || "Map bebas"} •{" "}
                              {prettyDate(ev.eventDate)}
                            </p>
                          </div>
                        </div>
                        {top.length ? (
                          top.map((p, i) => (
                            <div className="hall-winner" key={p.id}>
                              <span className={`winner-rank ${standMedals[i]}`}>
                                #{i + 1}
                              </span>
                              <strong>{p.name}</strong>
                              <b>{fmt(p.points)} PTS</b>
                            </div>
                          ))
                        ) : (
                          <p className="hint">
                            Turnamen ini tidak memiliki peringkat peserta.
                          </p>
                        )}
                        <button
                          className="text-action"
                          onClick={() => select(ev.id)}
                        >
                          Buka hasil lengkap <ArrowRight size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Empty
                  icon={Award}
                  title="Sang juara belum ditemukan"
                  description="Selesaikan event untuk menampilkan hasil akhirnya di Hall of Fame."
                />
              )}
            </div>
          )}
          {page === "faq" && (
            <div className="section-stack">
              <div className="page-heading">
                <div>
                  <div className="kicker">RULES & SUPPORT CENTER</div>
                  <h2>Peraturan & FAQ</h2>
                  <p>
                    Ketentuan pertandingan yang sedang dipilih: <b>{e.title}</b>
                  </p>
                </div>
                {admin && e.status !== "finished" && (
                  <button
                    className="btn secondary"
                    onClick={() => go("builder")}
                  >
                    <Settings2 size={16} /> Kelola Isi
                  </button>
                )}
              </div>
              <div className="faq-layout">
                <section className="panel faq-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="kicker">PERTANYAAN UMUM</div>
                      <h2>
                        <CircleHelp size={20} /> Frequently Asked Questions
                      </h2>
                    </div>
                  </div>
                  {e.faqs.length ? (
                    <div className="faq-items">
                      {e.faqs.map((q) => (
                        <div
                          key={q.id}
                          className={`faq-item ${openFaq.includes(q.id) ? "opened" : ""}`}
                        >
                          <button
                            onClick={() =>
                              setOpenFaq((prev) =>
                                prev.includes(q.id)
                                  ? prev.filter((x) => x !== q.id)
                                  : [...prev, q.id],
                              )
                            }
                          >
                            <span>{q.question}</span>
                            <ChevronDown size={19} />
                          </button>
                          {openFaq.includes(q.id) && <p>{q.answer}</p>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={CircleHelp}
                      title="FAQ belum tersedia"
                      description="Panitia bisa menyusun pertanyaan dan jawaban sendiri melalui builder."
                    />
                  )}
                </section>
                <aside className="panel written-rules">
                  <div className="panel-heading">
                    <div>
                      <div className="kicker">OFFICIAL RULEBOOK</div>
                      <h2>
                        <BookOpen size={19} /> Peraturan Turnamen
                      </h2>
                    </div>
                  </div>
                  {e.writtenRules.length ? (
                    <div className="full-rules">
                      {Array.from(
                        new Set(e.writtenRules.map((x) => x.group)),
                      ).map((group) => (
                        <div className="rules-group" key={group}>
                          <h3>
                            <ShieldCheck size={17} />
                            {group}
                          </h3>
                          {e.writtenRules
                            .filter((x) => x.group === group)
                            .map((r, i) => (
                              <div key={r.id} className="rules-line">
                                <span>{i + 1}.</span>
                                <p>{r.content}</p>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      icon={BookOpen}
                      title="Belum ada peraturan"
                      description="Tidak ada aturan yang di-hardcode dari broadcast sebelumnya."
                    />
                  )}
                </aside>
              </div>
            </div>
          )}
          <footer className="site-footer">
            <span>© GALATAMA ARENA • COMMUNITY TOURNAMENT SYSTEM</span>
            <span>
              <CloudOff size={14} /> Versi prototipe lokal • Belum sinkron
              realtime
            </span>
          </footer>
        </main>
      </div>
      {scoreOpen && (
        <ScoreModal store={store} onClose={() => setScoreOpen(false)} />
      )}
      {admin && (
        <div className="floating-tools">
          <button
            title="Export semua turnamen ke JSON"
            onClick={() =>
              downloadArena(
                store.data,
                `galatama-arena-backup-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            <Download size={17} />
            <span>Backup</span>
          </button>
          <button
            title="Import backup JSON"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={17} />
            <span>Import</span>
          </button>
          <input
            type="file"
            ref={fileRef}
            hidden
            accept=".json,application/json"
            onChange={(ev) => void load(ev.target.files?.[0])}
          />
        </div>
      )}
    </div>
  );
}

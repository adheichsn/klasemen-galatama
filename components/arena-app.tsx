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
  ChartNoAxesCombined,
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
import { TournamentAnalytics } from "@/components/tournament-analytics";
import {
  downloadArena,
  fmt,
  isReversed,
  squadContribution,
  standings,
  timeLabel,
} from "@/lib/arena-utils";
import type { ArenaEvent, EventMode, EventStatus } from "@/lib/arena-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { validBannerUrl } from "@/lib/banner";
import { tournamentReadiness } from "@/lib/tournament-readiness";
import ArenaBuilder from "./arena-builder";
import { AdminCommandCenter } from "@/components/admin/admin-command-center";
import ScoreModal from "./arena-score-modal";
import FinalizationReview from "@/components/admin/finalization-review";
import { HistoricalEntryPanel } from "@/components/admin/historical-entry-panel";
import HistoricalFinalizationReview from "@/components/admin/historical-finalization-review";
import ScoreAuditDialog from "@/components/admin/score-audit-dialog";
import PermanentDeleteDialog from "@/components/admin/permanent-delete-dialog";

type Page =
  | "home"
  | "events"
  | "analytics"
  | "archives"
  | "hall"
  | "faq"
  | "builder"
  | "trash";
const mainNav: { id: Page; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Dashboard", icon: LayoutDashboard },
  { id: "events", label: "Turnamen", icon: CalendarDays },
  { id: "analytics", label: "Statistik Turnamen", icon: ChartNoAxesCombined },
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
    <div className="empty-state flex items-center flex-col text-center justify-center p-[42px_22px] gap-[7px]">
      <div className="empty-illustration w-[62px] h-[62px] [background:radial-gradient(circle,_#e5efff,_#f4f8ff)] rounded-[19px] flex items-center justify-center text-[#6790df] mb-[8px]">
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
    <motion.article
      initial={{ opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.24 }}
      className="event-tile bg-white [border:1px_solid_var(--line)] rounded-[15px] overflow-hidden [transition:transform_.2s,_box-shadow_.2s] shadow-[var(--shadow)] min-w-[0]"
    >
      <button
        className="event-cover [background:linear-gradient(120deg,_#0c214c,_#174799_63%,_#377cf0)] w-full h-[157px] relative flex justify-center items-center overflow-hidden text-white text-left"
        onClick={onOpen}
        aria-label={`Buka ${e.title}`}
      >
        {e.bannerUrl && validBannerUrl(e.bannerUrl) && (
          <>
            <span
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${e.bannerUrl}")` }}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-[#0a214a]/90 to-[#0a214a]/10" />
          </>
        )}
        <span className="cover-grid" />
        <span className="cover-ring absolute left-[50%] top-[45%] [transform:translate(-50%,_-50%)] h-[180px] w-[180px] rounded-full [border:1px_solid_rgba(195,_230,_255,_.25)] shadow-[0_0_0_26px_rgba(255,_255,_255,_.045),_0_0_0_58px_rgba(255,_255,_255,_.025)]" />
        <Fish
          size={65}
          className="cover-fish absolute [transform:rotate(-22deg)] text-[#a3dfff] opacity-[.68]"
        />
        <span className="cover-label absolute left-[16px] top-[14px] text-[#fff] text-[10px] font-extrabold tracking-[1.4px]">
          WEJI <b>ARENA</b>
        </span>
        <span className="cover-bottom absolute bottom-[12px] left-[15px] right-[15px] flex justify-between items-center gap-[10px] text-[10px] font-extrabold text-[#b8d4ff]">
          <span
            className={`status-chip inline-flex items-center justify-center p-[5px_10px] rounded-[20px] text-[10px] font-extrabold whitespace-nowrap ${e.status}`}
          >
            {statusText[e.status]}
          </span>
          <span>{e.mode.toUpperCase()}</span>
        </span>
      </button>
      <div className="event-tile-body p-[18px]">
        <div className="event-meta flex gap-[13px] flex-wrap text-[#93a2b6] text-[10px]">
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
        <div className="event-tile-foot [border-top:1px_dashed_#e6edf7] mt-[14px] p-[12px_0] flex items-center justify-between gap-[8px] text-[#7187a5] text-[10px]">
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
        <div className="event-tile-actions flex gap-[7px]">
          <button
            className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
            onClick={onOpen}
          >
            Lihat Detail <ArrowRight size={15} />
          </button>
          {admin && onDuplicate && (
            <button
              className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
              title="Duplikat aturan (tanpa skor dan peserta)"
              onClick={onDuplicate}
            >
              <Copy size={16} />
            </button>
          )}
          {admin && onDelete && (
            <button
              className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
              title="Pindahkan ke Trash (termasuk event berskor)"
              onClick={onDelete}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
export default function ArenaApp() {
  const store = useArena();
  const e = store.active;
  const [page, setPage] = useState<Page>("home");
  const admin = true;
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [finalReviewOpen, setFinalReviewOpen] = useState(false);
  const [historicalReviewOpen, setHistoricalReviewOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState<"all" | EventStatus>("all");
  const [eventModeFilter, setEventModeFilter] = useState<"all" | EventMode>(
    "all",
  );
  const [archiveModeFilter, setArchiveModeFilter] = useState<"all" | EventMode>(
    "all",
  );
  const [selectedSquad, setSelectedSquad] = useState("");
  const [notice, setNotice] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const manageEvent = async (
    id: string,
    action: "trash" | "restore" | "delete",
    title?: string,
  ) => {
    const result = await store.eventLifecycle(id, action, title);
    setNotice(
      result.ok
        ? action === "trash"
          ? "Turnamen berhasil dipindah ke Trash dan tidak lagi terlihat publik."
          : action === "restore"
            ? "Turnamen berhasil dipulihkan sebagai event tidak dipublikasikan."
            : "Turnamen dan seluruh transaksi skornya telah dihapus permanen."
        : result.error || "Gagal memproses turnamen.",
    );
    if (result.ok && action === "delete") setDeleteTarget(null);
    return result.ok;
  };
  const moveToTrash = async (event: ArenaEvent) => {
    if (
      !window.confirm(
        `Pindahkan "${event.title}" ke Trash?\n\nEvent akan langsung disembunyikan dari publik, termasuk leaderboard dan Hall of Fame. Skor tetap tersimpan dan bisa dipulihkan.`,
      )
    )
      return;
    await manageEvent(event.id, "trash");
  };
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
    if (e.status === "finished") {
      setNotice(
        "Hasil final sudah terkunci. Duplikat turnamen untuk membuat edisi baru.",
      );
      return;
    }
    if (next === "live" && e.historical) {
      setNotice("Event historis tidak boleh menjalankan timer. Gunakan Review & Finalisasi Arsip.");
      return;
    }
    if (next === "live" && e.status === "draft") {
      if (store.dirty) {
        setNotice(
          "Simpan konfigurasi turnamen ke Server terlebih dahulu sebelum Mulai.",
        );
        return;
      }
      if (!tournamentReadiness(e).canStart) {
        setNotice(
          "Lengkapi ikan aktif serta roster SOLO/SQUAD yang valid sebelum memulai pertandingan.",
        );
        go("builder");
        return;
      }
      if (
        !window.confirm(
          "Mulai pertandingan dan langsung jalankan hitung mundur? Setelah mulai, durasi tidak bisa diubah.",
        )
      )
        return;
    }
    if (next === "finished") {
      if (e.status !== "live") return;
      setFinalReviewOpen(true);
      return;
    }
    store.status(next);
    setNotice(
      "Perubahan status belum diterbitkan. Klik Simpan ke Server agar terlihat di website publik.",
    );
  };
  const load = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 15_000_000)
        throw new Error("File terlalu besar (maksimum 15 MB).");
      const parsed: unknown = JSON.parse(await file.text());
      if (
        !window.confirm(
          "Import backup akan mengganti data yang sedang diedit. Data server belum berubah sampai klik Simpan ke Server. Lanjutkan?",
        )
      )
        return;
      if (!store.importBackup(parsed))
        throw new Error(
          "Format JSON tidak sesuai Arena V2 atau versi lama V1.",
        );
      setNotice(
        "Backup dimuat. Klik Simpan ke Server untuk mempublikasikan perubahan.",
      );
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
  const cancelled = new Set(
    e.entries.filter((x) => x.reversesEntryId).map((x) => x.reversesEntryId),
  );
  const catchCount = e.entries
    .filter((x) => x.kind === "catch" && !cancelled.has(x.id))
    .reduce((a, x) => a + (x.quantity || 1), 0);
  const recent = e.entries.slice(0, 6);
  const trashedEvents = store.data.events.filter((x) => !!x.trashedAt);
  const finished = store.data.events.filter(
    (x) => !x.trashedAt && x.status === "finished" && (admin || x.published),
  );
  const visibleEvents = store.data.events.filter(
    (x) =>
      !x.trashedAt &&
      (admin || x.published) &&
      (eventModeFilter === "all" || x.mode === eventModeFilter) &&
      (eventFilter === "all" || x.status === eventFilter) &&
      `${x.title} ${x.location}`
        .toLowerCase()
        .includes(eventSearch.toLowerCase()),
  );
  const squadView =
    e.mode === "squad"
      ? e.squads.find((x) => x.id === selectedSquad) || e.squads[0]
      : undefined;
  const navItem = (item: { id: Page; label: string; icon: typeof Home }) => {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        className={`nav-item flex items-center gap-[13px] relative w-full p-[13px_14px] rounded-[10px] mb-[6px] text-[#aabbd9] bg-transparent text-left text-[13px] font-bold [transition:.2s_ease] ${page === item.id ? "active" : ""}`}
        onClick={() => go(item.id)}
      >
        <Icon size={19} strokeWidth={page === item.id ? 2.3 : 1.9} />
        <span>{item.label}</span>
        {page === item.id && (
          <span className="nav-current ml-[auto] h-[6px] w-[6px] bg-[#8ec8ff] rounded-full" />
        )}
      </button>
    );
  };
  if (!store.ready)
    return (
      <div className="loading-screen min-h-screen flex flex-col items-center justify-center gap-[14px] text-[#2969ee] bg-[#f5f8ff]">
        <Fish size={36} />
        <b>
          WEJI <span>ARENA</span>
        </b>
        <p>{store.connectionError || "Mengambil data dari server..."}</p>
        {store.connectionError && (
          <button
            className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
            onClick={() => window.location.reload()}
          >
            Coba Lagi
          </button>
        )}
      </div>
    );
  return (
    <div className="arena-root min-h-screen">
      {mobileMenu && (
        <button
          aria-label="Tutup menu"
          className="mobile-backdrop hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside
        className={`sidebar fixed left-[0] top-[0] bottom-[0] w-[258px] [background:linear-gradient(165deg,_#111e3f_0%,_#0a1732_72%,_#0c1d40_100%)] text-[#d2dff7] z-[30] flex flex-col [border-right:1px_solid_rgba(255,_255,_255,_.07)] ${mobileMenu ? "mobile-open" : ""}`}
      >
        <div className="brand-area h-[99px] p-[25px_23px] flex gap-[11px] items-center [border-bottom:1px_solid_rgba(255,_255,_255,_.08)]">
          <div className="brand-mark w-[45px] h-[45px] rounded-[14px] [background:linear-gradient(135deg,_#4b9cff,_#2458e6)] flex items-center justify-center text-white shadow-[0_9px_24px_rgba(33,_104,_245,_.35)]">
            <Fish size={25} />
          </div>
          <div className="brand-name flex flex-col gap-[4px]">
            <strong>
              WEJI<span>ARENA</span>
            </strong>
            <small>FISH IT TOURNAMENTS</small>
          </div>
          <button
            className="mobile-close icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
            onClick={() => setMobileMenu(false)}
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="sidebar-nav p-[29px_13px] flex-1 overflow-auto">
          <div className="sidebar-caption text-[10px] tracking-[1.5px] font-extrabold text-[#6680ae] m-[0_14px_13px]">
            MENU UTAMA
          </div>
          {mainNav.map(navItem)}
          {admin && (
            <>
              <div className="sidebar-caption text-[10px] tracking-[1.5px] font-extrabold text-[#6680ae] m-[0_14px_13px] admin-caption mt-[34px]">
                PANEL PANITIA
              </div>
              {navItem({
                id: "builder",
                label: "Tournament Builder",
                icon: Settings2,
              })}
              {navItem({
                id: "trash",
                label: `Recycle Bin (${trashedEvents.length})`,
                icon: Trash2,
              })}
            </>
          )}
        </div>
        <div className="sidebar-bottom mt-[auto] p-[15px_14px_23px]">
          <div className="storage-warning flex items-center gap-[10px] [background:rgba(68,_107,_173,_.16)] [border:1px_solid_rgba(161,_189,_238,_.12)] rounded-[12px] p-[12px]">
            <CloudOff size={18} />
            <div>
              <strong>Database Terpusat</strong>
              <span>Simpan perubahan melalui header</span>
            </div>
          </div>
          <div className="sidebar-signoff flex items-center gap-[7px] m-[22px_5px_0] text-[#6d8dbb] text-[9px] font-extrabold tracking-[1.1px]">
            <span className="online-dot h-[6px] w-[6px] bg-[#3bc6bb] rounded-full shadow-[0_0_0_4px_rgba(59,_198,_187,_.1)]" />{" "}
            READY TO COMPETE <Waves size={15} />
          </div>
        </div>
      </aside>
      <div className="main-column ml-[258px] min-h-screen">
        <header className="topbar bg-[#fff] [border-bottom:1px_solid_var(--line)] h-[76px] flex items-center justify-between p-[0_34px] gap-[16px] sticky top-[0] z-[20]">
          <button
            className="mobile-menu icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
            onClick={() => setMobileMenu(true)}
            aria-label="Buka menu"
          >
            <Menu size={22} />
          </button>
          <div className="breadcrumbs flex items-center gap-[11px] text-[11px] text-[#98a5b7] font-extrabold tracking-[1.1px]">
            <span>WEJI ARENA</span>
            <ChevronRight size={15} />
            <b>
              {
                [
                  ...mainNav,
                  { id: "builder", label: "Tournament Builder" },
                  { id: "trash", label: "Recycle Bin" },
                ].find((x) => x.id === page)?.label
              }
            </b>
            <Badge
              tone={e.mode === "solo" ? "blue" : "amber"}
              className="hidden sm:inline-flex"
            >
              {e.mode.toUpperCase()}
            </Badge>
          </div>
          <div className="topbar-end flex items-center gap-[21px]">
            <span className="topbar-date text-[10px] tracking-[1.15px] text-[#96a5bb] font-extrabold">
              FISH IT COMMUNITY HUB
            </span>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary !hidden sm:!inline-flex"
            >
              <Eye size={15} /> Lihat Publik
            </a>
            <button
              className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
              disabled={!store.dirty || store.saving || store.eventBusy}
              onClick={() => void store.save()}
            >
              <CheckCircle2 size={16} />
              {store.saving
                ? "Menyimpan..."
                : store.dirty
                  ? "Simpan ke Server"
                  : "Tersimpan"}
            </button>
            <button
              className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
              aria-label="Logout"
              title="Logout Panitia"
              onClick={async () => {
                if (
                  store.dirty &&
                  !window.confirm(
                    "Ada perubahan belum disimpan. Logout sekarang akan membuang perubahan tersebut. Tetap logout?",
                  )
                )
                  return;
                await fetch("/api/admin/logout", { method: "POST" });
                window.location.assign("/admin/login");
              }}
            >
              <LockKeyhole size={18} />
            </button>
          </div>
        </header>
        <main className="main-content p-[29px_35px_0] max-w-[1760px] m-[0_auto]">
          {store.migrated && (
            <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6] migrate">
              <CheckCircle2 size={18} /> Data dari klasemen V1 berhasil
              dimigrasikan sebagai event Squad. Backup V1 asli tetap tersimpan
              dengan key lama.
            </div>
          )}
          {notice && (
            <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6] notice-dismiss mb-[18px]">
              <Info size={18} />
              {notice}
              <button
                className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
                title="Tutup pesan"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {store.dirty && (
            <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6] warning">
              <Info size={18} /> Ada perubahan yang belum dikirim ke server.
              Klik <b>Simpan ke Server</b> sebelum membagikan klasemen.
            </div>
          )}
          {store.saveError && (
            <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6] warning">
              <Info size={18} /> {store.saveError}{" "}
              <button
                className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                onClick={() => window.location.reload()}
              >
                Muat Ulang
              </button>
            </div>
          )}
          {page === "home" && (
            <div className="section-stack home-page">
              <div className="hero-banner rounded-[21px] min-h-[270px] relative overflow-hidden flex [background:linear-gradient(110deg,_#101d42_5%,_#142c66_63%,_#2264ce_100%)] text-white shadow-[0_20px_40px_rgba(20,_45,_99,_.09)]">
                <div className="hero-glow" />
                <div className="hero-copy relative z-[2] p-[36px_39px] flex-1 max-w-[70%] flex flex-col items-start">
                  <div className="hero-kicker flex items-center gap-[8px] text-[#98c5ff] text-[10px] font-extrabold tracking-[1.45px]">
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
                  <div className="hero-details flex flex-wrap gap-[20px] mt-[17px] text-[11px] font-bold text-[#b0caf1]">
                    <span>
                      <MapPin size={15} />
                      {e.location || "Semua pulau"}
                    </span>
                    <span>
                      <CalendarDays size={15} />
                      {prettyDate(e.eventDate)}
                    </span>
                    <span className="!border !border-blue-300/40 !bg-blue-500/20 !text-white">
                      <Users size={15} /> MODE{" "}
                      {e.mode === "solo" ? "SOLO • INDIVIDU" : "SQUAD • TIM"}
                    </span>
                  </div>
                  <div className="hero-actions flex gap-[10px] flex-wrap mt-[23px]">
                    {admin && (
                      <button
                        className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] hero-button bg-white text-[#1b4ab9]"
                        onClick={() => go("builder")}
                      >
                        <Settings2 size={16} /> Kelola Event{" "}
                        <ArrowRight size={16} />
                      </button>
                    )}
                    <button
                      className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] hero-outline text-white border-[rgba(206,_227,_255,_.27)] [background:rgba(255,_255,_255,_.07)]"
                      onClick={() => go("events")}
                    >
                      Semua Turnamen <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="hero-art w-[39%] relative min-w-[220px] flex items-center justify-center text-[#b2d8ff]">
                  <div className="orb absolute [border:1px_solid_rgba(176,_220,_255,_.17)] rounded-full orb-one w-[265px] h-[265px] shadow-[0_0_0_37px_rgba(151,_203,_255,_.045),_0_0_0_72px_rgba(151,_203,_255,_.025)]" />
                  <div className="orb absolute [border:1px_solid_rgba(176,_220,_255,_.17)] rounded-full orb-two w-[158px] h-[158px] [background:radial-gradient(circle,_rgba(56,_159,_255,_.23),_rgba(23,_65,_148,_.15))] shadow-[inset_0_0_35px_rgba(102,_190,_255,_.1)]" />
                  <div className="hero-art-center">
                    <Fish size={105} strokeWidth={1.2} />
                  </div>
                  <span className="hero-art-txt absolute bottom-[21px] right-[32px] tracking-[3.6px] text-[11px] font-extrabold text-right text-[#82b8ff] leading-[1.4]">
                    THE NEXT
                    <br />
                    CHAMPION
                  </span>
                </div>
              </div>
              {e.historical && e.status === "draft" && (
                <HistoricalEntryPanel
                  store={store}
                  onConfigure={() => go("builder")}
                  onCatch={() => setScoreOpen(true)}
                  onReview={() => setHistoricalReviewOpen(true)}
                />
              )}
              <AdminCommandCenter
                event={e}
                dirty={store.dirty}
                onOpenScore={() => setScoreOpen(true)}
                onOpenBuilder={() => go("builder")}
                onOpenEvents={() => go("events")}
              />
              <div className="stats-grid grid grid-cols-4 gap-[16px]">
                <div className="stat-card min-w-[0] flex items-center gap-[15px] bg-white p-[21px_18px] rounded-[15px] [border:1px_solid_var(--line)] shadow-[var(--shadow)]">
                  <div className="stat-icon w-[49px] h-[49px] rounded-[14px] flex items-center justify-center shrink-0 blue">
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
                <div className="stat-card min-w-[0] flex items-center gap-[15px] bg-white p-[21px_18px] rounded-[15px] [border:1px_solid_var(--line)] shadow-[var(--shadow)]">
                  <div className="stat-icon w-[49px] h-[49px] rounded-[14px] flex items-center justify-center shrink-0 violet">
                    <Trophy size={21} />
                  </div>
                  <div>
                    <span>TOTAL POIN</span>
                    <strong>{fmt(totalScore)}</strong>
                    <small>Akumulasi pertandingan</small>
                  </div>
                </div>
                <div className="stat-card min-w-[0] flex items-center gap-[15px] bg-white p-[21px_18px] rounded-[15px] [border:1px_solid_var(--line)] shadow-[var(--shadow)]">
                  <div className="stat-icon w-[49px] h-[49px] rounded-[14px] flex items-center justify-center shrink-0 cyan">
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
                <div className="stat-card min-w-[0] flex items-center gap-[15px] bg-white p-[21px_18px] rounded-[15px] [border:1px_solid_var(--line)] shadow-[var(--shadow)]">
                  <div className="stat-icon w-[49px] h-[49px] rounded-[14px] flex items-center justify-center shrink-0 gold">
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
              <div className="dashboard-columns grid grid-cols-[minmax(0,_1.65fr)_minmax(300px,_1fr)] gap-[17px] items-stretch">
                <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] podium-panel min-h-[365px]">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        HALL OF CHAMPIONS
                      </div>
                      <h2>
                        <Crown size={20} /> Top 3{" "}
                        {e.mode === "solo" ? "Peserta SOLO" : "SQUAD"}
                      </h2>
                    </div>
                    <span
                      className={`status-chip inline-flex items-center justify-center p-[5px_10px] rounded-[20px] text-[10px] font-extrabold whitespace-nowrap ${e.status}`}
                    >
                      {statusText[e.status]}
                    </span>
                  </div>
                  {ranking.length ? (
                    <div className="podium flex items-end justify-center gap-[13px] h-[265px] p-[10px_23px_25px]">
                      <div className="podium-slot flex flex-col items-center w-[30%] max-w-[180px] min-w-[0] text-center relative second">
                        {ranking[1] && (
                          <>
                            <div className="podium-medal absolute top-[-19px] bg-[#f3f6fc] text-[#8ca1c3] text-[10px] w-[25px] h-[25px] flex items-center justify-center rounded-full font-extrabold">
                              2
                            </div>
                            <div className="podium-avatar flex items-center justify-center rounded-full [border:4px_solid_#fff] shadow-[0_4px_18px_#dfe5f5] h-[57px] w-[57px] text-white silver">
                              <Medal size={24} />
                            </div>
                            <strong>{ranking[1].name}</strong>
                            <small>{ranking[1].subtitle}</small>
                            <span>{fmt(ranking[1].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base w-full h-[56px] rounded-[10px_10px_6px_6px] flex items-center justify-center [background:linear-gradient(#e9eef9,_#f4f7fe)] text-[#9db1d5]">
                          <b>02</b>
                        </div>
                      </div>
                      <div className="podium-slot flex flex-col items-center w-[30%] max-w-[180px] min-w-[0] text-center relative first">
                        {ranking[0] && (
                          <>
                            <div className="podium-crown absolute top-[-22px] text-[#f9b74d]">
                              <Crown size={25} />
                            </div>
                            <div className="podium-avatar flex items-center justify-center rounded-full [border:4px_solid_#fff] shadow-[0_4px_18px_#dfe5f5] h-[57px] w-[57px] text-white gold">
                              <Trophy size={29} />
                            </div>
                            <strong>{ranking[0].name}</strong>
                            <small>{ranking[0].subtitle}</small>
                            <span>{fmt(ranking[0].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base w-full h-[56px] rounded-[10px_10px_6px_6px] flex items-center justify-center [background:linear-gradient(#e9eef9,_#f4f7fe)] text-[#9db1d5]">
                          <b>01</b>
                        </div>
                      </div>
                      <div className="podium-slot flex flex-col items-center w-[30%] max-w-[180px] min-w-[0] text-center relative third">
                        {ranking[2] && (
                          <>
                            <div className="podium-medal absolute top-[-19px] bg-[#f3f6fc] text-[#8ca1c3] text-[10px] w-[25px] h-[25px] flex items-center justify-center rounded-full font-extrabold">
                              3
                            </div>
                            <div className="podium-avatar flex items-center justify-center rounded-full [border:4px_solid_#fff] shadow-[0_4px_18px_#dfe5f5] h-[57px] w-[57px] text-white bronze">
                              <Medal size={24} />
                            </div>
                            <strong>{ranking[2].name}</strong>
                            <small>{ranking[2].subtitle}</small>
                            <span>{fmt(ranking[2].points)} PTS</span>
                          </>
                        )}
                        <div className="podium-base w-full h-[56px] rounded-[10px_10px_6px_6px] flex items-center justify-center [background:linear-gradient(#e9eef9,_#f4f7fe)] text-[#9db1d5]">
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
                            className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                            onClick={() => go("builder")}
                          >
                            Tambah Peserta <ArrowRight size={15} />
                          </button>
                        ) : undefined
                      }
                    />
                  )}
                </section>
                <div className="right-rail grid gap-[17px]">
                  <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] timer-panel pb-[16px]">
                    <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                      <div>
                        <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                          MATCH CONTROL
                        </div>
                        <h2>
                          <Clock3 size={19} /> Waktu Pertandingan
                        </h2>
                      </div>
                      <div
                        className={`live-indicator flex gap-[7px] items-center text-[10px] text-[#90a1b6] font-extrabold ${e.status === "live" ? "is-live" : ""}`}
                      >
                        <span />
                        {e.status === "finished"
                          ? "FINAL"
                          : e.status === "live"
                            ? store.remaining === 0
                              ? "TIME UP"
                              : e.timer.runningSince === null
                                ? "PAUSED"
                                : "LIVE"
                            : "DRAFT"}
                      </div>
                    </div>
                    <div className="timer-face m-[3px_23px_13px] [background:linear-gradient(135deg,_#f4f8ff,_#eef5ff)] [border:1px_solid_#e5eefc] rounded-[13px] p-[15px_12px] text-center flex flex-col gap-[3px]">
                      <span>COUNTDOWN TIMER</span>
                      <strong>{timeLabel(store.remaining)}</strong>
                      <div>
                        Durasi {fmt(e.timer.durationSec / 60)} menit •{" "}
                        {e.mode.toUpperCase()}
                      </div>
                      <div
                        className="mt-3 h-2 w-full overflow-hidden rounded-full bg-blue-100"
                        aria-label="Progres waktu pertandingan"
                      >
                        <div
                          className={`h-full rounded-full transition-[width] duration-500 ${store.remaining === 0 ? "bg-rose-500" : "bg-blue-600"}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, (100 * store.remaining) / Math.max(1, e.timer.durationSec)))}%`,
                          }}
                        />
                      </div>
                      {e.historical && <p className="mt-2 text-xs font-bold text-blue-700">Arsip historis · pertandingan asli {e.eventDate || "belum diberi tanggal"} · tidak memakai timer LIVE</p>}
                      {e.status === "finished" && (
                        <div className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-700">
                          <LockKeyhole size={14} /> Hasil final terkunci{" "}
                          {e.finishedAt
                            ? `• ${new Date(e.finishedAt).toLocaleDateString("id-ID")}`
                            : ""}
                        </div>
                      )}
                    </div>
                    {admin && !e.historical && (
                      <div className="timer-controls flex gap-[9px] m-[0_23px]">
                        <button
                          className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                          disabled={
                            e.status !== "live" ||
                            (store.remaining === 0 &&
                              e.timer.runningSince === null)
                          }
                          onClick={() => {
                            if (store.dirty) {
                              setNotice(
                                "Simpan skor dan perubahan sebelumnya ke Server sebelum Pause/Resume timer.",
                              );
                              return;
                            }
                            store.toggleTimer();
                            setNotice(
                              "Waktu server mulai berlaku setelah Simpan ke Server. Simpan segera agar sinkron dengan penonton.",
                            );
                          }}
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
                          className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] bordered"
                          title="Reset timer"
                          disabled={e.status !== "draft"}
                          onClick={() => {
                            if (window.confirm("Reset durasi draft ke awal?"))
                              store.resetTimer();
                          }}
                        >
                          <RotateCcw size={18} />
                        </button>
                      </div>
                    )}
                    {admin && (
                      <div className="event-status-control m-[5px_23px_0]">
                        {e.status === "draft" && e.historical ? (
                          <button type="button" className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold" onClick={() => setHistoricalReviewOpen(true)} disabled={store.dirty || store.eventBusy}>
                            <Archive size={15} /> Review & Finalisasi Arsip <ArrowRight size={15} />
                          </button>
                        ) : e.status === "draft" ? (
                          <button
                            className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
                            onClick={() => setEventStatus("live")}
                          >
                            <Radio size={15} /> Mulai pertandingan{" "}
                            <ArrowRight size={15} />
                          </button>
                        ) : e.status === "live" ? (
                          <button
                            className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold danger-text !text-[#df4b61]"
                            onClick={() => setEventStatus("finished")}
                          >
                            <Flag size={15} /> Akhiri & arsipkan{" "}
                            <ArrowRight size={15} />
                          </button>
                        ) : (
                          <button
                            className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
                            disabled
                            type="button"
                          >
                            <LockKeyhole size={15} /> Final terkunci • kelola
                            arsip melalui Trash
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                  <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] glance-panel flex flex-col">
                    <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                      <div>
                        <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                          QUICK OVERVIEW
                        </div>
                        <h2>
                          <Sparkles size={19} /> Aturan Penilaian
                        </h2>
                      </div>
                      {admin && (
                        <button
                          className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
                          onClick={() => go("builder")}
                          title="Ubah aturan"
                        >
                          <Settings2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="glance-list p-[0_23px]">
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
                        className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
                        onClick={() => go("builder")}
                      >
                        Konfigurasi scoring <ArrowRight size={16} />
                      </button>
                    )}
                  </section>
                </div>
              </div>
              <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] standings-panel overflow-hidden">
                <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px] leaderboard-header pb-[20px]">
                  <div>
                    <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                      THE LEADERBOARD
                    </div>
                    <h2>
                      <Trophy size={20} /> Klasemen{" "}
                      {e.mode === "solo" ? "SOLO • Individu" : "SQUAD • Tim"}
                    </h2>
                    <p>
                      {e.mode === "solo"
                        ? "Setiap pemain bertanding sendiri; tidak ada poin gabungan squad."
                        : "Peringkat dihitung dari akumulasi tangkapan seluruh anggota dalam squad yang sama."}
                    </p>
                  </div>
                  <div className="leaderboard-tools flex gap-[10px] items-center">
                    <label className="searchbox flex items-center gap-[10px] p-[0_12px] bg-[#f7f9fd] [border:1px_solid_#e3eaf5] rounded-[10px] min-h-[42px] min-w-[220px] text-[#8b9cb2]">
                      <Search size={17} />
                      <input
                        value={search}
                        onChange={(ev) => setSearch(ev.target.value)}
                        placeholder="Cari peserta / squad..."
                      />
                    </label>
                    {admin && (
                      <button
                        className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                        disabled={e.status !== "live" && !(e.historical && e.status === "draft")}
                        onClick={() => setScoreOpen(true)}
                      >
                        <Plus size={17} /> Input Tangkapan
                      </button>
                    )}
                  </div>
                </div>
                {found.length ? (
                  <div className="table-scroll w-full overflow-auto">
                    <table className="leaderboard-table [border-collapse:collapse] min-w-[600px] w-full text-left">
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
                                  className={`table-rank inline-flex items-center justify-center w-[33px] h-[33px] rounded-[10px] bg-[#f0f4fb] text-[11px] font-extrabold text-[#7b8fae] ${standMedals[rank - 1] || ""}`}
                                >
                                  {String(rank).padStart(2, "0")}
                                </span>
                              </td>
                              <td>
                                <div className="player-name flex gap-[10px] items-center">
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
                                    <Crown
                                      size={16}
                                      className="crown-small text-[#eab058]"
                                    />
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className="catch-count inline-flex items-center gap-[6px] text-[#6e829f]">
                                  <Fish size={15} />
                                  {fmt(row.catches)}
                                </span>
                              </td>
                              <td>
                                <strong className="points-cell text-[16px] text-[#225de6]">
                                  {fmt(row.points)} <small>PTS</small>
                                </strong>
                              </td>
                              <td>
                                <span className="ranking-label text-[9px] tracking-[.5px] font-extrabold text-[#90a0b7]">
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
                          className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                          onClick={() => go("builder")}
                        >
                          Kelola Peserta <ArrowRight size={15} />
                        </button>
                      ) : undefined
                    }
                  />
                )}
              </section>
              {e.mode === "squad" && (
                <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] !overflow-visible">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        SQUAD MODE • TEAM CONTRIBUTION
                      </div>
                      <h2>
                        <Users size={19} /> Kontribusi Anggota Squad
                      </h2>
                      <p>
                        Rincian poin setiap pemancing di dalam squad terpilih.
                      </p>
                    </div>
                    <Badge tone="amber">KHUSUS SQUAD</Badge>
                  </div>
                  {e.squads.length ? (
                    <div className="px-5 pb-5">
                      <div className="mb-4 flex flex-wrap gap-2">
                        {e.squads.map((team) => (
                          <Button
                            key={team.id}
                            size="sm"
                            variant={
                              squadView?.id === team.id
                                ? "default"
                                : "secondary"
                            }
                            onClick={() => setSelectedSquad(team.id)}
                          >
                            {team.name}
                          </Button>
                        ))}
                      </div>
                      {squadView && (
                        <div className="overflow-x-auto rounded-xl border border-slate-200">
                          <table className="w-full min-w-[420px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs text-slate-500">
                              <tr>
                                <th className="px-4 py-3">ANGGOTA</th>
                                <th className="px-4 py-3">TANGKAPAN</th>
                                <th className="px-4 py-3 text-right">
                                  KONTRIBUSI
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {squadContribution(e, squadView.id).map(
                                (member) => (
                                  <tr key={member.id}>
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                      {member.name}
                                      <span className="ml-2 font-normal text-slate-400">
                                        {member.username
                                          ? "@" + member.username
                                          : ""}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">
                                      {fmt(member.catches)} ikan
                                    </td>
                                    <td className="px-4 py-3 text-right font-extrabold text-blue-700">
                                      {fmt(member.points)} PTS
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                          {!squadContribution(e, squadView.id).length && (
                            <p className="p-4 text-sm text-slate-500">
                              Squad ini belum memiliki anggota.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Empty
                      icon={Users}
                      title="Squad belum dibuat"
                      description="Daftarkan squad dan anggota terlebih dahulu pada Tournament Builder."
                    />
                  )}
                </section>
              )}
              <div className="dashboard-columns grid grid-cols-[minmax(0,_1.65fr)_minmax(300px,_1fr)] gap-[17px] items-stretch activity-layout grid-cols-[minmax(0,_1.4fr)_minmax(300px,_1fr)]">
                <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0]">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        MATCH LOG
                      </div>
                      <h2>
                        <History size={19} /> Aktivitas Terbaru
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setAuditOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700"
                      >
                        <ShieldCheck size={15} /> Audit Skor
                      </button>
                      <button
                        className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
                        onClick={() => setHistoryOpen((v) => !v)}
                      >
                        {historyOpen ? "Lebih sedikit" : "Lihat semua"}{" "}
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                  {e.entries.length ? (
                    <div className="activity-list p-[0_23px_12px]">
                      {(historyOpen ? e.entries : recent).map((item) => (
                        <div
                          className="activity-item flex items-center gap-[12px] [border-bottom:1px_solid_#f0f3f9] p-[13px_0]"
                          key={item.id}
                        >
                          <div
                            className={`activity-icon h-[39px] w-[39px] rounded-[12px] flex items-center justify-center text-[#3172df] bg-[#eff5ff] ${item.kind}`}
                          >
                            {item.kind === "catch" ? (
                              <Fish size={18} />
                            ) : item.kind === "reversal" ? (
                              <ArrowDownRight size={18} />
                            ) : (
                              <Activity size={18} />
                            )}
                          </div>
                          <div className="activity-desc min-w-[0] flex-1 flex flex-col gap-[2px]">
                            <strong>
                              {e.participants.find(
                                (p) => p.id === item.participantId,
                              )?.name || "Peserta lama"}
                            </strong>
                            {e.mode === "squad" && (
                              <small>
                                {e.squads.find(
                                  (s) =>
                                    s.id ===
                                    (item.squadId ||
                                      e.participants.find(
                                        (p) => p.id === item.participantId,
                                      )?.squadId),
                                )?.name || "Squad lama"}
                              </small>
                            )}
                            <span>{item.description}</span>
                            <small>
                              {new Date(item.createdAt).toLocaleString("id-ID")}
                            </small>
                          </div>
                          <div className="activity-value flex items-end gap-[3px] flex-col whitespace-nowrap">
                            <strong
                              className={item.delta >= 0 ? "plus" : "minus"}
                            >
                              {item.delta > 0 ? "+" : ""}
                              {fmt(item.delta)} PTS
                            </strong>
                            {admin &&
                              (e.status === "live" || (e.historical && e.status === "draft")) &&
                              item.kind !== "reversal" &&
                              !isReversed(e.entries, item.id) && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Batalkan catatan ini? Input yang belum tersimpan akan dibuang; input yang sudah tersimpan akan dibatalkan dengan transaksi pembalik.",
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
                <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] rules-spotlight">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        COMPETITION GUIDE
                      </div>
                      <h2>
                        <BookOpen size={19} /> Peraturan Event
                      </h2>
                    </div>
                    <button
                      className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
                      onClick={() => go("faq")}
                      title="Lihat peraturan"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </div>
                  {e.writtenRules.length ? (
                    <div className="rule-list-preview p-[0_24px]">
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
                  <button
                    className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
                    onClick={() => go("faq")}
                  >
                    Buka Rules & FAQ <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <section className="section-stack archive-preview">
                <div className="section-top flex items-end justify-between gap-[16px]">
                  <div>
                    <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                      RELIVE THE MOMENT
                    </div>
                    <h2>Arsip Galatama</h2>
                    <p>
                      Lihat hasil pertandingan sebelumnya, pemenang, dan aturan
                      yang digunakan.
                    </p>
                  </div>
                  <button
                    className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                    onClick={() => go("archives")}
                  >
                    Semua Arsip <ArrowRight size={16} />
                  </button>
                </div>
                {finished.length ? (
                  <div className="event-grid grid grid-cols-3 gap-[17px]">
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
                  <div className="subtle-empty p-[20px] flex items-center gap-[11px] text-[#8197b5] text-[12px] bg-[#eff4fd] [border:1px_dashed_#cdddf2] rounded-[12px]">
                    <Archive size={20} /> Arsip akan muncul di sini setelah ada
                    turnamen yang selesai.
                  </div>
                )}
              </section>
            </div>
          )}
          {page === "analytics" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-extrabold tracking-[.16em] text-blue-600">
                    WEJI ARENA ANALYTICS
                  </div>
                  <h2 className="text-2xl font-black text-[#142A55]">
                    Statistik Turnamen
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Data analitik event aktif: {e.title} ({e.mode.toUpperCase()}
                    ). Pilih turnamen lain melalui menu Turnamen.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-extrabold text-blue-700 hover:bg-blue-50"
                  onClick={() => go("events")}
                >
                  Ganti Event
                </button>
              </div>
              {store.dirty && (
                <p
                  role="status"
                  className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800"
                >
                  Statistik ini mencakup perubahan lokal yang belum disimpan.
                  Klik Simpan ke Server untuk menerbitkannya.
                </p>
              )}
              <TournamentAnalytics event={e} />
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
              <div className="page-heading flex justify-between items-center gap-[20px]">
                <div>
                  <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                    EVENT MANAGEMENT
                  </div>
                  <h2>Semua Turnamen</h2>
                  <p>
                    Setiap event mempunyai konfigurasi poin, peserta, dan
                    klasemen tersendiri.
                  </p>
                </div>
                {admin && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        store.create("solo");
                        go("builder");
                      }}
                    >
                      <Plus size={17} /> Turnamen SOLO
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        store.create("squad");
                        go("builder");
                      }}
                    >
                      <Users size={17} /> Turnamen SQUAD
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        store.createHistorical("solo");
                        go("builder");
                      }}
                    >
                      <Archive size={17} /> Arsip Historis SOLO
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        store.createHistorical("squad");
                        go("builder");
                      }}
                    >
                      <Archive size={17} /> Arsip Historis SQUAD
                    </Button>
                  </div>
                )}
              </div>
              <div className="filter-bar flex items-center justify-between gap-[15px]">
                <label className="searchbox flex items-center gap-[10px] p-[0_12px] bg-[#f7f9fd] [border:1px_solid_#e3eaf5] rounded-[10px] min-h-[42px] min-w-[220px] text-[#8b9cb2]">
                  <Search size={17} />
                  <input
                    placeholder="Cari turnamen atau lokasi..."
                    value={eventSearch}
                    onChange={(v) => setEventSearch(v.target.value)}
                  />
                </label>
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  {(["all", "solo", "squad"] as const).map((mode) => (
                    <button
                      key={mode}
                      className={`rounded-lg px-3 py-2 text-xs font-extrabold transition-colors ${eventModeFilter === mode ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-blue-50"}`}
                      onClick={() => setEventModeFilter(mode)}
                    >
                      {mode === "all" ? "SEMUA MODE" : mode.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="filter-buttons flex gap-[5px] bg-[#edf2f9] rounded-[10px] p-[4px] flex-wrap">
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
                <div className="event-grid grid grid-cols-3 gap-[17px]">
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
                      onDelete={admin ? () => void moveToTrash(x) : undefined}
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
                        className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                        onClick={() => {
                          store.create("solo");
                          go("builder");
                        }}
                      >
                        <Plus size={16} />
                        Buat SOLO
                      </button>
                    ) : undefined
                  }
                />
              )}
            </div>
          )}
          {page === "archives" && (
            <div className="section-stack">
              <div className="page-heading flex justify-between items-center gap-[20px]">
                <div>
                  <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                    GALATAMA HISTORY
                  </div>
                  <h2>Arsip Galatama</h2>
                  <p>
                    Dokumentasi hasil final, skor, dan peraturan setiap edisi.
                  </p>
                </div>
                <span className="pill inline-flex items-center gap-[6px] p-[8px_11px] rounded-[100px] text-[11px] font-extrabold whitespace-nowrap neutral">
                  <Archive size={14} /> {finished.length} arsip
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["all", "solo", "squad"] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={
                      archiveModeFilter === mode ? "default" : "secondary"
                    }
                    onClick={() => setArchiveModeFilter(mode)}
                  >
                    {mode === "all" ? "Semua Arsip" : mode.toUpperCase()}
                  </Button>
                ))}
              </div>
              {finished.filter(
                (x) =>
                  archiveModeFilter === "all" || x.mode === archiveModeFilter,
              ).length ? (
                <div className="event-grid grid grid-cols-3 gap-[17px]">
                  {finished
                    .filter(
                      (x) =>
                        archiveModeFilter === "all" ||
                        x.mode === archiveModeFilter,
                    )
                    .map((x) => (
                      <EventTile
                        key={x.id}
                        e={x}
                        admin={admin}
                        onOpen={() => select(x.id)}
                        onDelete={admin ? () => void moveToTrash(x) : undefined}
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
          {page === "trash" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="mb-2 text-[10px] font-black tracking-[1.5px] text-blue-600">
                    EVENT MANAGEMENT
                  </div>
                  <h2 className="text-2xl font-black text-[#142A55]">
                    Recycle Bin
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Event di Trash tersembunyi dari publik. Pulihkan atau hapus
                    permanen, termasuk yang sudah berskor.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-700">
                  {trashedEvents.length} event
                </span>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-800">
                <Info size={17} className="mr-2 inline" />
                Simpan perubahan dashboard terlebih dahulu sebelum menggunakan
                Trash. Restore tidak otomatis mempublikasikan event. Hapus
                permanen tidak bisa dipulihkan.
              </div>
              {trashedEvents.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {trashedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700">
                          {ev.mode.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black text-rose-700">
                          {statusText[ev.status]}
                        </span>
                      </div>
                      <h3 className="break-words text-base font-black text-slate-900">
                        {ev.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Dihapus sementara:{" "}
                        {ev.trashedAt
                          ? new Date(ev.trashedAt).toLocaleString("id-ID")
                          : "—"}
                      </p>
                      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-600">
                        <span>{ev.participants.length} peserta</span>
                        <span>{ev.entries.length} transaksi skor</span>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <button
                          disabled={store.eventBusy || store.dirty}
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40"
                          onClick={() => void manageEvent(ev.id, "restore")}
                        >
                          <RotateCcw size={15} /> Pulihkan
                        </button>
                        <button
                          disabled={store.eventBusy || store.dirty}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                          onClick={() => setDeleteTarget(ev.id)}
                        >
                          <Trash2 size={15} /> Hapus Permanen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Trash2}
                  title="Recycle Bin kosong"
                  description="Event yang dipindahkan dari menu Turnamen atau Arsip akan muncul di sini."
                />
              )}
            </div>
          )}
          {page === "hall" && (
            <div className="section-stack">
              <div className="page-heading flex justify-between items-center gap-[20px]">
                <div>
                  <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                    LEGENDS NEVER FADE
                  </div>
                  <h2>
                    Hall of Fame{" "}
                    <Crown className="title-icon text-[#d5a451]" size={24} />
                  </h2>
                  <p>
                    Para juara dari setiap edisi turnamen yang sudah selesai.
                  </p>
                </div>
                <span className="pill inline-flex items-center gap-[6px] p-[8px_11px] rounded-[100px] text-[11px] font-extrabold whitespace-nowrap neutral">
                  <Trophy size={14} />
                  {finished.length} edisi
                </span>
              </div>
              {finished.length ? (
                <div className="hall-grid grid grid-cols-2 gap-[18px]">
                  {finished.map((ev) => {
                    const top = standings(ev).slice(0, 3);
                    return (
                      <div
                        className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] hall-card p-[23px]"
                        key={ev.id}
                      >
                        <div className="hall-head flex items-center gap-[13px] pb-[17px] [border-bottom:1px_solid_var(--line)]">
                          <div className="hall-icon w-[49px] h-[49px] rounded-[13px] flex items-center justify-center text-[#cd9b31] bg-[#fff6e5]">
                            <Trophy size={23} />
                          </div>
                          <div>
                            <span>EDISI TURNAMEN</span>
                            <h3>{ev.title}</h3>
                            <p>
                              {ev.location || "Map bebas"} •{" "}
                              {prettyDate(ev.eventDate)} •{" "}
                              <b>{ev.mode.toUpperCase()}</b>
                            </p>
                          </div>
                        </div>
                        {top.length ? (
                          top.map((p, i) => (
                            <div
                              className="hall-winner flex items-center gap-[12px] p-[13px_0] [border-bottom:1px_solid_#f1f4f9]"
                              key={p.id}
                            >
                              <span
                                className={`winner-rank w-[37px] h-[29px] flex items-center justify-center rounded-[9px] font-extrabold bg-[#f0f4fb] text-[#8d9bb2] text-[11px] ${standMedals[i]}`}
                              >
                                #{i + 1}
                              </span>
                              <strong>{p.name}</strong>
                              <b>{fmt(p.points)} PTS</b>
                            </div>
                          ))
                        ) : (
                          <p className="hint text-[12px] text-[var(--muted)]">
                            Turnamen ini tidak memiliki peringkat peserta.
                          </p>
                        )}
                        <button
                          className="text-action bg-transparent text-[#2864ee] inline-flex items-center gap-[8px] p-[7px_0] text-[12px] font-extrabold"
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
              <div className="page-heading flex justify-between items-center gap-[20px]">
                <div>
                  <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                    RULES & SUPPORT CENTER
                  </div>
                  <h2>Peraturan & FAQ</h2>
                  <p>
                    Ketentuan pertandingan yang sedang dipilih: <b>{e.title}</b>
                  </p>
                </div>
                {admin && e.status !== "finished" && (
                  <button
                    className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                    onClick={() => go("builder")}
                  >
                    <Settings2 size={16} /> Kelola Isi
                  </button>
                )}
              </div>
              <div className="faq-layout grid grid-cols-[1.25fr_.9fr] gap-[18px] [align-items:start]">
                <section className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] faq-panel">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        PERTANYAAN UMUM
                      </div>
                      <h2>
                        <CircleHelp size={20} /> Frequently Asked Questions
                      </h2>
                    </div>
                  </div>
                  {e.faqs.length ? (
                    <div className="faq-items p-[0_22px_24px]">
                      {e.faqs.map((q) => (
                        <div
                          key={q.id}
                          className={`faq-item [border:1px_solid_#e5ebf4] rounded-[11px] mb-[10px] overflow-hidden ${openFaq.includes(q.id) ? "opened" : ""}`}
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
                <aside className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] written-rules">
                  <div className="panel-heading p-[23px_23px_15px] flex items-center justify-between gap-[15px]">
                    <div>
                      <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">
                        OFFICIAL RULEBOOK
                      </div>
                      <h2>
                        <BookOpen size={19} /> Peraturan Turnamen
                      </h2>
                    </div>
                  </div>
                  {e.writtenRules.length ? (
                    <div className="full-rules p-[0_23px_23px]">
                      {Array.from(
                        new Set(e.writtenRules.map((x) => x.group)),
                      ).map((group) => (
                        <div className="rules-group mb-[19px]" key={group}>
                          <h3>
                            <ShieldCheck size={17} />
                            {group}
                          </h3>
                          {e.writtenRules
                            .filter((x) => x.group === group)
                            .map((r, i) => (
                              <div
                                key={r.id}
                                className="rules-line flex gap-[10px] mb-[11px]"
                              >
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
          <footer className="site-footer mt-[35px] p-[21px_0] [border-top:1px_solid_#e3eaf5] flex items-center justify-between gap-[12px] text-[9px] tracking-[.5px] font-extrabold text-[#a1afc2]">
            <span>© WEJI ARENA • STAFF DASHBOARD</span>
            <span>
              Perubahan tersimpan di PostgreSQL setelah klik Simpan ke Server.
            </span>
          </footer>
        </main>
      </div>
      {deleteTarget &&
        store.data.events.some(
          (ev) => ev.id === deleteTarget && !!ev.trashedAt,
        ) && (
          <PermanentDeleteDialog
            key={deleteTarget}
            event={store.data.events.find((ev) => ev.id === deleteTarget)!}
            busy={store.eventBusy}
            onClose={() => setDeleteTarget(null)}
            onDelete={(title) => manageEvent(deleteTarget, "delete", title)}
          />
        )}
      {historicalReviewOpen && (
        <HistoricalFinalizationReview
          key={e.id}
          event={e}
          busy={store.eventBusy}
          onClose={() => setHistoricalReviewOpen(false)}
          onConfirm={async (title, podium) => {
            const result = await store.finalizeHistorical(title, podium);
            setNotice(result.ok ? "Arsip historis sudah FINISHED, dikunci dan tampil di website publik." : result.error || "Gagal finalisasi arsip.");
            return result;
          }}
        />
      )}
      {finalReviewOpen && (
        <FinalizationReview
          key={e.id}
          event={e}
          dirty={store.dirty}
          onClose={() => setFinalReviewOpen(false)}
          onConfirm={() => {
            store.status("finished");
            setFinalReviewOpen(false);
            setNotice(
              "Review selesai. Klik Simpan ke Server untuk mengunci hasil final secara permanen.",
            );
          }}
        />
      )}
      {auditOpen && (
        <ScoreAuditDialog
          key={e.id}
          eventId={e.id}
          eventTitle={e.title}
          onClose={() => setAuditOpen(false)}
        />
      )}
      {scoreOpen && (
        <ScoreModal
          key={e.id}
          store={store}
          onClose={() => setScoreOpen(false)}
        />
      )}
      {admin && (
        <div className="floating-tools fixed z-[25] right-[18px] bottom-[16px] bg-white [border:1px_solid_#e2eaf6] shadow-[0_12px_35px_#243d6a20] rounded-[11px] p-[6px] flex gap-[5px]">
          <button
            title="Export semua turnamen ke JSON"
            onClick={() =>
              downloadArena(
                store.data,
                `weji-arena-backup-${new Date().toISOString().slice(0, 10)}.json`,
              )
            }
          >
            <Download size={17} />
            <span>Backup</span>
          </button>
          <button
            title="Pulihkan data V2.1 dari localStorage browser"
            onClick={() => {
              if (
                window.confirm(
                  "Pulihkan data dari browser versi lama? Data kerja yang belum disimpan akan terganti. Segera simpan ke server setelah memeriksa hasilnya.",
                )
              ) {
                const ok = store.restoreBrowserBackup();
                setNotice(
                  ok
                    ? "Data browser lama berhasil dimuat. Klik Simpan ke Server."
                    : "Tidak ada data lokal valid ditemukan. Coba Import JSON.",
                );
              }
            }}
          >
            <History size={17} />
            <span>Migrasi Browser</span>
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

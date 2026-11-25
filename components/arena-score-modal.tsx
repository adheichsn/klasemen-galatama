"use client";
import { avatarProfile, participantAvatarTarget } from "@/lib/avatar-identity";
import { PlayerIdentity, useAvatarProfiles } from "@/components/player-avatar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CircleCheck,
  Fish,
  MinusCircle,
  PlusCircle,
  Search,
  Sparkles,
} from "lucide-react";
import type { ArenaStore } from "@/hooks/use-arena";
import { fmt } from "@/lib/arena-utils";
import { calculateCatch, completeDuoRoster } from "@/lib/arena-rules";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const inputStyle =
  "mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
const labelStyle = "block text-xs font-bold text-slate-600";
const actionStyle =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-45";

export default function ScoreModal({
  store,
  onClose,
}: {
  store: ArenaStore;
  onClose: () => void;
}) {
  const e = store.active;
  const profiles = useAvatarProfiles();
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [player, setPlayer] = useState("");
  const [resultLimit, setResultLimit] = useState(20);
  const [playerQuery, setPlayerQuery] = useState("");
  const [fish, setFish] = useState("");
  const [bonuses, setBonuses] = useState<string[]>([]);
  const [qty, setQty] = useState("1");
  const [catchRef, setCatchRef] = useState("");
  const submissionLock = useRef(false);
  const [kind, setKind] = useState<"catch" | "manual">("catch");
  const [manual, setManual] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const quantity = Number(qty);
  const calculated = calculateCatch(e, fish, bonuses, quantity);
  const activeBonuses = e.bonuses.filter((bonus) => bonus.enabled);
  const chosen = e.fish.find((f) => f.id === fish);
  const roster = useMemo(() => {
    const teams = new Map(e.squads.map((team) => [team.id, team.name]));
    return e.participants
      .map((p) => {
        const target = participantAvatarTarget(e, p);
        const profile = avatarProfile(profiles, target);
        const team = teams.get(p.squadId ?? "") ?? "";
        const username = (profile?.username || p.username).replace(/^@/, "");
        const names = [
          ...new Set([profile?.displayName, p.name].filter(Boolean)),
        ];
        return {
          p,
          target,
          team,
          username,
          label: [...names, username && `@${username}`, team]
            .filter(Boolean)
            .join(" · "),
          terms: [...names, p.username, username, team]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("id-ID"),
        };
      })
      .sort(
        (a, b) =>
          Number(b.p.checkedIn) - Number(a.p.checkedIn) ||
          a.p.name.localeCompare(b.p.name, "id"),
      );
  }, [e.participants, e.squads, e.id, e.createdAt, profiles]);
  const query = playerQuery.trim().replace(/^@/, "").toLocaleLowerCase("id-ID");
  const matches = useMemo(
    () => roster.filter((row) => row.terms.includes(query)),
    [roster, query],
  );
  const selected = roster.find((row) => row.p.id === player);
  const choose = (id: string) => {
    setPlayer(id);
    setPlayerQuery("");
    setError("");
    setSavedMessage("");
  };
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current;
    if (!viewport || !dialog) return;
    const resize = () => {
      dialog.style.maxHeight = `calc(${viewport.height}px - 1rem)`;
      dialog.style.top = `${viewport.offsetTop + viewport.height / 2}px`;
    };
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
    };
  }, []);
  const manualValid =
    manual.trim() !== "" &&
    Number.isSafeInteger(Number(manual)) &&
    Number(manual) !== 0 &&
    reason.trim() !== "";
  const canSubmit =
    !!selected &&
    (e.mode === "solo" || !!selected.team) &&
    completeDuoRoster(e) &&
    (e.status === "live" || (e.historical && e.status === "draft")) &&
    (kind === "catch"
      ? !!calculated &&
        (e.historical || (store.remaining > 0 && e.timer.runningSince !== null))
      : manualValid);

  const submit = async (keepOpen: boolean) => {
    setError("");
    setSavedMessage("");
    if (!canSubmit) {
      setError(
        kind === "catch" &&
          !e.historical &&
          (store.remaining === 0 || e.timer.runningSince === null)
          ? "Timer harus berjalan dan belum habis untuk mencatat tangkapan. Koreksi manual tersedia sebelum finalisasi."
          : "Pilih peserta dan lengkapi data. Arsip historis bisa diisi saat Draft; turnamen biasa harus LIVE.",
      );
      return;
    }
    if (submissionLock.current) return;
    if (kind === "catch") {
      const ref = catchRef.trim().toLocaleUpperCase("id-ID");
      if (
        ref &&
        e.entries.some(
          (entry) => entry.catchRef?.toLocaleUpperCase("id-ID") === ref,
        )
      ) {
        setError(
          "Kode bukti ini sudah pernah digunakan di turnamen ini. Periksa tangkapan sebelumnya.",
        );
        return;
      }
      const recentDuplicate = e.entries.some(
        (entry) =>
          entry.kind === "catch" &&
          entry.participantId === player &&
          entry.fishId === fish &&
          entry.quantity === quantity &&
          (entry.bonuses || [])
            .map((b) => b.id)
            .sort()
            .join("|") === [...bonuses].sort().join("|") &&
          Date.now() - new Date(entry.createdAt).getTime() < 45_000 &&
          !e.entries.some((item) => item.reversesEntryId === entry.id),
      );
      if (
        recentDuplicate &&
        !catchRef.trim() &&
        !window.confirm(
          "Ada tangkapan identik untuk peserta ini dalam 45 detik terakhir. Yakin ini tangkapan BARU, bukan input ganda?",
        )
      )
        return;
    }
    submissionLock.current = true;
    const message = e.historical
      ? (
          kind === "catch"
            ? store.addCatch(player, fish, bonuses, quantity, catchRef)
            : store.addManual(player, Number(manual), reason)
        )
        ? null
        : "Data skor tidak valid."
      : await store.runMatch(
          kind === "catch"
            ? {
                kind,
                player,
                fish,
                bonuses,
                quantity,
                reference: catchRef.trim(),
              }
            : { kind, player, points: Number(manual), reason: reason.trim() },
        );
    submissionLock.current = false;
    if (message) {
      setError(message);
      return;
    }
    if (!keepOpen || kind !== "catch") {
      onClose();
      return;
    }
    const playerName =
      e.participants.find((p) => p.id === player)?.name || "Peserta";
    setSavedMessage(
      `+${fmt(calculated?.delta ?? 0)} poin untuk ${playerName}${selected?.team ? ` (${selected.team})` : ""} tercatat. Tambahkan tangkapan berikutnya.`,
    );
    // Keep selected participant for fast consecutive catches, require a fresh fish selection.
    setFish("");
    setBonuses([]);
    setQty("1");
    setCatchRef("");
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !submissionLock.current) onClose();
      }}
    >
      <DialogContent
        ref={dialogRef}
        className="flex max-h-[calc(100dvh-1rem)] !w-[min(96vw,620px)] !max-w-[620px] flex-col overflow-hidden !p-0"
      >
        <div
          inert={store.matchBusy}
          aria-busy={store.matchBusy}
          className="flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white"
        >
          <div className="min-h-0 overflow-y-auto overscroll-contain">
            <header className="border-b border-blue-100 bg-gradient-to-r from-blue-50 to-white px-5 py-5 pr-16 sm:px-7">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold tracking-[.15em] text-blue-600">
                <Fish size={15} /> PANITIA • SCORING
              </div>
              <DialogTitle className="!text-xl font-black tracking-tight text-[#142A55] sm:!text-2xl">
                Input Poin {e.mode.toUpperCase()}
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                {e.historical
                  ? "Masukkan tangkapan yang benar-benar tercatat pada event lama. Input tidak menjalankan timer dan akan disimpan sebagai catatan historis."
                  : e.mode === "solo"
                    ? "Pilih peserta, ikan dan bonus. Poin langsung masuk ke individu."
                    : "Cari pemain lewat display name atau @username. Tim penerima poin mengikuti roster."}
              </DialogDescription>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={e.mode === "solo" ? "blue" : "amber"}>
                  {e.mode.toUpperCase()}
                </Badge>
                <span className="max-w-full truncate text-xs font-semibold text-slate-500">
                  {e.title}
                </span>
              </div>
            </header>
            <div className="space-y-4 px-5 py-5 sm:px-7">
              {!completeDuoRoster(e) && (
                <p
                  role="alert"
                  className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800"
                >
                  Lengkapi dua anggota dan username unik setiap pasangan DUO
                  sebelum mencatat skor.
                </p>
              )}
              <div
                className="flex gap-1 rounded-xl bg-slate-100 p-1"
                role="group"
                aria-label="Jenis input poin"
              >
                {(
                  [
                    ["catch", "Tangkapan", Fish],
                    ["manual", "Koreksi Manual", PlusCircle],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    onClick={() => {
                      setKind(value);
                      setError("");
                      setSavedMessage("");
                    }}
                    className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2.5 text-xs font-extrabold transition sm:px-4 ${kind === value ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    <Icon size={16} /> {label}
                  </button>
                ))}
              </div>
              {savedMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold leading-5 text-emerald-700"
                >
                  <CircleCheck size={17} className="shrink-0" /> {savedMessage}
                </div>
              )}
              <label className={labelStyle}>
                Cari pemain
                <span className="relative block">
                  <Search
                    size={16}
                    className="pointer-events-none absolute bottom-3.5 left-3 text-slate-400"
                  />
                  <input
                    ref={searchRef}
                    type="search"
                    value={playerQuery}
                    placeholder="Display name, @username atau nama roster"
                    className={`${inputStyle} pl-9 text-base`}
                    onChange={(event) => {
                      setPlayerQuery(event.target.value);
                      setResultLimit(20);
                      setPlayer("");
                      setSavedMessage("");
                      setError("");
                    }}
                  />
                </span>
              </label>
              {query ? (
                <div
                  aria-label="Hasil pencarian pemain"
                  className="max-h-44 overflow-auto rounded-xl border border-slate-200"
                >
                  {matches.slice(0, resultLimit).map((row) => (
                    <button
                      type="button"
                      key={row.p.id}
                      onClick={() => choose(row.p.id)}
                      className="block min-h-11 w-full break-words border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50"
                    >
                      {row.label}
                    </button>
                  ))}
                  {matches.length === 0 && (
                    <p role="status" className="p-3 text-sm">
                      Pemain tidak ditemukan di roster event ini.
                    </p>
                  )}
                  {matches.length > resultLimit && (
                    <button type="button" className="w-full p-3 text-sm font-bold text-blue-700" onClick={() => setResultLimit(limit => limit + 20)}>Lihat hasil lainnya ({matches.length - resultLimit})</button>
                  )}
                </div>
              ) : (
                !selected && (
                  <label className={labelStyle}>
                    Pilih dari roster
                    <select
                      className={inputStyle}
                      value=""
                      onChange={(event) => choose(event.target.value)}
                    >
                      <option value="">Pilih pemain</option>
                      {roster.map((row) => (
                        <option key={row.p.id} value={row.p.id}>
                          {row.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )
              )}
              {selected && (
                <div className="flex items-start justify-between gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3">
                  <div className="min-w-0">
                    <PlayerIdentity
                      target={selected.target}
                      name={selected.p.name}
                      subtitle={
                        selected.username ? `@${selected.username}` : undefined
                      }
                      link={false}
                    />
                    {e.mode !== "solo" && (
                      <p className="mt-2 break-words text-sm font-bold text-blue-800">
                        Tim penerima poin: {selected.team || "Belum terdaftar"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="p-2 text-xs font-bold text-blue-700"
                    onClick={() => {
                      choose("");
                      searchRef.current?.focus();
                    }}
                  >
                    Ganti pemain
                  </button>
                </div>
              )}
              {kind === "catch" ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(110px,1fr)]">
                    <label className={labelStyle}>
                      Jenis Secret / Ikan
                      <select
                        value={fish}
                        onChange={(event) => setFish(event.target.value)}
                        className={inputStyle}
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
                    <label className={labelStyle}>
                      Jumlah tangkapan
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={qty}
                        onChange={(event) => setQty(event.target.value)}
                        className={inputStyle}
                      />
                    </label>
                  </div>
                  <label className={labelStyle}>
                    Referensi bukti tangkapan (opsional, unik per event)
                    <input
                      type="text"
                      maxLength={80}
                      value={catchRef}
                      onChange={(event) => setCatchRef(event.target.value)}
                      placeholder="Contoh: SS-001 atau nomor bukti"
                      className={inputStyle}
                    />
                    <span className="mt-1 block text-[11px] font-normal leading-5 text-slate-500">
                      Jika diisi, referensi tidak bisa digunakan dua kali,
                      termasuk setelah skor dibatalkan. Dua tangkapan sah dengan
                      ikan sama tetap boleh dicatat.
                    </span>
                  </label>
                  <div className="rounded-2xl border border-blue-100 bg-[#f8faff] p-4">
                    <p className="mb-3 flex items-center gap-2 text-xs font-extrabold text-[#42669d]">
                      <Sparkles size={17} /> Bonus poin aktif
                    </p>
                    {activeBonuses.length ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeBonuses.map((b) => (
                          <label
                            key={b.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${bonuses.includes(b.id) ? "border-blue-300 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"}`}
                          >
                            <input
                              type="checkbox"
                              checked={bonuses.includes(b.id)}
                              className="size-4 accent-blue-600"
                              onChange={(event) =>
                                setBonuses((current) =>
                                  event.target.checked
                                    ? [...current, b.id]
                                    : current.filter((id) => id !== b.id),
                                )
                              }
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {b.name}
                            </span>
                            <b className="text-blue-700">
                              {b.points > 0 ? "+" : ""}
                              {fmt(b.points)}
                            </b>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Bonus tidak aktif pada turnamen ini.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#112650] p-4 text-white">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold tracking-wider text-blue-200">
                        PRATINJAU PERHITUNGAN
                      </span>
                      <p className="mt-1 text-xs leading-5 text-blue-100">
                        {fmt(chosen?.points ?? 0)} dasar{" "}
                        {e.bonuses
                          .filter((b) => b.enabled && bonuses.includes(b.id))
                          .map((b) => `+ (${b.name} ${fmt(b.points)})`)
                          .join(" ")}{" "}
                        × {Number.isFinite(quantity) ? fmt(quantity) : "—"}
                      </p>
                    </div>
                    <b className="whitespace-nowrap text-2xl font-black sm:text-3xl">
                      {calculated ? fmt(calculated.delta) : "—"}{" "}
                      <small className="text-[11px] text-blue-200">PTS</small>
                    </b>
                  </div>
                </>
              ) : (
                <>
                  <label className={labelStyle}>
                    Penyesuaian poin (+ / -)
                    <input
                      type="number"
                      value={manual}
                      placeholder="Contoh: -2 atau 5"
                      onChange={(event) => setManual(event.target.value)}
                      className={inputStyle}
                    />
                  </label>
                  <label className={labelStyle}>
                    Alasan koreksi (wajib)
                    <textarea
                      rows={3}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      maxLength={300}
                      placeholder="Jelaskan alasan perubahan..."
                      className={inputStyle}
                    />
                  </label>
                  <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
                    <MinusCircle size={17} className="mt-0.5 shrink-0" />{" "}
                    Koreksi dicatat sebagai transaksi terpisah. Skor asli tidak
                    dihapus.
                  </div>
                </>
              )}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700"
                >
                  {error}
                </div>
              )}
              <p className="text-[11px] leading-5 text-amber-700">
                {e.historical
                  ? "Klik Simpan ke Server untuk menyimpan perubahan arsip."
                  : store.matchBusy
                    ? "Menunggu konfirmasi server…"
                    : "Tangkapan langsung dikirim saat ditambahkan. Waktu penerimaan mengikuti server."}
              </p>
            </div>
          </div>
          <footer className="score-actions shrink-0 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
            <button
              type="button"
              className={`${actionStyle} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
              onClick={onClose}
            >
              Batal
            </button>
            {kind === "catch" && (
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => submit(true)}
                className={`${actionStyle} border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`}
              >
                <PlusCircle size={16} />{" "}
                {e.historical ? "Tambah & Lanjut" : "Simpan & Lanjut"}
              </button>
            )}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => submit(false)}
              className={`${actionStyle} bg-blue-600 text-white hover:bg-blue-700`}
            >
              <Check size={16} />{" "}
              {kind === "catch"
                ? e.historical
                  ? "Tambah & Tutup"
                  : "Simpan & Tutup"
                : "Simpan Koreksi"}{" "}
              <ArrowRight size={15} />
            </button>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

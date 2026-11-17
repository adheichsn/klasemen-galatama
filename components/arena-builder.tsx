"use client";
import { useState } from "react";
import {
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Fish,
  Info,
  LockKeyhole,
  ImagePlus,
  UploadCloud,
  ExternalLink,
  Star,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import type { EditorSection, EventMode } from "@/lib/arena-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ArenaStore } from "@/hooks/use-arena";
import { fmt, validPoints } from "@/lib/arena-utils";
import { canSwitchMode } from "@/lib/arena-rules";
import { validBannerUrl } from "@/lib/banner";
import { BuilderProgress, builderSteps } from "@/components/admin/builder-progress";

const sections: { id: EditorSection; text: string; icon: typeof Fish }[] = [
  { id: "general", text: "Informasi", icon: Settings2 },
  { id: "marketing", text: "Banner & Promosi", icon: ImagePlus },
  { id: "fish", text: "Katalog Ikan", icon: Fish },
  { id: "bonuses", text: "Bonus Poin", icon: Sparkles },
  { id: "rules", text: "Peraturan", icon: BookOpen },
  { id: "participants", text: "Peserta", icon: Users },
  { id: "faq", text: "FAQ", icon: CircleHelp },
];
const parsePoints = (text: string) =>
  text.trim() !== "" &&
  Number.isSafeInteger(Number(text)) &&
  validPoints(Number(text))
    ? Number(text)
    : null;
export default function ArenaBuilder({ store }: { store: ArenaStore }) {
  const e = store.active;
  const [tab, setTab] = useState<EditorSection>("general");
  const [name, setName] = useState("");
  const [points, setPoints] = useState("1");
  const [ruleGroup, setRuleGroup] = useState("Umum");
  const [ruleText, setRuleText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [person, setPerson] = useState("");
  const [username, setUsername] = useState("");
  const [squadId, setSquadId] = useState("");
  const [squadName, setSquadName] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [bannerInput, setBannerInput] = useState("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerMessage, setBannerMessage] = useState("");
  const modeLocked = !canSwitchMode(e);
  const currentStep = builderSteps.findIndex((s) => s.id === tab);
  const navigate = (section: EditorSection) => {
    setTab(section);
    setName("");
    setPoints("1");
  };
  const locked = e.status === "finished";
  const uploadBanner = async (file?: File) => {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1_000_000
    ) {
      setBannerMessage("Gunakan gambar JPG, PNG atau WebP maksimal 1 MB.");
      return;
    }
    setUploadingBanner(true);
    setBannerMessage("");
    try {
      const response = await fetch("/api/admin/assets", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
        credentials: "same-origin",
      });
      const payload: { url?: string; error?: string } = await response.json();
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "Upload gagal");
      store.banner(payload.url);
      setBannerInput("");
      setBannerMessage(
        "Banner diunggah. Klik Simpan ke Server agar tampil di website publik.",
      );
    } catch (error) {
      setBannerMessage(error instanceof Error ? error.message : "Upload gagal");
    } finally {
      setUploadingBanner(false);
    }
  };
  const addCatalog = () => {
    const n = parsePoints(points);
    if (n === null || !name.trim()) return;
    if (tab === "fish") store.addFish(name, n);
    else store.addBonus(name, n);
    setName("");
    setPoints("1");
  };
  return (
    <section className="section-stack">
      <div className="page-heading flex justify-between items-center gap-[20px]">
        <div>
          <div className="kicker text-[10px] text-[#477bce] tracking-[1.6px] font-extrabold mb-[8px]">TOURNAMENT BUILDER</div>
          <h2>Atur pertandingan sesukamu.</h2>
          <p>
            Semua konfigurasi hanya berlaku untuk <b>{e.title}</b> dan tidak
            mengubah turnamen lain.
          </p>
        </div>
        <span className="pill inline-flex items-center gap-[6px] p-[8px_11px] rounded-[100px] text-[11px] font-extrabold whitespace-nowrap neutral">
          {locked ? "Arsip terkunci" : "Klik Simpan ke Server di header"}
        </span>
      </div>
      <BuilderProgress event={e} active={tab} onNavigate={navigate} />
      <div className="builder-layout grid grid-cols-[220px_minmax(0,_1fr)] gap-[18px] [align-items:start]">
        <nav className="builder-tabs bg-[#fff] [border:1px_solid_var(--line)] rounded-[16px] p-[9px] flex flex-col gap-[4px]" aria-label="Bagian pengaturan turnamen">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                className={`builder-tab bg-white w-full flex items-center gap-[12px] p-[13px] text-[#7588a3] text-left rounded-[9px] font-extrabold text-[12px] ${tab === s.id ? "selected" : ""}`}
                aria-current={tab === s.id ? "step" : undefined}
                onClick={() => navigate(s.id)}
              >
                <Icon size={18} />
                {s.text}
              </button>
            );
          })}
        </nav>
        <div className="panel bg-[#fff] [border:1px_solid_var(--line)] rounded-[17px] shadow-[var(--shadow)] min-w-[0] builder-body p-[25px]">
          {locked && (
            <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6] warning">
              <ShieldCheck size={18} />
              Turnamen selesai telah dikunci. Buka kembali melalui daftar event
              bila perlu koreksi.
            </div>
          )}
          {tab === "general" && (
            <div className="stack-lg flex flex-col gap-[22px]">
              <div className="block-title">
                <h3>Identitas Turnamen</h3>
                <p>
                  Informasi yang tampil pada header, detail event dan arsip.
                </p>
              </div>
              <div
                className="mb-6 grid gap-3 sm:grid-cols-2"
                role="group"
                aria-label="Pilih format turnamen"
              >
                {(
                  [
                    [
                      "solo",
                      "SOLO",
                      "Kompetisi individual",
                      "Skor, podium, dan ranking milik setiap pemain.",
                      UserRound,
                    ],
                    [
                      "squad",
                      "SQUAD",
                      "Kompetisi tim",
                      "Daftarkan squad serta anggota; nilai anggota dijumlah ke tim.",
                      UsersRound,
                    ],
                  ] as const
                ).map(([value, title, subtitle, detail, Icon]) => (
                  <Card
                    key={value}
                    className={`relative border-2 p-1 transition-all ${e.mode === value ? "!border-blue-500 bg-blue-50/80 shadow-blue-100" : "!border-slate-200 hover:!border-blue-200"}`}
                  >
                    <button
                      type="button"
                      aria-pressed={e.mode === value}
                      disabled={modeLocked && e.mode !== value}
                      onClick={() => store.mode(value as EventMode)}
                      className="flex w-full items-start gap-3 rounded-xl p-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div
                        className={`rounded-xl p-2.5 ${e.mode === value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}
                      >
                        <Icon size={23} />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-slate-900">
                          {title}
                          {e.mode === value && <Badge tone="blue">AKTIF</Badge>}
                        </span>
                        <span className="mt-1 block font-bold text-slate-700">
                          {subtitle}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">
                          {detail}
                        </span>
                      </span>
                    </button>
                  </Card>
                ))}
              </div>
              {modeLocked && (
                <p className="mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
                  <LockKeyhole size={16} /> Format dikunci karena sudah ada
                  roster, squad, skor, atau pertandingan bukan Draft. Buat
                  turnamen baru untuk format berbeda.
                </p>
              )}
              <div className="form-grid grid grid-cols-2 gap-[15px]">
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold span-2">
                  Nama turnamen
                  <input
                    disabled={locked}
                    maxLength={100}
                    value={e.title}
                    onChange={(v) => store.field("title", v.target.value)}
                    placeholder="Contoh: Galatama Season 5"
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold span-2">
                  Deskripsi singkat
                  <input
                    disabled={locked}
                    value={e.subtitle}
                    maxLength={180}
                    onChange={(v) => store.field("subtitle", v.target.value)}
                    placeholder="Deskripsi event"
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Lokasi / Pulau
                  <input
                    disabled={locked}
                    value={e.location}
                    onChange={(v) => store.field("location", v.target.value)}
                    placeholder="Bebas, bisa beberapa pulau"
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Host / Panitia
                  <input
                    disabled={locked}
                    value={e.host}
                    onChange={(v) => store.field("host", v.target.value)}
                    placeholder="Nama host"
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Tanggal event
                  <input
                    disabled={locked}
                    type="date"
                    value={e.eventDate}
                    onChange={(v) => store.field("eventDate", v.target.value)}
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Durasi (menit)
                  <input
                    disabled={e.status !== "draft"}
                    type="number"
                    min={1}
                    max={1440}
                    value={e.timer.durationSec / 60}
                    onChange={(v) => store.setDuration(Number(v.target.value))}
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Visibilitas event
                  <select
                    disabled={locked}
                    value={e.published ? "published" : "private"}
                    onChange={(v) =>
                      store.publish(v.target.value === "published")
                    }
                  >
                    <option value="private">Privat / Draft</option>
                    <option value="published">Tampilkan di katalog</option>
                  </select>
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Aturan jika poin seri
                  <select
                    disabled={locked}
                    value={e.tieBreaker}
                    onChange={(v) =>
                      store.setTie(
                        v.target.value as "catches" | "bonus" | "alphabetical",
                        e.tieBonusId,
                      )
                    }
                  >
                    <option value="catches">
                      Lebih banyak tangkapan valid
                    </option>
                    <option value="bonus">
                      Lebih banyak ikan dengan bonus tertentu
                    </option>
                    <option value="alphabetical">
                      Urutan nama (tanpa bonus seri)
                    </option>
                  </select>
                </label>
                {e.tieBreaker === "bonus" && (
                  <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                    Bonus penentu seri
                    <select
                      disabled={locked}
                      value={e.tieBonusId || ""}
                      onChange={(v) =>
                        store.setTie("bonus", v.target.value || null)
                      }
                    >
                      <option value="">Pilih jenis bonus</option>
                      {e.bonuses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </div>
              <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6]">
                <Info size={18} />
                Mode SOLO dan SQUAD terpisah sepenuhnya. Pilih format sebelum
                mendaftarkan pemain atau squad. Mengganti durasi akan mereset
                timer event ini.
              </div>
            </div>
          )}
          {tab === "marketing" && (
            <div className="space-y-6">
              <div className="block-title">
                <h3>Banner & Event Unggulan</h3>
                <p>
                  Kelola cover turnamen, kartu katalog, dan promo carousel
                  homepage. Gambar tidak mengubah hasil pertandingan.
                </p>
              </div>
              <div className="relative flex h-56 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#112E75] via-[#215CD3] to-[#38A0F3] text-white">
                {e.bannerUrl && validBannerUrl(e.bannerUrl) ? (
                  <>
                    {/* Image URL is validated before being persisted. */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url("${e.bannerUrl}")` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#061C47]/90 via-[#061C47]/20 to-transparent" />
                  </>
                ) : (
                  <Fish size={78} className="opacity-30" />
                )}
                <div className="absolute bottom-5 left-5 right-5">
                  <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-extrabold">
                    {e.mode.toUpperCase()} • {e.status.toUpperCase()}
                  </span>
                  <h4 className="mt-2 text-xl font-black">{e.title}</h4>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm font-bold text-blue-700 hover:bg-blue-100">
                  <UploadCloud size={26} />{" "}
                  {uploadingBanner
                    ? "Sedang mengunggah..."
                    : "Upload gambar banner"}
                  <span className="text-xs font-normal text-slate-500">
                    JPG / PNG / WebP, maks. 1 MB. Rekomendasi rasio 16:9.
                  </span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingBanner}
                    onChange={(v) => {
                      void uploadBanner(v.target.files?.[0]);
                      v.target.value = "";
                    }}
                  />
                </label>
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                  <label className="block text-xs font-bold text-slate-600">
                    Atau tautan gambar HTTPS
                  </label>
                  <input
                    aria-label="URL banner HTTPS"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="https://.../banner.webp"
                    value={bannerInput}
                    maxLength={500}
                    onChange={(v) => setBannerInput(v.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!bannerInput || !validBannerUrl(bannerInput)}
                    className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                    onClick={() => {
                      store.banner(bannerInput);
                      setBannerInput("");
                      setBannerMessage(
                        "URL banner siap. Klik Simpan ke Server.",
                      );
                    }}
                  >
                    Pakai URL gambar <ExternalLink size={15} />
                  </button>
                </div>
              </div>
              {bannerMessage && (
                <p
                  role="status"
                  className="rounded-xl bg-blue-50 px-4 py-3 text-xs font-bold text-blue-800"
                >
                  {bannerMessage}
                </p>
              )}
              {e.bannerUrl && (
                <button
                  type="button"
                  className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                  onClick={() => {
                    store.banner("");
                    setBannerMessage(
                      "Banner dilepas dari event. Klik Simpan ke Server.",
                    );
                  }}
                >
                  Hapus cover dari event
                </button>
              )}
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-blue-100 bg-white p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={!!e.featured}
                  onChange={(v) => store.feature(v.target.checked)}
                />
                <span>
                  <b className="flex items-center gap-2 text-sm text-slate-900">
                    <Star size={16} className="text-amber-500" /> Jadikan Event
                    Unggulan
                  </b>
                  <span className="mt-1 block text-xs leading-6 text-slate-500">
                    Jika Published, event ini mendapat prioritas pada banner
                    carousel dan katalog homepage. Boleh diubah walaupun event
                    sudah selesai.
                  </span>
                </span>
              </label>
              <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6]">
                <Info size={18} /> Upload gambar tersimpan di tabel{" "}
                <code>weji_arena_assets</code>. Metadata cover dan pilihan
                featured baru terbit setelah klik Simpan ke Server. Jalankan
                ulang db/schema.sql sebelum upload pertama.
              </div>
            </div>
          )}
          {(tab === "fish" || tab === "bonuses") && (
            <div className="stack-lg flex flex-col gap-[22px]">
              <div className="block-title">
                <h3>
                  {tab === "fish"
                    ? "Katalog Ikan & Nilai Dasar"
                    : "Bonus Tangkapan"}
                </h3>
                <p>
                  {tab === "fish"
                    ? "Tambahkan jenis ikan apa pun dari pulau atau map mana pun."
                    : "Tambahkan bonus bebas: Mutasi, Big, Shiny, atau jenis bonus buatan panitia."}
                </p>
              </div>
              <div className="catalog-header text-[10px] font-extrabold text-[#9baac0] tracking-[.8px] p-[0_9px]">
                <span>AKTIF</span>
                <span>NAMA {tab === "fish" ? "IKAN" : "BONUS"}</span>
                <span>POIN</span>
                <span></span>
              </div>
              {(tab === "fish" ? e.fish : e.bonuses).length === 0 && (
                <div className="empty-row p-[26px_16px] [border:1px_dashed_#d4e0ef] rounded-[12px] bg-[#f9fbff] flex gap-[5px] flex-col items-center text-center text-[#7495c9]">
                  <Fish size={24} />
                  <strong>Belum ada {tab === "fish" ? "ikan" : "bonus"}</strong>
                  <span>
                    Isi form di bawah untuk membuat penilaian pertama.
                  </span>
                </div>
              )}
              {(tab === "fish" ? e.fish : e.bonuses).map((item) => (
                <div className="catalog-row p-[10px_7px] [border:1px_solid_#eaf0f7] rounded-[11px] mt-[-12px]" key={item.id}>
                  <input
                    disabled={locked}
                    aria-label={`Aktifkan ${item.name}`}
                    type="checkbox"
                    checked={item.enabled}
                    onChange={(v) =>
                      tab === "fish"
                        ? store.changeFish(item.id, {
                            enabled: v.target.checked,
                          })
                        : store.changeBonus(item.id, {
                            enabled: v.target.checked,
                          })
                    }
                  />
                  <input
                    disabled={locked}
                    aria-label="Nama"
                    value={item.name}
                    maxLength={70}
                    onChange={(v) =>
                      tab === "fish"
                        ? store.changeFish(item.id, { name: v.target.value })
                        : store.changeBonus(item.id, { name: v.target.value })
                    }
                  />
                  <input
                    disabled={locked}
                    aria-label="Poin"
                    type="number"
                    min={-1000000}
                    max={1000000}
                    value={item.points}
                    onChange={(v) => {
                      const n = parsePoints(v.target.value);
                      if (n !== null) {
                        if (tab === "fish")
                          store.changeFish(item.id, { points: n });
                        else store.changeBonus(item.id, { points: n });
                      }
                    }}
                  />
                  <button
                    disabled={locked}
                    className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
                    title="Hapus"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Hapus ${item.name}? Catatan lama tetap tersimpan.`,
                        )
                      ) {
                        if (tab === "fish") store.removeFish(item.id);
                        else store.removeBonus(item.id);
                      }
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="add-row bg-[#f6f9ff] [border:1px_dashed_#cbdcf7] rounded-[12px] p-[18px] flex flex-col items-stretch gap-[13px]">
                <div className="row-title flex items-center gap-[8px] text-[12px] font-extrabold text-[#3568c3]">
                  <Plus size={17} /> Tambahkan{" "}
                  {tab === "fish" ? "ikan" : "bonus"}
                </div>
                <div className="add-row-fields flex gap-[10px] items-center">
                  <input
                    disabled={locked}
                    value={name}
                    onChange={(v) => setName(v.target.value)}
                    onKeyDown={(v) => {
                      if (v.key === "Enter") addCatalog();
                    }}
                    placeholder={
                      tab === "fish"
                        ? "Nama ikan, mis. Shark"
                        : "Nama bonus, mis. Mutasi Emas"
                    }
                    maxLength={70}
                  />
                  <input
                    disabled={locked}
                    type="number"
                    value={points}
                    onChange={(v) => setPoints(v.target.value)}
                    aria-label="Poin baru"
                  />
                  <button
                    disabled={
                      locked || !name.trim() || parsePoints(points) === null
                    }
                    className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                    onClick={addCatalog}
                  >
                    <Plus size={16} />
                    Tambah
                  </button>
                </div>
              </div>
              <div className="notice p-[12px_15px] bg-[#eef5ff] [border:1px_solid_#d8e6ff] text-[#3263a9] rounded-[10px] flex items-center gap-[10px] text-[12px] leading-[1.6]">
                <ShieldCheck size={18} />
                Perubahan poin hanya berlaku untuk tangkapan berikutnya. Skor
                sebelumnya menyimpan nilai asli saat dicatat.
              </div>
            </div>
          )}
          {tab === "rules" && (
            <div className="stack-lg flex flex-col gap-[22px]">
              <div className="block-title">
                <h3>Peraturan Tertulis</h3>
                <p>
                  Aturan pengunjung (diizinkan, dilarang, teknis, atau kategori
                  bebas). Terpisah dari mesin hitung skor.
                </p>
              </div>
              {e.writtenRules.map((r, i) => (
                <div className="editable-rule" key={r.id}>
                  <div className="rule-order w-[28px] h-[28px] flex items-center justify-center bg-[#eff5ff] text-[#5881cf] rounded-[8px] text-[10px] font-extrabold shrink-0 mt-[5px]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rule-editor flex-1 flex flex-col gap-[8px] min-w-[0]">
                    <input
                      disabled={locked}
                      aria-label="Kategori aturan"
                      value={r.group}
                      onChange={(v) =>
                        store.changeRule(r.id, { group: v.target.value })
                      }
                      maxLength={60}
                    />
                    <textarea
                      disabled={locked}
                      aria-label="Isi aturan"
                      rows={2}
                      value={r.content}
                      maxLength={1000}
                      onChange={(v) =>
                        store.changeRule(r.id, { content: v.target.value })
                      }
                    />
                  </div>
                  <button
                    disabled={locked}
                    className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
                    onClick={() => store.removeRule(r.id)}
                    title="Hapus aturan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {e.writtenRules.length === 0 && (
                <div className="empty-row p-[26px_16px] [border:1px_dashed_#d4e0ef] rounded-[12px] bg-[#f9fbff] flex gap-[5px] flex-col items-center text-center text-[#7495c9]">
                  <BookOpen size={24} />
                  <strong>Belum ada aturan tertulis</strong>
                  <span>Atur sendiri sesuai kebutuhan event.</span>
                </div>
              )}
              <div className="add-row bg-[#f6f9ff] [border:1px_dashed_#cbdcf7] rounded-[12px] p-[18px] flex flex-col items-stretch gap-[13px]">
                <div className="row-title flex items-center gap-[8px] text-[12px] font-extrabold text-[#3568c3]">
                  <Plus size={17} /> Buat peraturan
                </div>
                <div className="form-grid grid grid-cols-2 gap-[15px]">
                  <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                    Kategori
                    <input
                      disabled={locked}
                      value={ruleGroup}
                      maxLength={60}
                      onChange={(v) => setRuleGroup(v.target.value)}
                      placeholder="Diizinkan, Dilarang, Teknis..."
                    />
                  </label>
                  <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold span-2">
                    Isi peraturan
                    <textarea
                      disabled={locked}
                      rows={3}
                      value={ruleText}
                      maxLength={1000}
                      onChange={(v) => setRuleText(v.target.value)}
                      placeholder="Ketik peraturan turnamen..."
                    />
                  </label>
                </div>
                <button
                  disabled={locked || !ruleText.trim()}
                  className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                  onClick={() => {
                    store.addRule(ruleGroup, ruleText);
                    setRuleText("");
                  }}
                >
                  <Plus size={16} /> Tambah Aturan
                </button>
              </div>
            </div>
          )}
          {tab === "participants" && (
            <div className="stack-lg flex flex-col gap-[22px]">
              <div className="block-title">
                <h3>
                  {e.mode === "squad"
                    ? "Manajemen Squad & Anggota"
                    : "Peserta SOLO"}
                </h3>
                <p>
                  {e.mode === "squad"
                    ? "Buat squad dahulu, daftarkan anggota ke squad, lalu catat kontribusi tiap anggota."
                    : "Daftarkan peserta individu. Tidak ada tim atau penggabungan poin."}{" "}
                  Pemain dengan riwayat skor tidak dapat dihapus atau dipindah
                  tim.
                </p>
              </div>
              <div
                className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${e.mode === "solo" ? "bg-blue-50 text-blue-800" : "bg-indigo-50 text-indigo-800"}`}
              >
                {e.mode === "solo" ? (
                  <UserRound size={18} />
                ) : (
                  <UsersRound size={18} />
                )}
                <strong>MODE {e.mode.toUpperCase()}</strong>
                <span className="font-normal">
                  —{" "}
                  {e.mode === "solo"
                    ? "1 pemain = 1 peringkat"
                    : "Poin seluruh anggota = poin squad"}
                </span>
              </div>
              {e.mode === "squad" && (
                <div className="squad-editor p-[18px] bg-[#f8faff] rounded-[13px] flex flex-col gap-[10px]">
                  <h4>Daftar Squad</h4>
                  {e.squads.map((s) => (
                    <div className="squad-row flex items-center gap-[8px]" key={s.id}>
                      <input
                        aria-label="Warna squad"
                        disabled={locked}
                        type="color"
                        value={s.color}
                        onChange={(v) =>
                          store.changeSquad(s.id, { color: v.target.value })
                        }
                      />
                      <input
                        disabled={locked}
                        value={s.name}
                        maxLength={70}
                        onChange={(v) =>
                          store.changeSquad(s.id, { name: v.target.value })
                        }
                      />
                      <button
                        disabled={
                          locked ||
                          e.participants.some((p) => p.squadId === s.id)
                        }
                        className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
                        title="Hapus squad kosong"
                        onClick={() => store.removeSquad(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="add-row-fields flex gap-[10px] items-center">
                    <input
                      disabled={locked}
                      value={squadName}
                      onChange={(v) => setSquadName(v.target.value)}
                      placeholder="Nama squad baru"
                    />
                    <button
                      disabled={locked || !squadName.trim()}
                      className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] secondary"
                      onClick={() => {
                        store.addSquad(squadName);
                        setSquadName("");
                      }}
                    >
                      <Plus size={16} />
                      Squad
                    </button>
                  </div>
                </div>
              )}
              {e.mode === "squad" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={squadFilter === "all" ? "default" : "secondary"}
                    onClick={() => setSquadFilter("all")}
                  >
                    Semua anggota ({e.participants.length})
                  </Button>
                  {e.squads.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={squadFilter === s.id ? "default" : "secondary"}
                      onClick={() => setSquadFilter(s.id)}
                    >
                      {s.name} (
                      {e.participants.filter((p) => p.squadId === s.id).length})
                    </Button>
                  ))}
                </div>
              )}
              <div className="participant-list flex flex-col gap-[8px]">
                {e.participants
                  .filter(
                    (p) =>
                      e.mode === "solo" ||
                      squadFilter === "all" ||
                      !e.squads.some((s) => s.id === squadFilter) ||
                      p.squadId === squadFilter,
                  )
                  .map((p) => (
                    <div className="participant-edit flex items-center gap-[11px] p-[11px] bg-[#fbfcff] [border:1px_solid_#e9eef8] rounded-[10px]" key={p.id}>
                      <div className="participant-avatar w-[36px] h-[36px] text-[12px]">
                        {p.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="participant-fields flex gap-[8px] flex-1 min-w-[0]">
                        <input
                          disabled={locked}
                          value={p.name}
                          maxLength={80}
                          aria-label="Nama peserta"
                          onChange={(v) =>
                            store.changeParticipant(p.id, {
                              name: v.target.value,
                            })
                          }
                        />
                        <input
                          disabled={locked}
                          value={p.username}
                          maxLength={80}
                          aria-label="Username Roblox"
                          placeholder="Username Roblox"
                          onChange={(v) =>
                            store.changeParticipant(p.id, {
                              username: v.target.value,
                            })
                          }
                        />
                        {e.mode === "squad" && (
                          <select
                            title={
                              e.entries.some(
                                (entry) => entry.participantId === p.id,
                              )
                                ? "Anggota dengan riwayat skor tidak boleh pindah squad"
                                : "Pilih squad"
                            }
                            disabled={
                              locked ||
                              e.entries.some(
                                (entry) => entry.participantId === p.id,
                              )
                            }
                            value={p.squadId || ""}
                            onChange={(v) =>
                              store.changeParticipant(p.id, {
                                squadId: v.target.value || null,
                              })
                            }
                          >
                            <option value="">Pilih Squad</option>
                            {e.squads.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <label className="check-label text-[10px] text-[#667e9f] flex gap-[6px] items-center whitespace-nowrap">
                        <input
                          disabled={locked}
                          type="checkbox"
                          checked={p.checkedIn}
                          onChange={(v) =>
                            store.changeParticipant(p.id, {
                              checkedIn: v.target.checked,
                            })
                          }
                        />
                        <span>Check-in</span>
                      </label>
                      <button
                        disabled={
                          locked ||
                          e.entries.some((x) => x.participantId === p.id)
                        }
                        className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
                        title="Hapus peserta tanpa riwayat"
                        onClick={() => store.removeParticipant(p.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                {e.participants.length === 0 && (
                  <div className="empty-row p-[26px_16px] [border:1px_dashed_#d4e0ef] rounded-[12px] bg-[#f9fbff] flex gap-[5px] flex-col items-center text-center text-[#7495c9]">
                    <Users size={24} />
                    <strong>Belum ada peserta</strong>
                    <span>Daftarkan peserta sebelum mencatat tangkapan.</span>
                  </div>
                )}
              </div>
              <div className="add-row bg-[#f6f9ff] [border:1px_dashed_#cbdcf7] rounded-[12px] p-[18px] flex flex-col items-stretch gap-[13px]">
                <div className="row-title flex items-center gap-[8px] text-[12px] font-extrabold text-[#3568c3]">
                  <Plus size={17} /> Tambah peserta
                </div>
                <div className="form-grid grid grid-cols-2 gap-[15px]">
                  <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                    Nama tampil
                    <input
                      disabled={locked}
                      value={person}
                      onChange={(v) => setPerson(v.target.value)}
                      placeholder="Nama peserta"
                    />
                  </label>
                  <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                    Username Roblox
                    <input
                      disabled={locked}
                      value={username}
                      onChange={(v) => setUsername(v.target.value)}
                      placeholder="Opsional"
                    />
                  </label>
                  {e.mode === "squad" && (
                    <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                      Squad
                      <select
                        disabled={locked}
                        value={squadId}
                        onChange={(v) => setSquadId(v.target.value)}
                      >
                        <option value="">Pilih squad</option>
                        {e.squads.map((s) => (
                          <option value={s.id} key={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
                <button
                  disabled={
                    locked || !person.trim() || (e.mode === "squad" && !squadId)
                  }
                  className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                  onClick={() => {
                    store.addParticipant(person, username, squadId || null);
                    setPerson("");
                    setUsername("");
                  }}
                >
                  <Plus size={16} /> Daftarkan Peserta
                </button>
              </div>
            </div>
          )}
          {tab === "faq" && (
            <div className="stack-lg flex flex-col gap-[22px]">
              <div className="block-title">
                <h3>FAQ Turnamen</h3>
                <p>
                  Pertanyaan yang sering ditanyakan, tampil seperti accordion di
                  halaman publik.
                </p>
              </div>
              {e.faqs.map((f, i) => (
                <div className="editable-faq" key={f.id}>
                  <div className="rule-order w-[28px] h-[28px] flex items-center justify-center bg-[#eff5ff] text-[#5881cf] rounded-[8px] text-[10px] font-extrabold shrink-0 mt-[5px]">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rule-editor flex-1 flex flex-col gap-[8px] min-w-[0]">
                    <input
                      disabled={locked}
                      aria-label="Pertanyaan"
                      value={f.question}
                      maxLength={250}
                      onChange={(v) =>
                        store.changeFaq(f.id, { question: v.target.value })
                      }
                    />
                    <textarea
                      disabled={locked}
                      aria-label="Jawaban"
                      rows={3}
                      value={f.answer}
                      maxLength={2000}
                      onChange={(v) =>
                        store.changeFaq(f.id, { answer: v.target.value })
                      }
                    />
                  </div>
                  <button
                    disabled={locked}
                    className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8] danger"
                    title="Hapus FAQ"
                    onClick={() => store.removeFaq(f.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {e.faqs.length === 0 && (
                <div className="empty-row p-[26px_16px] [border:1px_dashed_#d4e0ef] rounded-[12px] bg-[#f9fbff] flex gap-[5px] flex-col items-center text-center text-[#7495c9]">
                  <CircleHelp size={24} />
                  <strong>Belum ada FAQ</strong>
                  <span>Kamu bebas menambahkan pertanyaan sesuai event.</span>
                </div>
              )}
              <div className="add-row bg-[#f6f9ff] [border:1px_dashed_#cbdcf7] rounded-[12px] p-[18px] flex flex-col items-stretch gap-[13px]">
                <div className="row-title flex items-center gap-[8px] text-[12px] font-extrabold text-[#3568c3]">
                  <Plus size={17} /> Tambah FAQ
                </div>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Pertanyaan
                  <input
                    disabled={locked}
                    value={question}
                    maxLength={250}
                    onChange={(v) => setQuestion(v.target.value)}
                    placeholder="Apa yang ingin diketahui peserta?"
                  />
                </label>
                <label className="field flex flex-col gap-[7px] text-[11px] text-[#4f6585] font-extrabold">
                  Jawaban
                  <textarea
                    disabled={locked}
                    rows={3}
                    value={answer}
                    maxLength={2000}
                    onChange={(v) => setAnswer(v.target.value)}
                    placeholder="Tulis jawabannya..."
                  />
                </label>
                <button
                  className="btn inline-flex items-center justify-center gap-[9px] [border:1px_solid_transparent] rounded-[10px] min-h-[41px] p-[0_16px] whitespace-nowrap text-[12px] font-extrabold [transition:background_.2s,_transform_.2s,_box-shadow_.2s] primary"
                  disabled={locked || !question.trim() || !answer.trim()}
                  onClick={() => {
                    store.addFaq(question, answer);
                    setQuestion("");
                    setAnswer("");
                  }}
                >
                  <Check size={16} /> Simpan FAQ
                </button>
              </div>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <span className="text-xs font-bold text-slate-500">Langkah {currentStep + 1} dari {builderSteps.length}</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={currentStep === 0}
                onClick={() => navigate(builderSteps[currentStep - 1].id)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
              >
                <ArrowLeft size={15} /> Sebelumnya
              </button>
              <button
                type="button"
                disabled={currentStep === builderSteps.length - 1}
                onClick={() => navigate(builderSteps[currentStep + 1].id)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-blue-700 disabled:opacity-40"
              >
                Berikutnya <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <div className="builder-foot [border-top:1px_solid_var(--line)] pt-[18px] mt-[25px] flex items-center gap-[9px] text-[11px] text-[#91a0b7]">
            <WandSparkles size={16} /> {fmt(e.fish.length)} ikan •{" "}
            {fmt(e.bonuses.length)} bonus • {fmt(e.participants.length)} peserta
            • {fmt(e.writtenRules.length)} peraturan
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import {
  BookOpen,
  Check,
  CircleHelp,
  Fish,
  Info,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";
import type { EditorSection } from "@/lib/arena-types";
import type { ArenaStore } from "@/hooks/use-arena";
import { fmt, validPoints } from "@/lib/arena-utils";

const sections: { id: EditorSection; text: string; icon: typeof Fish }[] = [
  { id: "general", text: "Informasi", icon: Settings2 },
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
  const locked = e.status === "finished";
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
      <div className="page-heading">
        <div>
          <div className="kicker">TOURNAMENT BUILDER</div>
          <h2>Atur pertandingan sesukamu.</h2>
          <p>
            Semua konfigurasi hanya berlaku untuk <b>{e.title}</b> dan tidak
            mengubah turnamen lain.
          </p>
        </div>
        <span className="pill neutral">
          {locked ? "Arsip terkunci" : "Perubahan tersimpan otomatis"}
        </span>
      </div>
      <div className="builder-layout">
        <nav className="builder-tabs" aria-label="Bagian pengaturan turnamen">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                type="button"
                className={`builder-tab ${tab === s.id ? "selected" : ""}`}
                onClick={() => {
                  setTab(s.id);
                  setName("");
                  setPoints("1");
                }}
              >
                <Icon size={18} />
                {s.text}
              </button>
            );
          })}
        </nav>
        <div className="panel builder-body">
          {locked && (
            <div className="notice warning">
              <ShieldCheck size={18} />
              Turnamen selesai telah dikunci. Buka kembali melalui daftar event
              bila perlu koreksi.
            </div>
          )}
          {tab === "general" && (
            <div className="stack-lg">
              <div className="block-title">
                <h3>Identitas Turnamen</h3>
                <p>
                  Informasi yang tampil pada header, detail event dan arsip.
                </p>
              </div>
              <div className="form-grid">
                <label className="field span-2">
                  Nama turnamen
                  <input
                    disabled={locked}
                    maxLength={100}
                    value={e.title}
                    onChange={(v) => store.field("title", v.target.value)}
                    placeholder="Contoh: Galatama Season 5"
                  />
                </label>
                <label className="field span-2">
                  Deskripsi singkat
                  <input
                    disabled={locked}
                    value={e.subtitle}
                    maxLength={180}
                    onChange={(v) => store.field("subtitle", v.target.value)}
                    placeholder="Deskripsi event"
                  />
                </label>
                <label className="field">
                  Lokasi / Pulau
                  <input
                    disabled={locked}
                    value={e.location}
                    onChange={(v) => store.field("location", v.target.value)}
                    placeholder="Bebas, bisa beberapa pulau"
                  />
                </label>
                <label className="field">
                  Host / Panitia
                  <input
                    disabled={locked}
                    value={e.host}
                    onChange={(v) => store.field("host", v.target.value)}
                    placeholder="Nama host"
                  />
                </label>
                <label className="field">
                  Tanggal event
                  <input
                    disabled={locked}
                    type="date"
                    value={e.eventDate}
                    onChange={(v) => store.field("eventDate", v.target.value)}
                  />
                </label>
                <label className="field">
                  Durasi (menit)
                  <input
                    disabled={locked}
                    type="number"
                    min={1}
                    max={1440}
                    value={e.timer.durationSec / 60}
                    onChange={(v) => store.setDuration(Number(v.target.value))}
                  />
                </label>
                <label className="field">
                  Mode pertandingan
                  <select
                    disabled={locked || e.entries.length > 0}
                    value={e.mode}
                    onChange={(v) =>
                      store.mode(v.target.value as "solo" | "squad")
                    }
                  >
                    <option value="solo">SOLO / Individu</option>
                    <option value="squad">SQUAD / Tim</option>
                  </select>
                </label>
                <label className="field">
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
                <label className="field">
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
                  <label className="field">
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
              <div className="notice">
                <Info size={18} />
                Mode Solo/Squad hanya bisa diganti sebelum ada transaksi skor.
                Mengganti durasi akan mereset timer event ini.
              </div>
            </div>
          )}
          {(tab === "fish" || tab === "bonuses") && (
            <div className="stack-lg">
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
              <div className="catalog-header">
                <span>AKTIF</span>
                <span>NAMA {tab === "fish" ? "IKAN" : "BONUS"}</span>
                <span>POIN</span>
                <span></span>
              </div>
              {(tab === "fish" ? e.fish : e.bonuses).length === 0 && (
                <div className="empty-row">
                  <Fish size={24} />
                  <strong>Belum ada {tab === "fish" ? "ikan" : "bonus"}</strong>
                  <span>
                    Isi form di bawah untuk membuat penilaian pertama.
                  </span>
                </div>
              )}
              {(tab === "fish" ? e.fish : e.bonuses).map((item) => (
                <div className="catalog-row" key={item.id}>
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
                    className="icon-button danger"
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
              <div className="add-row">
                <div className="row-title">
                  <Plus size={17} /> Tambahkan{" "}
                  {tab === "fish" ? "ikan" : "bonus"}
                </div>
                <div className="add-row-fields">
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
                    className="btn primary"
                    onClick={addCatalog}
                  >
                    <Plus size={16} />
                    Tambah
                  </button>
                </div>
              </div>
              <div className="notice">
                <ShieldCheck size={18} />
                Perubahan poin hanya berlaku untuk tangkapan berikutnya. Skor
                sebelumnya menyimpan nilai asli saat dicatat.
              </div>
            </div>
          )}
          {tab === "rules" && (
            <div className="stack-lg">
              <div className="block-title">
                <h3>Peraturan Tertulis</h3>
                <p>
                  Aturan pengunjung (diizinkan, dilarang, teknis, atau kategori
                  bebas). Terpisah dari mesin hitung skor.
                </p>
              </div>
              {e.writtenRules.map((r, i) => (
                <div className="editable-rule" key={r.id}>
                  <div className="rule-order">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rule-editor">
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
                    className="icon-button danger"
                    onClick={() => store.removeRule(r.id)}
                    title="Hapus aturan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {e.writtenRules.length === 0 && (
                <div className="empty-row">
                  <BookOpen size={24} />
                  <strong>Belum ada aturan tertulis</strong>
                  <span>Atur sendiri sesuai kebutuhan event.</span>
                </div>
              )}
              <div className="add-row">
                <div className="row-title">
                  <Plus size={17} /> Buat peraturan
                </div>
                <div className="form-grid">
                  <label className="field">
                    Kategori
                    <input
                      disabled={locked}
                      value={ruleGroup}
                      maxLength={60}
                      onChange={(v) => setRuleGroup(v.target.value)}
                      placeholder="Diizinkan, Dilarang, Teknis..."
                    />
                  </label>
                  <label className="field span-2">
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
                  className="btn primary"
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
            <div className="stack-lg">
              <div className="block-title">
                <h3>Peserta {e.mode === "squad" ? "& Squad" : "Individu"}</h3>
                <p>
                  Kelola nama, username Roblox, dan kehadiran. Peserta dengan
                  riwayat skor tidak dapat dihapus.
                </p>
              </div>
              {e.mode === "squad" && (
                <div className="squad-editor">
                  <h4>Daftar Squad</h4>
                  {e.squads.map((s) => (
                    <div className="squad-row" key={s.id}>
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
                        className="icon-button danger"
                        title="Hapus squad kosong"
                        onClick={() => store.removeSquad(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <div className="add-row-fields">
                    <input
                      disabled={locked}
                      value={squadName}
                      onChange={(v) => setSquadName(v.target.value)}
                      placeholder="Nama squad baru"
                    />
                    <button
                      disabled={locked || !squadName.trim()}
                      className="btn secondary"
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
              <div className="participant-list">
                {e.participants.map((p) => (
                  <div className="participant-edit" key={p.id}>
                    <div className="participant-avatar">
                      {p.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="participant-fields">
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
                          disabled={locked}
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
                    <label className="check-label">
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
                      className="icon-button danger"
                      title="Hapus peserta tanpa riwayat"
                      onClick={() => store.removeParticipant(p.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {e.participants.length === 0 && (
                  <div className="empty-row">
                    <Users size={24} />
                    <strong>Belum ada peserta</strong>
                    <span>Daftarkan peserta sebelum mencatat tangkapan.</span>
                  </div>
                )}
              </div>
              <div className="add-row">
                <div className="row-title">
                  <Plus size={17} /> Tambah peserta
                </div>
                <div className="form-grid">
                  <label className="field">
                    Nama tampil
                    <input
                      disabled={locked}
                      value={person}
                      onChange={(v) => setPerson(v.target.value)}
                      placeholder="Nama peserta"
                    />
                  </label>
                  <label className="field">
                    Username Roblox
                    <input
                      disabled={locked}
                      value={username}
                      onChange={(v) => setUsername(v.target.value)}
                      placeholder="Opsional"
                    />
                  </label>
                  {e.mode === "squad" && (
                    <label className="field">
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
                  className="btn primary"
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
            <div className="stack-lg">
              <div className="block-title">
                <h3>FAQ Turnamen</h3>
                <p>
                  Pertanyaan yang sering ditanyakan, tampil seperti accordion di
                  halaman publik.
                </p>
              </div>
              {e.faqs.map((f, i) => (
                <div className="editable-faq" key={f.id}>
                  <div className="rule-order">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="rule-editor">
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
                    className="icon-button danger"
                    title="Hapus FAQ"
                    onClick={() => store.removeFaq(f.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {e.faqs.length === 0 && (
                <div className="empty-row">
                  <CircleHelp size={24} />
                  <strong>Belum ada FAQ</strong>
                  <span>Kamu bebas menambahkan pertanyaan sesuai event.</span>
                </div>
              )}
              <div className="add-row">
                <div className="row-title">
                  <Plus size={17} /> Tambah FAQ
                </div>
                <label className="field">
                  Pertanyaan
                  <input
                    disabled={locked}
                    value={question}
                    maxLength={250}
                    onChange={(v) => setQuestion(v.target.value)}
                    placeholder="Apa yang ingin diketahui peserta?"
                  />
                </label>
                <label className="field">
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
                  className="btn primary"
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
          <div className="builder-foot">
            <WandSparkles size={16} /> {fmt(e.fish.length)} ikan •{" "}
            {fmt(e.bonuses.length)} bonus • {fmt(e.participants.length)} peserta
            • {fmt(e.writtenRules.length)} peraturan
          </div>
        </div>
      </div>
    </section>
  );
}

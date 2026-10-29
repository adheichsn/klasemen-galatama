"use client";
import { useRef, useState } from "react";
import {
  Download,
  Upload,
  AlertTriangle,
  Clock,
  RotateCcw,
} from "lucide-react";
import Dialog from "./dialog";
import { downloadJson } from "@/lib/storage";
import type { TournamentStore } from "@/hooks/use-tournament";
export default function SettingsDialog({
  store,
  onClose,
}: {
  store: TournamentStore;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(
    String(store.data.timer.durationSec / 60),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const duration = Number(minutes);
  const changeDuration = () => {
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) return;
    if (window.confirm("Ubah durasi? Timer yang sedang berjalan akan direset."))
      store.setDuration(duration);
  };
  const load = async (file?: File) => {
    if (!file) return;
    if (
      !window.confirm(
        "Memuat backup akan mengganti seluruh data event saat ini. Lanjutkan?",
      )
    )
      return;
    try {
      const content: unknown = JSON.parse(await file.text());
      if (!store.importData(content))
        window.alert("Format backup tidak valid atau tidak kompatibel.");
      else {
        window.alert("Backup berhasil dimuat.");
        onClose();
      }
    } catch {
      window.alert("File tidak dapat dibaca. Pastikan format JSON valid.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  return (
    <Dialog
      title="Pengaturan Event"
      subtitle="Informasi turnamen, timer, dan data lokal."
      onClose={onClose}
    >
      <label className="field-label">
        Nama event
        <input
          value={store.data.title}
          maxLength={80}
          onChange={(e) => store.setMeta("title", e.target.value)}
        />
      </label>
      <label className="field-label">
        USN / Nama penyelenggara
        <input
          placeholder="Contoh: Host Galatama"
          value={store.data.usn}
          onChange={(e) => store.setMeta("usn", e.target.value)}
        />
      </label>
      <label className="field-label">
        Map
        <input
          placeholder="Contoh: Crater Island"
          value={store.data.map}
          onChange={(e) => store.setMeta("map", e.target.value)}
        />
      </label>
      <div className="section-rule" />
      <h3 className="section-heading">
        <Clock size={18} /> Durasi turnamen
      </h3>
      <div className="inline-field">
        <input
          aria-label="Durasi dalam menit"
          type="number"
          min="1"
          max="1440"
          step="1"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        <span>menit</span>
        <button
          className="outline-button"
          disabled={
            !Number.isFinite(duration) || duration < 1 || duration > 1440
          }
          onClick={changeDuration}
        >
          Terapkan
        </button>
      </div>
      <div className="section-rule" />
      <h3 className="section-heading">Backup & Pemulihan</h3>
      <div className="settings-actions">
        <button
          className="outline-button"
          onClick={() => downloadJson(store.data)}
        >
          <Download size={17} /> Export JSON
        </button>
        <button
          className="outline-button"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={17} /> Import JSON
        </button>
        <input
          ref={fileRef}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={(e) => void load(e.target.files?.[0])}
        />
      </div>
      <div className="warning-text">
        <AlertTriangle size={16} />
        <span>
          Versi awal ini menyimpan data di browser (localStorage), bukan
          database bersama. Export backup secara berkala. Jangan gunakan sebagai
          satu-satunya pencatatan event produksi.
        </span>
      </div>
      <div className="section-rule" />
      <h3 className="section-heading danger-text">Zona Reset</h3>
      <div className="settings-actions">
        <button
          className="danger-button"
          onClick={() => {
            if (
              window.confirm(
                "PERINGATAN: semua catatan skor akan dihapus. Export backup terlebih dahulu. Lanjutkan reset skor?",
              )
            )
              store.resetScores();
          }}
        >
          <RotateCcw size={16} /> Reset Semua Poin
        </button>
        <button
          className="danger-button"
          onClick={() => {
            if (
              window.confirm(
                "PERINGATAN: SEMUA data, clan, peserta, aturan, dan skor akan diganti default. Lanjutkan?",
              ) &&
              window.confirm(
                "Konfirmasi terakhir: hapus seluruh data saat ini?",
              )
            ) {
              store.restoreDefaults();
              onClose();
            }
          }}
        >
          <AlertTriangle size={16} /> Reset Seluruh Event
        </button>
      </div>
    </Dialog>
  );
}

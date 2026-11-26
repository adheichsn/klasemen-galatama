"use client";
import { useActionDialog } from "@/components/ui/action-dialog";
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
  const ask = useActionDialog();
  const [minutes, setMinutes] = useState(
    String(store.data.timer.durationSec / 60),
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const duration = Number(minutes);
  const changeDuration = async () => {
    if (!Number.isFinite(duration) || duration < 1 || duration > 1440) return;
    if (
      await ask({
        title: "Ubah durasi pertandingan?",
        description: "Timer yang berjalan akan direset.",
        accept: "Ubah durasi",
      })
    )
      store.setDuration(duration);
  };
  const load = async (file?: File) => {
    if (!file) return;
    if (
      !(await ask({
        title: "Muat backup event?",
        description:
          "Seluruh data event saat ini akan diganti dengan isi file.",
        accept: "Muat backup",
        destructive: true,
      }))
    )
      return;
    try {
      const content: unknown = JSON.parse(await file.text());
      if (!store.importData(content))
        await ask({
          title: "Backup gagal dimuat",
          description: "Format backup tidak valid atau tidak kompatibel.",
          accept: "Mengerti",
          notice: true,
        });
      else {
        await ask({
          title: "Backup berhasil dimuat",
          description: "Data event sudah dimuat dari file backup.",
          accept: "Selesai",
          notice: true,
        });
        onClose();
      }
    } catch {
      await ask({
        title: "File gagal dibaca",
        description: "Periksa apakah file berisi JSON yang valid.",
        accept: "Mengerti",
        notice: true,
      });
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
      <h3 className="section-heading danger-text !text-[#df4b61]">
        Zona Reset
      </h3>
      <div className="settings-actions">
        <button
          className="danger-button"
          onClick={async () => {
            if (
              await ask({
                title: "Reset semua poin?",
                description:
                  "Semua catatan skor akan dihapus. Ekspor backup jika masih diperlukan.",
                accept: "Reset poin",
                destructive: true,
              })
            )
              store.resetScores();
          }}
        >
          <RotateCcw size={16} /> Reset Semua Poin
        </button>
        <button
          className="danger-button"
          onClick={async () => {
            if (
              (await ask({
                title: "Ganti seluruh data event?",
                description:
                  "Clan, peserta, aturan, dan skor akan diganti dengan data awal.",
                accept: "Lanjutkan",
                destructive: true,
              })) &&
              (await ask({
                title: "Hapus data saat ini?",
                description:
                  "Konfirmasi terakhir untuk mengembalikan seluruh data ke kondisi awal.",
                accept: "Hapus dan reset",
                destructive: true,
              }))
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

# Galatama Arena — Next.js Custom Scoreboard (MVP)

MVP dashboard turnamen Galatama Fish It yang bisa dijalankan lokal di VS Code dan **tidak memerlukan database** untuk percobaan.

## Fitur
- 6 clan × 3 peserta sebagai starter; tambah clan maksimal 12, peserta maksimal 20 per clan.
- Ubah nama clan, warna, username, display name, dan status kehadiran.
- **Rule Builder:** tambah, edit, nonaktifkan, dan hapus jenis tarikan/bonus/penalti; ubah nilainya bebas.
- Catat tarikan multi-rule + quantity (1–99) secara bersamaan.
- Penyesuaian skor manual angka bulat positif/negatif sampai ±1.000.000 dengan alasan.
- Skor peserta, total clan, dan klasemen dihitung otomatis dari jurnal transaksi (bukan disimpan terpisah).
- Audit trail tiap catatan + pembatalan dengan transaksi pembalik; perubahan aturan tidak mengubah nilai riwayat lama.
- Timer start/pause/reset dan durasi fleksibel 1–1440 menit.
- Autosave di `localStorage`, export/import backup JSON.
- Tampilan responsif desktop/mobile.

## Jalankan

Persyaratan: Node.js 20.19+ (disarankan 22+), npm.

```bash
npm install
npm run dev
```

Buka http://localhost:3000

Untuk cek build:

```bash
npm run typecheck
npm run build
```

## Struktur modular

- `app/`: layout, halaman, styling
- `components/`: scoreboard, modal tarik ikan, poin manual, rule editor, clan, history, settings
- `hooks/use-tournament.ts`: state dan transaksi event
- `lib/types.ts`: tipe data
- `lib/default-data.ts`: data demo awal
- `lib/scoring.ts`: perhitungan poin + timer
- `lib/storage.ts`: validasi & export backup

## Batasan penting (WAJIB DIBACA)

Ini **prototipe lokal**, BUKAN sistem multi-admin live production.
Data hanya tersimpan **per browser/per perangkat** dalam localStorage. Buka di browser/perangkat lain **tidak akan tersinkron**. Data hilang jika storage dibersihkan/incognito berakhir. Export backup sebelum menutup event. Situs bisa di-deploy ke Vercel untuk demo, tetapi masih akan mengandalkan storage browser dan **tidak berbagi data**.

Untuk event produksi dan dashboard penonton live, upgrade ke database PostgreSQL (misalnya Prisma + Postgres), authentication admin, server-side validation, transaksi atomik, audit trail immutable, eventId, SSE/WebSocket untuk sinkron skor, role-based access (admin/operator/viewer), dan snapshot backup.

## Roadmap implementasi production
1. Auth admin/operator dan Postgres migration.
2. Server-authoritative transaction log; concurrency, idempotency, role checks.
3. Public readonly scoreboard sinkron live (SSE/WebSocket/polling).
4. Multi-event/multi-sesi/Grand Final, import & export laporan.
5. Replay, fairness, penguncian skor setelah final, audit aktivitas lengkap.

## Catatan penilaian
- Aturan baru **tidak mengubah** entry sebelumnya, karena tiap entry menyimpan `pointsEach` dan nilai total saat transaksi.
- Pembatalan **menambahkan** entry dengan nilai berlawanan, bukan menghapus sejarah.
- Hapus clan / peserta tidak diperbolehkan jika memiliki riwayat poin.
- Ini adalah implementasi baru yang mengambil pola fungsional dari screenshot referensi; tidak menyalin source website pihak lain.

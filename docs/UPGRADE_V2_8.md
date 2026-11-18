# WEJI ARENA V2.8 — Live Leaderboard & Spectator Mode


## Upgrade tanpa reset Supabase

1. **Backup** project dan export data turnamen sebelum menimpa source.
2. Extract ZIP **PATCH-ONLY** ke root source yang berisi `package.json`, lalu overwrite file sesuai manifest.
3. **Tidak ada perubahan `db/schema.sql`**. Tidak perlu SQL migration; pertahankan `.env.local` termasuk `DATABASE_URL` dan password admin.
4. Di terminal jalankan:

   ```bash
   npm install
   npm run test:smoke
   npm run test:source
   npm run typecheck
   npm run build
   npm run dev
   ```

5. Uji di **event Draft uji**, lalu Published → Live. Buka detail dari browser kedua (incognito/perangkat lain). Input satu tangkapan sebagai admin dan tekan **Simpan ke Server**. Klasemen pengunjung harus menyegarkan otomatis, lalu muncul di Live Activity.

## Yang baru

- **SSE event-scoped**: `/api/public/stream?eventId=<id>` menggunakan `LISTEN/NOTIFY` PostgreSQL. Aplikasi hanya mengirim **ID event yang berubah** (bukan payload skor, bukti tangkapan, session, atau catatan admin) sebagai sinyal agar halaman publik memuat ulang data dari server.
- **Polling cadangan** setiap 15 detik dan refresh ketika tab pengunjung kembali aktif. Jika hosting/serverless memutus SSE, pengunjung tetap menerima pembaruan periodik.
- **Spectator / OBS** di `/spectate/<eventId>` menampilkan klasemen, timer, status pertandingan, dan feed publik tanpa sidebar, footer, atau tombol admin. Tautan tersedia di halaman detail event. Bisa ditambahkan sebagai OBS Browser Source (disarankan mulai dari 1920×1080 dan disesuaikan dengan layout scene).
- **Live Activity Feed** menampilkan tangkapan, koreksi, pembatalan, nama peserta, dan squad (jika sesuai) berdasarkan transaksi yang sudah tersimpan. Alasan internal panitia dan referensi bukti tidak dipublikasikan.
- **Server clock sync**: timer menghitung berdasarkan timestamp server, dengan endpoint waktu untuk mengompensasi perbedaan jam perangkat pengunjung. Status Start/Pause/Resume/Finish tetap dikelola oleh panitia melalui penyimpanan server.
- **Admin lifecycle endpoint**: memperbaiki mismatch antara `/api/admin/event` dan `/api/admin/events` pada ZIP baseline. `/events` menjadi path resmi; `/event` tetap alias kompatibilitas.

## Cara menggunakan Spectator

1. Di Panel Panitia, buat event uji dan publikasikan, daftar peserta, tekan **Start** dan **Simpan ke Server**.
2. Buka halaman detail event publik → klik **Spectator / OBS**.
3. Untuk OBS: Sources → `+` → Browser → masukkan URL `https://domainmu/spectate/ID_EVENT` atau URL localhost bila OBS berjalan di komputer yang sama.
4. Lakukan input skor sebagai panitia di tab terpisah. Setelah **Simpan ke Server**, ranking dan feed penonton menerima pembaruan SSE jika listener tersedia.
5. Tes saat SSE tidak aktif: putuskan jaringan listener / gunakan jaringan lain dan pastikan label berubah menjadi mode cadangan dan klasemen tetap update setiap ±15 detik setelah tersambung kembali.

## Pembatasan dan keamanan

- **Read-only**: spectators tidak punya akses login/staff, operasi scoring atau audit internal.
- **Published only**: stream dan halaman spectator menolak event Draft private dan event Trash. Event yang di-unpublish akan hilang dari halaman publik saat refresh berikutnya.
- **Perangkat panitia**: skor baru hanya tampil setelah **Simpan ke Server**. Input lokal yang belum disimpan tidak pernah menjadi notifikasi publik.
- **Serverless deployment**: SSE merupakan best effort. Proses Vercel/serverless dapat dibatasi durasi atau dihentikan mendadak; koneksi akan mencoba ulang dan polling 15 detik tetap aktif. Satu proses Node mengalokasikan satu koneksi Postgres LISTEN selama ada spectator; banyak instance dapat menggunakan lebih banyak koneksi. Pantau koneksi database untuk traffic besar.
- **Pooler**: `LISTEN/NOTIFY` memerlukan koneksi sesi yang bertahan; gunakan Session pooler Supabase (biasanya port 5432), bukan transaction pooler 6543. Jika listener tidak tersedia, polling tetap berfungsi.
- **Bukan jaminan push setiap detik** di semua provider hosting. QA dengan dua perangkat/lingkungan produksi diperlukan sebelum event sesungguhnya.
- **Tidak ada perubahan** pada formula skor SOLO/SQUAD, immutable ledger, final result lock, audit V2.6, registry V2.7, Trash/Permanent Delete V2.7.1, atau schema Supabase.

## QA wajib sebelum SAFE

- `npm run typecheck` dan `npm run build` di komputer lokal.
- Test LIVE SOLO dan SQUAD: update ranking, total skor, aktivitas tangkapan dan pembatalan.
- Test timer Start/Pause/Resume/Finish di dua browser (cek perubahan status tanpa refresh manual).
- Test tidak ada informasi internal pada event Draft/Trash atau di Live Activity.
- Test Recycle Bin / Restore / Permanent Delete tetap bekerja.
- Test browser desktop, tablet, mobile, dan OBS; test fallback setelah SSE gagal.

## Rollback

Jika fitur live mengalami masalah, restore source V2.7.1 dari backup. Data Supabase tidak perlu diubah karena tidak ada migrasi database. Sebelum rollback, ekspor data jika ada hasil baru.

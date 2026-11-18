# WEJI ARENA V2.8.1 — Realtime Stability & QA Polish

## Perubahan

- SSE spectator: pesan `connected` menunjukkan listener PostgreSQL aktif; `degraded` menunjukkan listener tidak terhubung; `reconnect` dipakai untuk rotasi stream 50 detik. Event `update` tetap hanya berisi sinyal, bukan data skor.
- Koneksi PostgreSQL LISTEN/NOTIFY: pengecekan kesehatan berkala, status putus yang benar, dan backoff bertahap. Satu listener per proses Node, bukan per spectator.
- Browser: reconnect manual dengan exponential backoff + jitter, pembatasan refresh, refresh saat tab kembali aktif atau sambungan pulih, dan polling cadangan setiap 15 detik walaupun SSE sedang terhubung.
- Countdown: mengukur offset waktu server memakai round-trip request, lalu menghitung dengan `performance.now()` agar perubahan jam OS tidak membuat countdown meloncat. Resync setiap 30 detik dan saat tab aktif lagi.
- Regression: pengujian nyata `ReadableStream` SSE dengan mock backend (event update, degraded, connected, abort, event privat); test perhitungan offset dan backoff. Tidak perlu SQL baru.

## Upgrade

1. Backup folder source dan export backup event dari admin sebelum memasang patch.
2. Extract PATCH-ONLY ke root project V2.8.0, **jangan membuat folder bertingkat**. Timpa file yang sama, pertahankan `.env.local`.
3. Jalankan `npm ci`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, kemudian `npm run dev`.
4. Tidak perlu menjalankan `db/schema.sql` atau mereset Supabase. Tidak ada perubahan pada scoring, arsip, maupun data pertandingan.

## QA manual dua browser (wajib sebelum produksi)

1. Buat event **Draft khusus QA**, terbitkan, tambahkan peserta SOLO. Gunakan dua browser/profile terpisah (misal Chrome + Edge).
2. Browser A: login panitia. Browser B: buka `/spectate/<ID_EVENT>` lalu detail turnamen. Cek indikator LIVE berubah dari fallback menjadi terhubung (hanya bila LISTEN benar-benar aktif).
3. Di A, mulai pertandingan dan klik **Simpan ke Server**. Cek timer di B berjalan dan berkurang setiap detik. Ubah jam komputer beberapa menit sementara halaman terbuka: countdown tidak boleh meloncat setelah sinkron server.
4. Di A, catat tangkapan dan **Simpan ke Server**. Cek poin, urutan peringkat, dan Live Activity di B berubah tanpa refresh manual. Coba juga SQUAD.
5. Matikan koneksi di browser B / gunakan Network Offline: indikator turun ke mode cadangan. Setelah Online, data baru harus dikejar; refresh polling tiap 15 detik menjadi cadangan saat SSE gagal.
6. Biarkan tab B di background beberapa menit, lalu buka kembali. Klasemen harus mengejar data terbaru. Uji Pause/Resume/Finish; setelah Finish hasil tetap terkunci di Arsip dan Hall of Fame.
7. Pastikan event Draft/unpublished/Trash tidak dapat dilihat melalui `/spectate/<ID_EVENT>`. Uji kembali Restore dan Permanent Delete pada **event tes**, bukan data produksi.
8. Periksa Network browser untuk SSE `text/event-stream`, Console tidak ada error baru, serta log terminal server. Simulasikan 2 browser selama beberapa menit.

### Catatan deployment

- SSE dengan `pg LISTEN` membutuhkan sesi database yang menetap. Supabase **Session pooler port 5432** atau koneksi Direct cocok; **Transaction pooler port 6543** jangan digunakan untuk listener LISTEN/NOTIFY. Connection string tetap rahasia di server.
- Pada Vercel/serverless, function bisa dirotasi atau dipindahkan antar-instance. Push notification bersifat **best effort**; polling HTTP 15 detik tetap aktif sebagai mekanisme pemulihan. Untuk SLA realtime ketat, gunakan layanan realtime terkelola atau server Node long-lived.
- Jangan menyebut V2.8.1 SAFE-FROZEN sebelum lulus `npm run build` dan QA browser 2 klien terhadap Supabase asli.

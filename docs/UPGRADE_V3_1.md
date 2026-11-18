# WEJI ARENA V3.1 — Premium Marketplace Experience

## Fitur

- Header publik premium: top strip, pencarian, tautan klasemen LIVE, menu mobile dengan `aria-expanded`.
- Hero carousel: banner unggulan yang sudah tersimpan di database, animasi teks halus, navigasi dot/arrow, swipe, pause on hover/focus, dan `prefers-reduced-motion`.
- Homepage: ringkasan LIVE/Upcoming/Finished berdasarkan jumlah event publik yang sesungguhnya, kategori serta kartu responsif, reveal animation.
- `/turnamen`: pencarian instan berdasarkan judul/subtitle/map/host; filter mode SOLO/SQUAD, status LIVE/Upcoming/Finished, urutan, pagination "Muat lebih banyak", state filter di URL untuk share link.
- Data kartu katalog ringan (id, judul, mode, status, lokasi, banner, jumlah peserta, poin teratas); tidak mengirim data transaksi skor atau catatan admin lengkap ke client katalog.
- Public shell, pages statistik, arsip, detail, spectator, dan dashboard admin masih ada.

## Instalasi

1. Backup source V3.0. Ekspor data/back up Supabase jika diperlukan.
2. Extract isi **PATCH-ONLY V3.1** ke root folder project (sejajar `package.json`), lalu timpa file yang sesuai.
3. Pertahankan `.env.local` — jangan overwrite atau commit. **Tidak perlu menjalankan SQL baru**.
4. Jalankan:

```bash
npm ci
npm run test:smoke
npm run test:source
npm run typecheck
npm run build
npm run dev
```

## Checklist QA browser

- Desktop (1440/1280 px): hero banner, kategori, event cards, jarak kolom, dan semua CTA tidak terpotong.
- Tablet (768 px) & Mobile (390/360 px): buka/tutup menu, link navigasi, carousel swipe/arrow, card grid, pencarian dan filter; tidak ada horizontal overflow.
- Katalog `/turnamen`: ketik keyword parsial (tanpa submit), pilih SOLO/SQUAD dan status, sort, klik "Muat lebih banyak", klik Reset, lalu reload tautan filter; hasil tetap sesuai.
- Cek mode reduced motion (OS/browser): animasi otomatis tidak berjalan atau berkurang.
- Uji event dengan banner uploaded serta tanpa banner: fallback gradient muncul, card tetap readable.
- Admin: login satu akun, buat/edit/publish event, upload banner, simpan Supabase, pastikan homepage dan katalog update.
- Regressions: scoring SOLO/SQUAD, roster lock, timer, SSE spectator & polling fallback, arsip, Hall of Fame, Trash/Restore/Delete.
- Jalankan production build lokal dan cek DevTools Console/Network.

## Batas verifikasi paket

Smoke test V2.1–V3.1 dan syntax check dijalankan di lingkungan pembuatan patch. Full Next.js build/browser QA tidak dapat diverifikasi di lingkungan pembuatan karena `npm ci --offline` gagal pada paket `xtend` yang tidak ada di cache. Build & QA browser di komputer pengguna wajib sebelum production.

## Deployment nanti

Deployment Vercel + Supabase **belum dilakukan di V3.1**. Gunakan `docs/UPGRADE_V3_0.md` sebagai dasar keamanan; pada tahap deployment kita verifikasi env variables, pooler, serverless SSE fallback, domain/cookie, migrasi, dan rollback.

# GALATAMA ARENA — Clean Gaming Blue

Next.js + React + TypeScript + Lucide Icons. Multi-turnamen Fish It dengan sistem skor bebas, leaderboard SOLO/SQUAD, aturan event, FAQ, arsip, Hall of Fame, audit journal, dan backup JSON.

## Jalankan

```bash
npm install
npm run dev
```

Lihat di `http://localhost:3000`. Node.js 20.19+ disarankan. Build: `npm run typecheck && npm run build`.

## Langkah penggunaan

1. Buka **Tournament Builder > Informasi** dan atur judul, tanggal, lokasi, mode, dan durasi.
2. Di **Katalog Ikan**, buat ikan beserta nilai poin dasar. Di **Bonus Poin**, buat nilai Mutasi/Big/Shiny atau jenis apa pun (tidak ada nilai default yang di-hardcode).
3. Tambahkan **Peserta**, dan buat Squad terlebih dahulu bila menggunakan mode Squad.
4. Isi **Peraturan** dan **FAQ** sesuai event. Ini teks publik, bukan bagian dari rumus skor.
5. Pilih **Dashboard > Mulai pertandingan**, jalankan timer bila perlu, klik **Input Tangkapan** untuk mencatat poin.
6. Setelah pertandingan, klik **Akhiri & arsipkan**. Event terkunci dan muncul di **Arsip Galatama** serta **Hall of Fame**.
7. Gunakan **Turnamen > Duplikat** untuk menduplikasi konfigurasi tanpa membawa peserta atau nilai skor. **Backup** untuk export semua event ke JSON.

## Roadmap produksi

Autentikasi admin/operator (NextAuth), PostgreSQL + Prisma, semua transaksi server-authoritative dan idempotent, permissions, SSE/WebSockets live leaderboard, snapshot final yang tidak dapat dimodifikasi tanpa revisi resmi, timestamp verification, audit admin, tie-breaker custom, ekspor laporan, dan arsip publik berbasis database.

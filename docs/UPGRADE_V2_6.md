# WEJI ARENA V2.6 — Upgrade & Rollback

## Before upgrade

- Export JSON turnamen dari tombol Backup di panel admin.
- Jika bisa, buat backup database PostgreSQL/Supabase.
- Pastikan tidak ada admin sedang menyimpan event saat maintenance.

## Install

1. Extract patch ke root source V2.5 (root yang memiliki `package.json`).
2. Jalankan **seluruh `db/schema.sql` V2.6** di Supabase SQL Editor. Script menggunakan `CREATE TABLE IF NOT EXISTS`, tidak menghapus data V2.5.
3. Pastikan tabel baru `weji_arena_score_audit` dan index `weji_arena_score_audit_event_idx` muncul.
4. Jalankan `npm install`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, `npm run dev`.
5. Uji event Draft **baru**, bukan turnamen asli. `Audit Skor` harus menampilkan record setelah Save berhasil.

## Behavioral changes

- Timer Start/Pause/Resume/Finish baru resmi setelah **Simpan ke Server**. Penyimpanan menormalkan timestamp berdasarkan jam server; itu dapat sedikit berbeda dari perkiraan browser.
- Simpan skor sebelum timer habis, jangan mencatat tangkapan ketika Pause. Jika server menolak perubahan, state PostgreSQL tetap aman; simpan backup JSON lokal dan refresh untuk menyelesaikan konflik. Jangan ulangi input manual sebelum memeriksa riwayat agar tidak dobel.
- Transaksi yang sudah disimpan tidak bisa diubah langsung. Gunakan transaksi pembalik atau koreksi baru.
- Referensi bukti opsional unik per-event; tanpa referensi, sistem tidak mampu mengidentifikasi dua hasil ikan yang identik secara fisik.
- Audit granular dimulai dari perubahan baru V2.6; `weji_arena_audit` lama tetap tidak diubah.
- Tidak ada migrasi format data `ArenaData.version`: tetap versi 2.

## Rollback

Jika terjadi regresi UI, pulihkan source V2.5 dan simpan tabel `weji_arena_score_audit` (tidak perlu DROP TABLE). **Perhatian:** V2.5 tidak memiliki guard tambahan V2.6, jadi hindari operasi scoring setelah rollback sampai kode baru pulih. Snapshot V2.6 menyimpan field opsional `catchRef`; V2.5 akan mengabaikannya tetapi tidak menghapusnya secara otomatis bila hanya membaca/menyimpan JSON. Lakukan uji di Draft setelah rollback.

## Test report scope

Smoke tests menguji fungsi murni tanpa koneksi ke Supabase. Pemeriksaan source menguji sintaks. Full Next.js build/browser serta koneksi PostgreSQL harus dijalankan di perangkat pengguna bila dependensi tidak tersedia di lingkungan penyusunan patch.

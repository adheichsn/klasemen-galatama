# WEJI ARENA V2.7.1 — Event Management & Recycle Bin

Upgrade dari **V2.7**. Tidak mereset event lama, seluruh sistem scoring tetap sama.

## Fitur

- **Turnamen / Arsip → ikon Trash**: soft-delete untuk event Draft, LIVE, atau Finished, meskipun sudah berskor.
- **Admin → Recycle Bin**: lihat daftar yang terhapus sementara, pulihkan (termasuk skor), atau hapus permanen.
- Penghapusan sementara langsung tersimpan di server, langsung menyembunyikan event dari publik, leaderboard, arsip, Hall of Fame, dan Participant Registry.
- Event LIVE otomatis *Pause* saat dipindah ke Trash; memulihkan tidak menjalankan timer lagi. Event yang dipulihkan tidak otomatis dipublikasikan.
- **Hapus permanen** memerlukan event berada di Trash, mengetik nama event **persis**, dan mencentang pengakuan risiko. Berlaku untuk event dengan tangkapan, poin, maupun hasil final. Tindakan permanen tidak bisa dipulihkan melalui aplikasi.
- Data event, roster, skor, detail audit skor, dan banner asset yang tidak digunakan turnamen lain dihapus dari database aktif. Metadata minimal tindakan hapus tetap ada di tabel audit. Backup atau snapshot database eksternal yang sudah dibuat sebelumnya tidak ikut terhapus.
- Aksi Trash/Restore/Delete dikendalikan server dengan autentikasi, pemeriksaan same-origin, revision lock/transaction, dan audit. Penghapusan melalui editor JSON/PUT biasa ditolak.
- Jika semua event aktif dipindahkan ke Trash, sistem membuat Draft kosong otomatis agar panel panitia tetap bisa digunakan.

## Instalasi

1. Backup database (termasuk tabel `weji_arena_state` dan audit) serta source V2.7.
2. Salin file PATCH-ONLY ke project V2.7. Pertahankan `.env.local`.
3. Jalankan seluruh isi `db/schema.sql` V2.7.1 di **Supabase SQL Editor**. SQL menambah **`weji_arena_event_audit`**, tidak melakukan DROP/TRUNCATE data lama. Lakukan ini sebelum memakai tombol Trash.
4. Di VS Code jalankan:

   ```bash
   npm install
   npm run test:smoke
   npm run test:source
   npm run typecheck
   npm run build
   npm run dev
   ```
5. Coba pada event uji: **Draft + skor**, **LIVE + skor**, **Finished + skor**, **Restore**, dan **Delete Permanen**. Verifikasi event lain beserta banner tetap utuh. Uji pada desktop/mobile serta login panitia.

## Catatan integritas

- **Simpan ke Server** dulu apabila ada perubahan lokal yang belum disimpan. Operasi Trash tidak akan diam-diam membuang perubahan lokal.
- Jika browser lain menyimpan perubahan lebih dulu, operasi ditolak dengan **HTTP 409**. Muat ulang halaman sebelum mengulang.
- Event berstatus `finished` tetap tidak bisa diedit skor/aturan. **Delete permanen melalui Recycle Bin** adalah pengecualian administratif khusus, bukan membuka final lock.
- Database URL, cookie/session secret, dan password panitia tetap di server, tidak ditempatkan pada `NEXT_PUBLIC_*`.
- V2.7.1 masih menggunakan **single-admin**. Untuk banyak akun dengan role khusus diperlukan modul RBAC berikutnya.

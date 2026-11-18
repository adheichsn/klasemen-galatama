# WEJI ARENA V2.7 — Participant & Squad Management

## Upgrade aman dari V2.6

Baseline yang digunakan: WEJI ARENA V2.6 full source yang cocok byte-for-byte dengan `WEJI_ARENA_V2_6_PATCH_ONLY_20261117(1).zip` pada 16 file patch-nya.

1. Buat backup source project sekarang, ekspor backup JSON dan backup database Supabase jika tersedia.
2. Ekstrak `WEJI_ARENA_V2_7_PATCH_ONLY_20261118.zip` ke root project berbasis V2.6. Jangan mengganti `.env.local`.
3. **Tidak perlu menjalankan SQL baru.** Data tambahan (`rosterLocked`, `squadSizeLimit`, `captainId`) merupakan field opsional di JSON event V2. Persistensi tetap `weji_arena_state` dengan revision lock yang sama.
4. Jalankan `npm install`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, lalu `npm run dev`.
5. Masuk `/admin/login` lalu buka **Tournament Builder → Peserta** untuk mencoba pada turnamen **Draft baru**. Tekan **Simpan ke Server** sebelum berpindah tab/perangkat.

## Yang berubah

- **Participant Registry lintas event** adalah indeks dari username di seluruh event yang sudah tersimpan pada data state (termasuk event lama); akun Roblox hanya digunakan sebagai identitas teks, bukan login atau verifikasi identitas Roblox. Tidak perlu tabel registry baru. Pendaftaran ulang selalu membuat record peserta baru untuk event yang dipilih.
- **Cari dan daftar** peserta secara individual untuk SOLO, atau pilih squad dahulu untuk SQUAD.
- **CSV import**: file maksimal **200 KB / 300 baris setiap batch**, dengan preview dan validasi atomik (jika ada error, seluruh batch tidak diimpor). Username Roblox wajib untuk CSV dan tidak boleh duplikat (case-insensitive) di event. Field `checkedIn` menerima `true/false`, `1/0`, `yes/no`, `ya/tidak`.
- **SQUAD CSV** memakai header `name,username,squad,checkedIn`. Nama squad yang belum ada dibuat otomatis saat import. **SOLO CSV** memakai `name,username,checkedIn` (field checkedIn opsional). Untuk nama dengan koma, gunakan tanda kutip standar CSV, contoh: `"Nama, Dua",username123,Alpha,true`.
- **Batas anggota** SQUAD konfigurabel dari 0 (tanpa batas) sampai 100, termasuk validasi di server; kapten dipilih dari roster anggota squad yang bersangkutan.
- **Roster Lock** bisa diaktifkan/dinonaktifkan saat Draft (tanpa skor). Ketika event sudah LIVE/FINISHED, identitas/anggota/squad/kapten/batas anggota terkunci otomatis. Check-in masih bisa diubah oleh panitia selama LIVE, tetapi tidak setelah FINISHED.
- **Proteksi server** pada `lib/score-integrity.ts` mengecek aturan roster terhadap snapshot lama dalam transaksi PostgreSQL yang memiliki row lock; manipulasi browser tidak dapat menambahkan anggota pada LIVE.

## Kompatibilitas dan keamanan

- Perhitungan poin, `ScoreEntry`, referensi bukti unik, audit V2.6, timer server, final lock, banner, publikasi, arsip dan homepage tidak diubah.
- Event lama tanpa field opsional tetap diterima, tidak ada reset / migrasi skema.
- Username yang sudah tersimpan sebelumnya tidak diubah/dinormalisasi paksa; untuk peserta baru, duplikat username dikenali secara case-insensitive.
- Penguncian roster melindungi seluruh data event melalui server, bukan hanya tombol yang disabled di UI.
- Participant Registry berbasis data turnamen di akun panitia; tidak menambah endpoint publik baru.
- Supabase tetap harus memiliki tabel V2.6 `weji_arena_score_audit` agar penyimpanan tetap bekerja.

## Checklist QA (event Draft uji, jangan finalisasi event produksi)

- Buat SOLO Draft: daftar dua peserta. Username sama dengan kapitalisasi berbeda harus ditolak.
- Import CSV valid + invalid. File invalid tidak boleh menghasilkan peserta sebagian.
- Buat SQUAD Draft: tambah Alpha, set batas 2, daftarkan dua anggota, pilih kapten. Anggota ketiga harus ditolak.
- Import CSV SQUAD dengan squad baru: harus tercipta squad dan anggota yang sesuai; pilih kembali squad dan verifikasi kapten.
- Aktifkan Roster Lock saat Draft; tambah/hapus/pindah peserta harus nonaktif. Buka kembali saat Draft untuk lanjut edit.
- Start dari Draft (siapkan ikan aktif), Simpan ke Server. Penambahan/pemindahan anggota harus ditolak; check-in LIVE masih bisa diubah dan disimpan.
- Uji nilai skor dan leaderboard SOLO/SQUAD. Setelah Finish, roster, check-in, dan skor harus tetap terkunci.
- Reload halaman admin dan publik; pastikan roster/score/banners/arsip tetap normal. Bila banyak tab aktif, konflik revisi masih dicegah.

## Rollback

Restore backup source V2.6. Jangan restore database otomatis; field opsional baru akan tetap di JSON tetapi diabaikan oleh kode V2.6. Hindari mengedit event V2.7 dari kode V2.6 sebelum membuat backup baru.

## Keterbatasan

Belum ada OAuth Roblox, verifikasi kepemilikan username, pendaftaran self-service publik, atau permission multi-admin. Tes otomatis unit/domain berhasil; full npm/Next build dan browser terhubung Supabase tetap perlu diuji di lingkungan lokal.

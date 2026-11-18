# WEJI ARENA V3.1.1 — Manual Historical Tournament Entry

## Pemasangan

1. Backup source V3.1 dan export backup turnamen dari panel admin. Pastikan Supabase yang digunakan memang berisi data pertandingan saat ini.
2. Extract PATCH-ONLY V3.1.1 ke root project, sejajar `package.json`. Pertahankan `.env.local` pribadi.
3. **Tidak perlu SQL baru atau reset Supabase**: menggunakan `weji_arena_state`, `weji_arena_audit`, dan `weji_arena_score_audit` yang sudah tersedia dari versi lama.
4. Jalankan `npm ci`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, dan `npm run dev`.

## Mencatat hasil Galatama 18 November 2026

1. Login satu akun panitia → **Turnamen** → klik **Arsip Historis SOLO** (atau SQUAD bila event tim).
2. Tournament Builder → Informasi: isi nama event sebenarnya, lokasi, tanggal `2026-11-18`, durasi `90` menit, dan peraturan tie-breaker yang berlaku saat itu. Status **Draft privat**, bukan Live.
3. Isi **Katalog Ikan** dan **Bonus Poin** sesuai peraturan yang benar-benar berlaku pada tanggal tersebut. Jangan menggunakan nilai event berikutnya.
4. Di **Peserta** masukkan daftar pemain asli (atau buat Squad dulu bila mode SQUAD). Simpan ke Server.
5. Buka **Dashboard** → bagian **Catat Event yang Sudah Selesai**. Klik **Catat tangkapan** untuk memasukkan ikan + bonus yang memang terekam. Simpan ke Server setelah input.
6. Jika sebagian ikan tidak tercatat tetapi total PTS resmi diketahui, pada tabel **Rekonsiliasi total poin resmi** isi *total akhir per peserta* (bukan penambahan poin). Contoh: sudah tercatat 6 PTS dari ikan, total resmi 10 PTS → sistem menambah transaksi **manual +4** dengan alasan rekonsiliasi. Tidak membuat tangkapan fiktif. Untuk SQUAD isi poin resmi per anggota agar kontribusi tim benar.
7. Periksa Juara 1, 2, 3 pada preview. Di dialog finalisasi, pilih Juara 1, 2, dan 3 sesuai catatan resmi; urutan pemain/tim berpoin sama dapat diubah, tetapi juara dengan poin lebih rendah tidak boleh melampaui yang berpoin lebih tinggi. Klik **Simpan ke Server**.
8. Tekan **Review & Finalisasi Arsip**, periksa ulang tanggal, skor, podium, ketik nama event persis, centang konfirmasi, lalu **Kunci & Publish FINISHED**. Ini perubahan atomik di server dan tidak bisa diundo lewat editor biasa.
9. Verifikasi **Arsip Galatama**, **Hasil Final**, **Hall of Fame**, dan **Statistik** di website publik. Jika event ternyata salah, jalur penghapusan tetap lewat Trash/Restore/Permanent Delete yang sudah ada (permanent delete menghancurkan hasil).

## Perlindungan teknis

- Event historis ditandai `historical: true`, tetap Draft privat sampai server memfinalisasi. Tidak dapat berganti ke mode Live, dan event normal tidak bisa diubah menjadi historis melalui PUT biasa.
- Skor historis hanya boleh ditambah (atau dibatalkan dengan transaksi pembalik); transaksi tersimpan tidak dapat ditimpa. ID referensi bukti tidak boleh dipakai ulang.
- Skor ikan dihitung dengan snapshot nilai ikan/bonus event tersebut. Transaksi rekonsiliasi menggunakan `kind: "manual"` sehingga **tidak ikut dianggap sebagai hasil tangkapan ikan**.
- `eventDate` merekam tanggal pertandingan asli. `historicalRecordedAt` adalah waktu pengarsipan di server. `finishedAt` sengaja tidak diisi dengan jam buatan karena tidak ada catatan jam asli.
- Pengarsipan adalah endpoint POST `/api/admin/historical`: wajib login, same-origin, revision CAS + database row lock, konfirmasi nama event dan podium; server mencatat audit finalisasi serta mengirim pemberitahuan publik.
- Event final terkunci, tetap kompatibel dengan hasil SOLO/SQUAD dan seluruh arsip lama. Tidak ada fitur sertifikat atau multi-admin.

## QA wajib

- SOLO 3+ peserta, 1 tangkapan bonus, 2 entri poin resmi; urutan podium, statistik ikan, dan poin akhir sesuai.
- SQUAD 3+ squad, snapshot anggota, kontribusi poin total per tim.
- Draft historis tidak bisa dibuka publik; setelah finalisasi muncul sebagai FINISHED pada tanggal asli.
- Tanpa membuka Live: timer tetap berhenti, tidak ada waktu mulai/akhir palsu.
- Coba input referensi bukti duplikat, menimpa transaksi lama, mengubah Draft historis jadi Live dan mengedit final: semuanya harus ditolak.
- Uji 2 tab admin: jika revisi berubah, finalisasi stale harus ditolak HTTP 409.
- Uji login/logout, data event lama, Trash/Restore, realtime dan upload banner masih normal.

## Status verifikasi paket

Smoke test domain dan pemeriksaan sintaks dilakukan di lingkungan pembuat patch. Full Next.js build dan QA browser dengan Supabase asli **belum terverifikasi** (cache npm tidak memiliki paket `xtend`). Jalankan tes tersebut secara lokal sebelum menggunakan pada arsip resmi.

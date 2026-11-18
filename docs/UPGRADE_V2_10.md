# WEJI ARENA V2.10 — Hall of Fame & Tournament Results V2

## Tujuan

Penyempurnaan Hall of Fame, klasemen final, riwayat juara SOLO, serta ekspor hasil pertandingan untuk panitia. **Tidak ada fitur sertifikat.** Tetap menggunakan Clean Gaming Blue, Tailwind CSS v4 dan data Supabase yang ada.

## Upgrade dari V2.9

1. Backup source V2.9 dan hasil ekspor JSON sebelum menimpa berkas.
2. Extract **PATCH-ONLY** ke **root** project (sejajar dengan `package.json`) dan timpa berkas.
3. Pertahankan `.env.local`, database dan tabel Supabase. **Tidak ada migrasi SQL.**
4. Jalankan `npm ci`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, `npm run dev`.
5. Coba dengan **event uji Finished + Published** sebelum digunakan untuk turnamen sesungguhnya.

## Fitur

- `/hall-of-fame`: daftar per edisi, mode SOLO/SQUAD, filter lokasi, pencarian, pagination. All-Time **SOLO** diurutkan berdasarkan jumlah gelar juara, podium, lalu partisipasi. Skor lintas event **tidak dijumlahkan**.
- `/turnamen/[id]/hasil`: hasil final yang lengkap, podium tiga besar, skor, Secret, dan daftar kontribusi anggota SQUAD. Tautan dari detail event dan arsip.
- `/pemain/[username]`: riwayat SOLO yang sudah Finished + Published; pengelompokan didasarkan pada username Roblox yang tercatat, tidak diverifikasi langsung via Roblox. Tanpa username valid tidak dibuat profil lintas edisi.
- **SQUAD**: hasil ditampilkan per edisi; nama squad yang sama antar-event **tidak digabung**, karena ID squad bersifat per turnamen. Kontribusi transaksi mengikuti snapshot squad saat pencatatan, fallback ke roster untuk legacy yang belum menyimpan snapshot.
- Panel Panitia > Hall of Fame: tombol **Klasemen CSV** dan **Jurnal Skor CSV** (admin-only, event selesai, bukan Trash). CSV menyertakan BOM UTF-8 dan escape karakter sehingga formula spreadsheet dari nama atau catatan tidak dieksekusi. Export CSV tidak mengubah skor atau audit.

## Security / historical integrity

- Seluruh halaman publik membaca daftar event dari `publicEvents()` → hanya **published, non-trashed**. Halaman hasil memeriksa `status === "finished"`; URL langsung ke Draft/Live/Trash/Unpublished mengembalikan 404.
- Endpoint `GET /api/admin/results/[id]?type=standings|ledger` melakukan **server-side** session check sebelum membaca snapshot, menolak format tidak dikenal, menolak event Trash/belum selesai, dan mengatur `Cache-Control: private, no-store`.
- Nilai final dari ledger dan fungsi standings yang ada (tidak dihitung ulang dengan konfigurasi ikan atau bonus saat ini). Pembatalan skor termasuk dalam total lewat transaksi reversal, bukan menghapus rekamannya.
- Tindakan hapus permanen V2.7.1 menghilangkan event dari daftar publik berikutnya. Backup lama yang terpisah tetap harus dikelola secara terpisah.

## QA checklist

1. **SOLO:** buat event uji yang selesai, terbitkan, cek podium, ranking, tie-break, statistik dan riwayat `/pemain/[username]`.
2. **SQUAD:** cek seluruh tim dan kontribusi anggota; pastikan skor historis tidak berubah ketika bonus event lain berbeda.
3. **Hall of Fame:** filter SOLO/SQUAD, lokasi, pencarian, pagination dan daftar juara berulang (win count bukan jumlah poin event).
4. **Private/Trash:** pastikan Draft, Unpublished, event di Trash, dan event terhapus permanen tidak muncul; URL hasil publik harus 404.
5. **CSV:** sebagai admin unduh dua jenis CSV; uji dengan nilai nama yang mengandung koma, tanda kutip, baris baru, atau diawali `=`. Coba akses endpoint tanpa login, seharusnya 401.
6. **Regression:** scoring SOLO/SQUAD, timer, audit, upload banner, Recycle Bin, Restore/Permanent Delete, SSE spectator, statistik V2.9.
7. **Responsive:** uji homepage, Hall of Fame, hasil final, dan profil SOLO di desktop, tablet, mobile.

## Catatan

Tidak ada tabel, schema, atau variabel `.env.local` baru. Tidak ada sertifikat. Full Next.js build dan QA browser harus diuji di komputer/deployment pengguna; unit/smoke test saja tidak menyatakan production-ready.

Commit: `feat(weji-arena): add final results, hall of fame history and protected csv exports`

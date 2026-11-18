# WEJI ARENA V2.9 — Advanced Tournament Statistics

## Tujuan
Analitik tournament per event SOLO/SQUAD dengan tampilan Clean Gaming Blue dan perhitungan ledger yang menghormati pembatalan, koreksi dan snapshot poin historis.

## Yang baru
- Menu **Statistik Turnamen** di dashboard panitia (pilih event aktif melalui halaman Turnamen).
- **`/statistik`** untuk katalog statistik event yang telah dipublikasikan, filter SOLO/SQUAD.
- **`/turnamen/[id]/statistik`** untuk analitik publik per event, termasuk live refresh SSE+polling V2.8.1 jika status LIVE.
- Ringkasan jumlah Secret valid, input tangkapan, poin total (termasuk koreksi), dan rata-rata poin per ikan.
- Distribusi jumlah ikan dan poin **per jenis Secret** berdasarkan snapshot `fishName`/`fishId` pada transaksi; jenis lama tanpa snapshot ditampilkan sebagai "Ikan lama (nama tidak tercatat)".
- Distribusi bonus berdasarkan snapshot nilai bonus pada tangkapan (bukan nilai bonus terkini).
- Performa tiap peserta; dalam mode SQUAD, ringkasan poin dan jumlah tangkapan per squad dengan kontribusi anggota.
- Ringkasan poin tangkapan, koreksi manual bersih, dan tangkapan yang dibatalkan.
- Perbaikan test lama V2.8.1 yang masih mencari format `setInterval` sebelum migrasi reconnect.

## Prinsip keamanan dan integritas
- Statistik **hanya baca**: tidak mengubah ledger atau skor dan tidak menulis ke database.
- Analitik publik memakai `getPublicEvents` yang memfilter `published && !trashedAt`. Draft/hidden/Trash tidak bisa dibuka melalui halaman statistik publik.
- Projection publik sekarang mencakup `fishId`, `fishName`, `basePoints` yang merupakan data skor game dan diperlukan agar nama ikan dan nilainya dapat dihitung dengan benar. **Tidak** mengirim `catchRef`, catatan admin atau field audit pribadi.
- Reversal mengeluarkan tangkapan asli dari distribusi ikan/bonus; skor reversal + skor asli tetap saling meniadakan dalam total ledger.
- Tangkapan lama tanpa identitas ikan tidak dipaksakan masuk ke kategori katalog saat ini.
- Kontribusi tim mengikuti snapshot squad pada transaksi, sehingga pengaturan roster saat ini tidak merusak histori tim.
- Tidak ada schema migration, `.env.local` baru, reset Supabase atau dependensi npm baru.

## Upgrade
1. Backup source V2.8.1 dan export backup event sebelum memasang patch.
2. Extract PATCH-ONLY ZIP di root project yang berisi `package.json`; timpa file sesuai struktur.
3. Pertahankan `.env.local` dan database Supabase.
4. Jalankan:

```sh
npm ci
npm run test:smoke
npm run test:source
npm run typecheck
npm run build
npm run dev
```

## QA browser yang perlu dilakukan
- Buka `/statistik`: event yang Published muncul, event Draft private/unpublished/Trash tidak muncul.
- Buka detail turnamen lalu **Statistik Turnamen**; cocokkan poin total dan distribusi dengan jurnal tangkapan.
- SOLO: tambah beberapa ikan dengan bonus +3, quantity > 1, koreksi manual dan reversal; cek metrik.
- SQUAD: input skor anggota dua squad; cek poin tim dan kontribusi anggota mengikuti klasemen.
- LIVE: buka panitia dan tab statistik publik; tambah tangkapan lalu **Simpan ke Server**; pastikan data berubah otomatis/reconnect.
- Selesaikan event dan pastikan statistik final stabil serta arsip/Trash/Restore tetap aman.
- Desktop, tablet, mobile: pastikan kartu dan chart tidak horizontal overflow.

## Status pengujian lokal
Smoke tests dan parser syntax berhasil pada pembuatan patch. Full build Next.js dan QA dua browser memerlukan `npm ci`, browser, serta database Supabase yang benar-benar terhubung di komputer/deployment pengguna.

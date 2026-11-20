import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import { PublicShell, Breadcrumb } from "@/components/public-site";
import { PlayerIdentity } from "@/components/player-avatar";
import { publicEvents } from "@/lib/public-events";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import { buildPlayerDirectory, findDirectoryPlayers, playerHref, playerTotals } from "@/lib/player-directory";
import type { AvatarProfiles } from "@/lib/avatar-identity";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 16;
const stringParam = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const params = await searchParams;
    const q = stringParam(params.q).trim().slice(0, 100);
    const mode = ["solo", "squad"].includes(stringParam(params.mode)) ? stringParam(params.mode) : "all";
    const order = ["wins", "events"].includes(stringParam(params.order)) ? stringParam(params.order) : "name";
    const { events, unavailable } = await publicEvents();
    let identityUnavailable = false;
    const profiles = await publicAvatarProfiles(events, () => { identityUnavailable = true; });
    const directory = buildPlayerDirectory(events, profiles);
    const filtered = findDirectoryPlayers(directory, q, mode, order);
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const requested = Number(stringParam(params.page));
    const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(pages, requested) : 1;
    const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const visibleProfiles: AvatarProfiles = {};
    for (const p of visible) if (p.target) visibleProfiles[p.target] = p.profile;
    const href = (next: number) => `/pemain?${new URLSearchParams({ q, mode, order, page: String(next) })}`;
    return <PublicShell profiles={visibleProfiles}>
        <main className="mx-auto max-w-[1220px] px-4 py-10 sm:px-6">
            <Breadcrumb label="Pemain" />
            <section className="relative mb-7 overflow-hidden rounded-3xl bg-gradient-to-br from-[#102658] via-[#2052b9] to-[#3288ed] p-7 text-white sm:p-10">
                <Users size={36} className="mb-4 text-blue-200" />
                <p className="text-[11px] font-black tracking-[.2em] text-blue-200">WEJI ARENA PLAYER DIRECTORY</p>
                <h1 className="mt-2 text-3xl font-black sm:text-4xl">Kenali Para Pemain</h1>
                <p className="mt-3 max-w-xl text-sm leading-7 text-blue-100">Jelajahi profil Roblox, riwayat pertandingan, dan pencapaian komunitas WEJI ARENA.</p>
                <div className="mt-5 inline-flex rounded-xl bg-white/15 px-4 py-2 text-sm font-bold">{directory.length} profil pemain</div>
            </section>
            <form action="/pemain" method="get" className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-[1fr_145px_175px_auto] sm:items-end">
                <label className="text-xs font-bold text-slate-600">Cari pemain<input name="q" defaultValue={q} maxLength={100} placeholder="Nama, username, atau Roblox ID" className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-blue-500" /></label>
                <label className="text-xs font-bold text-slate-600">Mode<select name="mode" defaultValue={mode} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="all">Semua mode</option><option value="solo">SOLO</option><option value="squad">SQUAD</option></select></label>
                <label className="text-xs font-bold text-slate-600">Urutkan<select name="order" defaultValue={order} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"><option value="name">Username A-Z</option><option value="wins">Gelar terbanyak</option><option value="events">Edisi final terbanyak</option></select></label>
                <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"><Search size={16} /> Cari</button>
            </form>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-black text-[#142A55]">Daftar Pemain</h2><span className="text-xs font-bold text-slate-500">{filtered.length} ditemukan</span></div>
            {unavailable || identityUnavailable ? <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Data pemain belum tersedia karena koneksi database. Coba kembali beberapa saat lagi.</p> : !visible.length ? <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center"><Users className="mx-auto mb-3 text-blue-400" size={32} /><h3 className="font-bold">{directory.length ? "Tidak ada pemain yang cocok" : "Profil pemain belum tersedia"}</h3><p className="mt-2 text-sm text-slate-500">{directory.length ? "Coba kata kunci atau mode lain." : "Profil tampil setelah peserta dihubungkan pada turnamen publik. Jika sebelumnya tersedia, coba lagi nanti."}</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map(player => {
                    const totals = playerTotals(player); return <article key={player.profile.robloxId} className="flex min-w-0 flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                        <PlayerIdentity target={player.target} name={player.profile.displayName || player.profile.username} size="lg" />
                        <div className="grid grid-cols-3 gap-1 rounded-xl bg-blue-50 p-3 text-center"><div><b className="block text-lg text-blue-800">{totals.finalEvents}</b><span className="text-[11px] text-slate-600">Edisi final</span></div><div><b className="block text-lg text-blue-800">{totals.wins}</b><span className="text-[11px] text-slate-600">Gelar</span></div><div><b className="block text-lg text-blue-800">{totals.podiums}</b><span className="text-[11px] text-slate-600">Podium</span></div></div>
                        <div className="flex flex-wrap gap-1">{(["solo", "squad"] as const).filter(m => player.history.some(h => h.mode === m)).map(m => <span key={m} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{m.toUpperCase()}</span>)}</div>
                        <Link prefetch={false} href={playerHref(player.profile.robloxId)} className="mt-auto flex items-center justify-between rounded-xl border border-blue-100 px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50">Lihat Profil <ArrowRight size={15} /></Link>
                    </article>;
                })}
            </div>}
            {pages > 1 && <nav aria-label="Halaman pemain" className="mt-7 flex items-center justify-center gap-4 text-sm">{page > 1 && <Link className="font-bold text-blue-700 hover:underline" href={href(page - 1)}>Sebelumnya</Link>}<span className="text-slate-500">{page} / {pages}</span>{page < pages && <Link className="font-bold text-blue-700 hover:underline" href={href(page + 1)}>Berikutnya</Link>}</nav>}
            <p className="mt-6 text-xs leading-6 text-slate-500">Direktori hanya memuat identitas yang dikonfirmasi panitia pada turnamen publik. Statistik berasal dari hasil final; akun tanpa hubungan profil tidak digabung berdasarkan nama. Hubungan ini bukan verifikasi kepemilikan akun Roblox.</p>
        </main>
    </PublicShell>;
}

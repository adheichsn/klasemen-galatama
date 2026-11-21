import { nonIndexMetadata } from "@/lib/seo";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PublicShell, Breadcrumb, dateLabel } from "@/components/public-site";
import { publicEvents } from "@/lib/public-events";
import { publicAvatarProfiles } from "@/lib/avatar-identity-db";
import {
  buildPlayerDirectory,
  playerHref,
  resolveLegacyHistory,
} from "@/lib/player-directory";
import { normalizedRobloxUsername } from "@/lib/tournament-results";
import { fmt } from "@/lib/arena-utils";
export const dynamic = "force-dynamic";
export const metadata = {
  ...nonIndexMetadata,
  title: "Riwayat username Roblox",
};
/** Preserve old bookmarked username routes without merging different accounts. */
export default async function LegacyPlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: raw } = await params;
  const username = normalizedRobloxUsername(raw);
  if (!username) notFound();
  const { events, unavailable } = await publicEvents();
  if (unavailable)
    return (
      <PublicShell>
        <main className="mx-auto max-w-3xl p-6">
          <p>Database publik belum tersedia. Coba kembali nanti.</p>
          <Link href="/pemain" className="text-blue-600">
            Daftar Pemain
          </Link>
        </main>
      </PublicShell>
    );
  let identityUnavailable = false;
  const profiles = await publicAvatarProfiles(events, () => {
    identityUnavailable = true;
  });
  if (identityUnavailable)
    return (
      <PublicShell>
        <main className="mx-auto max-w-3xl p-6">
          <p>Data profil sementara tidak tersedia. Coba kembali nanti.</p>
          <Link href="/pemain" className="text-blue-600">
            Daftar Pemain
          </Link>
        </main>
      </PublicShell>
    );
  const directory = buildPlayerDirectory(events, profiles);
  const legacy = resolveLegacyHistory(events, profiles, username);
  // Current username lookup is useful for new bookmarks, but never overrides an old recorded-name collision.
  const candidates = directory.filter(
    (p) =>
      legacy.ids.includes(p.profile.robloxId) ||
      p.profile.username.toLowerCase() === username,
  );
  if (
    legacy.redirectId &&
    candidates.length === 1 &&
    candidates[0].profile.robloxId === legacy.redirectId
  )
    redirect(playerHref(legacy.redirectId));
  if (!legacy.matches.length && candidates.length === 1)
    redirect(playerHref(candidates[0].profile.robloxId));
  if (!legacy.matches.length && !candidates.length) notFound();
  return (
    <PublicShell>
      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <Breadcrumb label="Riwayat Username" />
        <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#132b68] to-[#2c6be3] p-7 text-white">
          <p className="text-xs font-bold text-blue-200">RIWAYAT LAMA</p>
          <h1 className="mt-2 break-all text-3xl font-black">@{username}</h1>
          <p className="mt-3 text-sm text-blue-100">
            Nama yang tercatat pada arsip turnamen. Jangan menganggap nama yang
            sama selalu berarti akun yang sama.
          </p>
        </section>
        {candidates.length > 0 && (
          <section className="mb-5 rounded-2xl border border-blue-100 bg-white p-5">
            <h2 className="font-black text-[#142A55]">Profil terkait</h2>
            <p className="mt-2 text-xs text-slate-500">
              Pilih profil dengan User ID yang sesuai. Riwayat tidak digabung
              otomatis.
            </p>
            {candidates.map((p) => (
              <Link
                key={p.profile.robloxId}
                href={playerHref(p.profile.robloxId)}
                className="mt-3 block rounded-xl border border-blue-100 p-3 text-sm font-bold text-blue-700 hover:bg-blue-50"
              >
                {p.profile.displayName} (@{p.profile.username}) · ID{" "}
                {p.profile.robloxId}
              </Link>
            ))}
          </section>
        )}
        {legacy.unlinked.length > 0 && (
          <section className="rounded-2xl border border-blue-100 bg-white p-5">
            <h2 className="font-black text-[#142A55]">Arsip belum terhubung</h2>
            <p className="mt-2 text-xs text-slate-500">
              Catatan berdasarkan username yang dimasukkan panitia, bukan
              identitas Roblox terkonfirmasi.
            </p>
            <div className="mt-3 divide-y divide-blue-100">
              {legacy.unlinked.map(({ event, row }) => (
                <article
                  key={`${event.id}:${row.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <h3 className="text-sm font-bold">{event.title}</h3>
                    <p className="text-xs text-slate-500">
                      {dateLabel(event.eventDate)} · {row.name} · #{row.rank}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <b>{fmt(row.points)} PTS</b>
                    <Link
                      className="font-bold text-blue-600"
                      href={`/turnamen/${encodeURIComponent(event.id)}/hasil`}
                    >
                      Lihat Hasil
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <Link
          href="/pemain"
          className="mt-5 inline-block text-sm font-bold text-blue-600 hover:underline"
        >
          Kembali ke Direktori Pemain
        </Link>
      </main>
    </PublicShell>
  );
}

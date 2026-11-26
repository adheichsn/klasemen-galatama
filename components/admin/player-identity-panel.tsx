"use client";
import { useActionDialog } from "@/components/ui/action-dialog";
import { useEffect, useState } from "react";
import { RefreshCw, Search, UserRound, Link2, Unlink } from "lucide-react";
import type { IdentityIndex, RobloxProfile } from "@/lib/player-identity";
import { safeAvatarUrl } from "@/lib/player-identity";

const field =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-400 focus:outline-none";
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
async function request(body?: object) {
  const response = await fetch(
    "/api/admin/player-identity",
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          cache: "no-store",
        }
      : { cache: "no-store" },
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
  return data;
}
function ProfileCard({ profile }: { profile: RobloxProfile }) {
  const [broken, setBroken] = useState(false);
  const url = safeAvatarUrl(profile.avatarUrl);
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {url && !broken ? (
        <img
          src={url}
          onError={() => setBroken(true)}
          alt=""
          referrerPolicy="no-referrer"
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-xl bg-white object-cover"
        />
      ) : (
        <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-600">
          <UserRound size={24} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="break-words font-bold text-slate-900">
          {profile.displayName}
        </p>
        <p className="break-all text-xs text-slate-500">
          @{profile.username} · ID {profile.robloxId}
        </p>
        <a
          className="text-xs font-bold text-blue-700 hover:underline"
          href={`https://www.roblox.com/users/${profile.robloxId}/profile`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Buka profil Roblox
        </a>
      </div>
    </div>
  );
}
export function PlayerIdentityPanel({ dirty }: { dirty: boolean }) {
  const ask = useActionDialog();
  const [index, setIndex] = useState<IdentityIndex | null>(null);
  const [eventId, setEventId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [query, setQuery] = useState("");
  const [candidate, setCandidate] = useState<RobloxProfile | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    const data: IdentityIndex = await request();
    setIndex(data);
  };
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Permintaan gagal.");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    let alive = true;
    setBusy(true);
    request()
      .then((data: IdentityIndex) => {
        if (alive) setIndex(data);
      })
      .catch((e) => {
        if (alive)
          setError(e instanceof Error ? e.message : "Gagal memuat profil.");
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, []);
  const event = index?.events.find((e) => e.id === eventId);
  const selected = event?.participants.find((p) => p.id === participantId);
  const current =
    selected && !selected.stale
      ? index?.players.find((p) => p.robloxId === selected.robloxId)
      : undefined;
  const pickTarget = (id: string) => {
    setParticipantId(id);
    setCandidate(null);
    setMessage("");
    setError("");
    setQuery(event?.participants.find((p) => p.id === id)?.username || "");
  };
  const mutate = async (action: "link" | "unlink") => {
    if (
      !index ||
      !selected ||
      !event ||
      dirty ||
      (action === "link" && !candidate)
    )
      return;
    const label =
      action === "link"
        ? `Hubungkan ${selected.name} (${selected.username || "tanpa username"}) ke @${candidate!.username} (ID ${candidate!.robloxId})?`
        : `Lepaskan profil Roblox dari ${selected.name}?`;
    if (
      !(await ask({
        title: label,
        description: "Riwayat skor dan hasil final tetap tersimpan.",
        accept: action === "link" ? "Hubungkan profil" : "Lepaskan profil",
      }))
    )
      return;
    void run(async () => {
      await request({
        action,
        eventId: event.id,
        participantId: selected.id,
        revision: index.revision,
        expectedId: selected.robloxId,
        ...(action === "link" && candidate
          ? { robloxId: candidate.robloxId, username: candidate.username }
          : {}),
      });
      setCandidate(null);
      setMessage("Identitas tersimpan di server. Skor tetap utuh.");
      await load();
    });
  };
  const registry = (index?.players ?? []).filter((p) =>
    `${p.username} ${p.displayName} ${p.robloxId}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <section className="mx-auto grid max-w-6xl gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-widest text-blue-600">
            PLAYER IDENTITY
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">
            Profil Pemain Roblox
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Hubungkan peserta yang sudah disimpan dengan akun Roblox. Riwayat
            dan skor event tidak diedit.
          </p>
        </div>
        <button
          className={secondary}
          disabled={busy}
          onClick={() => void run(load)}
        >
          <RefreshCw size={16} /> Muat ulang
        </button>
      </header>
      {dirty && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Simpan perubahan turnamen ke server terlebih dahulu, lalu muat ulang
          daftar ini.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </p>
      )}
      {!index && busy && (
        <p role="status" className="text-sm text-slate-500">
          Memuat database pemain...
        </p>
      )}
      {index && (
        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
          <div className="grid min-w-0 gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div>
              <h3 className="font-black text-slate-900">1. Pilih peserta</h3>
              <p className="text-xs text-slate-500">
                Event selesai juga dapat dihubungkan tanpa membuka kunci hasil.
              </p>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Turnamen
              <select
                className={field}
                value={eventId}
                disabled={busy}
                onChange={(e) => {
                  setEventId(e.target.value);
                  setParticipantId("");
                  setCandidate(null);
                  setQuery("");
                }}
              >
                <option value="">Pilih event</option>
                {index.events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} · {e.eventDate || "Tanpa tanggal"} ·{" "}
                    {e.status.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Peserta
              <select
                className={field}
                value={participantId}
                disabled={busy || !event}
                onChange={(e) => pickTarget(e.target.value)}
              >
                <option value="">Pilih peserta</option>
                {event?.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.username ? `(@${p.username})` : ""}{" "}
                    {p.stale
                      ? "— Periksa ulang"
                      : p.robloxId
                        ? "— Terhubung"
                        : ""}
                  </option>
                ))}
              </select>
            </label>
            {event && (
              <p className="text-xs text-slate-500">
                {
                  event.participants.filter((p) => p.robloxId && !p.stale)
                    .length
                }{" "}
                / {event.participants.length} peserta terhubung
              </p>
            )}
            {selected?.stale && (
              <p className="text-xs text-amber-700">
                Roster berubah sejak penghubungan terakhir. Konfirmasi ulang
                identitas.
              </p>
            )}
            {current && (
              <ProfileCard
                key={current.robloxId + current.refreshedAt}
                profile={current}
              />
            )}
            {selected?.robloxId && (
              <button
                className={secondary}
                disabled={busy || dirty}
                onClick={() => mutate("unlink")}
              >
                <Unlink size={16} /> Lepaskan hubungan
              </button>
            )}
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-black text-slate-900">2. Cari akun Roblox</h3>
              <p className="mb-3 text-xs text-slate-500">
                Username, User ID atau URL profil. Tidak ada pencarian otomatis
                saat mengetik.
              </p>
              <form
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setCandidate(null);
                  void run(async () => {
                    const result = await request({ action: "lookup", query });
                    setCandidate(result.profile);
                  });
                }}
              >
                <input
                  className={`${field} flex-1 basis-44`}
                  aria-label="Username, ID atau URL Roblox"
                  placeholder="Username atau URL profil"
                  maxLength={300}
                  value={query}
                  disabled={busy}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setCandidate(null);
                  }}
                />
                <button className={button} disabled={busy || !query.trim()}>
                  <Search size={16} /> Cari
                </button>
              </form>
            </div>
            {candidate && (
              <>
                <ProfileCard
                  key={candidate.robloxId + candidate.refreshedAt}
                  profile={candidate}
                />
                {selected?.username &&
                  selected.username.trim().toLowerCase() !==
                    candidate.username.toLowerCase() && (
                    <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                      Username roster berbeda dengan akun ini. Pastikan
                      identitasnya benar, misalnya jika pemain pernah mengganti
                      username.
                    </p>
                  )}
                <button
                  className={button}
                  disabled={busy || dirty || !selected}
                  onClick={() => mutate("link")}
                >
                  <Link2 size={16} /> Konfirmasi & simpan profil
                </button>
              </>
            )}
          </div>
          <div className="grid min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h3 className="font-black text-slate-900">
              Database pemain ({index.players.length})
            </h3>
            <p className="text-xs text-slate-500">
              Pilih akun yang pernah disimpan untuk digunakan pada peserta event
              lain.
            </p>
            <input
              className={field}
              aria-label="Cari database pemain"
              placeholder="Cari nama, username, ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid max-h-[560px] gap-2 overflow-y-auto">
              {registry.slice(0, 100).map((p) => (
                <div key={p.robloxId} className="grid gap-1">
                  <ProfileCard key={p.refreshedAt} profile={p} />
                  <button
                    className={secondary}
                    disabled={busy || !selected}
                    onClick={() => {
                      setCandidate(p);
                      setQuery(p.username);
                      setError("");
                      setMessage("");
                    }}
                  >
                    Pilih akun ini
                  </button>
                </div>
              ))}
              {!registry.length && (
                <p className="text-sm text-slate-500">
                  Belum ada profil yang cocok.
                </p>
              )}
              {registry.length > 100 && (
                <p className="text-xs text-slate-500">
                  100 hasil pertama. Gunakan pencarian untuk mempersempit hasil.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

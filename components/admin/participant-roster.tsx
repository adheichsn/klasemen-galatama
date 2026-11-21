"use client";
import { avatarTarget } from "@/lib/avatar-identity";
import { PlayerAvatar } from "@/components/player-avatar";
import { useMemo, useState } from "react";
import {
  Check,
  Download,
  FileUp,
  LockKeyhole,
  Search,
  ShieldCheck,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import type { ArenaStore } from "@/hooks/use-arena";
import { completeDuoRoster } from "@/lib/arena-rules";
import type { Participant } from "@/lib/arena-types";
import { Button } from "@/components/ui/button";
import {
  planCsvImport,
  playerKey,
  rosterEditable,
  rosterRegistry,
  squadLimit,
  validRobloxUsername,
} from "@/lib/roster-management";

const inputClass =
  "min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400";
const labelClass = "grid min-w-0 gap-1 text-xs font-bold text-slate-600";

const templateCsv = (mode: string) =>
  mode !== "solo"
    ? "name,username,squad,checkedIn\nPeserta Satu,RobloxPlayer1,Alpha,false\nPeserta Dua,RobloxPlayer2,Alpha,true\n"
    : "name,username,checkedIn\nPeserta Satu,RobloxPlayer1,false\nPeserta Dua,RobloxPlayer2,true\n";

function downloadTemplate(mode: string) {
  const blob = new Blob(["\uFEFF" + templateCsv(mode)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `weji-arena-${mode}-roster-template.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function ParticipantRoster({ store }: { store: ArenaStore }) {
  const event = store.active;
  const editable = rosterEditable(event);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedSquad, setSelectedSquad] = useState("");
  const [newSquad, setNewSquad] = useState("");
  const [search, setSearch] = useState("");
  const [registrySearch, setRegistrySearch] = useState("");
  const [squadFilter, setSquadFilter] = useState("all");
  const [csvContent, setCsvContent] = useState("");
  const [csvFilename, setCsvFilename] = useState("");
  const [notice, setNotice] = useState("");

  const registry = useMemo(() => rosterRegistry(store.data), [store.data]);
  const registered = new Set(
    event.participants.map((p) => playerKey(p.username)).filter(Boolean),
  );
  const knownPlayers = registry
    .filter(
      (p) =>
        validRobloxUsername(p.username) &&
        !registered.has(playerKey(p.username)) &&
        `${p.name} ${p.username}`
          .toLowerCase()
          .includes(registrySearch.toLowerCase()),
    )
    .slice(0, 8);
  const csvPreview = useMemo(
    () => (csvContent ? planCsvImport(event, csvContent) : null),
    [event, csvContent],
  );
  const participants = event.participants.filter(
    (p) =>
      (event.mode === "solo" ||
        squadFilter === "all" ||
        p.squadId === squadFilter) &&
      `${p.name} ${p.username}`.toLowerCase().includes(search.toLowerCase()),
  );
  const handleAdd = (name: string, user: string) => {
    if (!editable) return;
    if (event.mode === "duo" && !validRobloxUsername(user)) {
      setNotice(
        "DUO membutuhkan username Roblox yang valid untuk setiap anggota.",
      );
      return;
    }
    if (user.trim() && !validRobloxUsername(user)) {
      setNotice(
        "Username Roblox harus 3–20 karakter (huruf, angka, underscore).",
      );
      return;
    }
    if (
      event.participants.some(
        (p) => user.trim() && playerKey(p.username) === playerKey(user),
      )
    ) {
      setNotice("Username sudah terdaftar pada turnamen ini.");
      return;
    }
    if (
      !user.trim() &&
      event.participants.some(
        (p) =>
          !p.username.trim() &&
          p.name.trim().toLowerCase() === name.trim().toLowerCase(),
      )
    ) {
      setNotice("Nama peserta tanpa username sudah digunakan.");
      return;
    }
    if (
      event.mode !== "solo" &&
      !event.squads.some((s) => s.id === selectedSquad)
    ) {
      setNotice("Pilih tim atau pasangan dahulu.");
      return;
    }
    if (
      event.mode !== "solo" &&
      squadLimit(event) > 0 &&
      event.participants.filter((p) => p.squadId === selectedSquad).length >=
        squadLimit(event)
    ) {
      setNotice("Squad sudah mencapai batas anggota.");
      return;
    }
    store.addParticipant(
      name,
      user,
      event.mode !== "solo" ? selectedSquad : null,
    );
    setNotice(
      `Peserta ${name} ditambahkan. Klik Simpan ke Server untuk menerbitkan perubahan.`,
    );
    setDisplayName("");
    setUsername("");
  };
  const rosterLocked =
    event.status !== "draft" ||
    !!event.rosterLocked ||
    event.entries.length > 0;
  const getSquad = (p: Participant) =>
    event.squads.find((s) => s.id === p.squadId)?.name || "—";

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {event.mode === "solo"
              ? "Peserta SOLO"
              : event.mode === "duo"
                ? "Pasangan DUO & Anggota"
                : "Squad & Anggota"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Pemain dan tim hanya berlaku untuk event ini. Riwayat skor event
            lain tidak ikut berubah.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            {event.participants.length} peserta
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            {event.participants.filter((p) => p.checkedIn).length} check-in
          </span>
          {event.mode !== "solo" && (
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
              {event.squads.length}{" "}
              {event.mode === "duo" ? "pasangan" : "squad"}
            </span>
          )}
        </div>
      </div>
      <div
        className={`rounded-xl border p-4 ${rosterLocked ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50"}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {rosterLocked ? (
              <LockKeyhole size={17} className="text-amber-700" />
            ) : (
              <Unlock size={17} className="text-blue-700" />
            )}
            <div>
              {rosterLocked ? "Roster terkunci" : "Roster dapat diedit"}
              <p className="text-xs font-normal text-slate-600">
                {event.status !== "draft"
                  ? "Saat pertandingan LIVE atau FINISHED, peserta dan squad terkunci otomatis; check-in LIVE masih dapat diperbarui."
                  : "Kunci manual sebelum pertandingan untuk mencegah perubahan anggota tanpa sengaja."}
              </p>
            </div>
          </div>
          {event.status === "draft" && event.entries.length === 0 && (
            <Button
              variant="secondary"
              size="sm"
              disabled={!event.rosterLocked && !completeDuoRoster(event)}
              onClick={() => store.setRosterLocked(!event.rosterLocked)}
            >
              {event.rosterLocked ? (
                <Unlock size={15} />
              ) : (
                <LockKeyhole size={15} />
              )}{" "}
              {event.rosterLocked ? "Buka roster" : "Kunci roster"}
            </Button>
          )}
        </div>
      </div>
      {event.mode === "duo" && !completeDuoRoster(event) && (
        <p
          role="status"
          className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800"
        >
          Lengkapi tepat dua anggota dengan username Roblox unik pada setiap
          pasangan sebelum mengunci roster, memulai LIVE atau mencatat skor
          historis.
        </p>
      )}
      {event.mode !== "solo" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h4 className="font-extrabold text-slate-900">
              {event.mode === "duo"
                ? "Manajemen Pasangan DUO"
                : "Manajemen Squad"}
            </h4>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              {event.mode === "duo"
                ? "Tepat 2 anggota per pasangan"
                : "Batas anggota (0 = tanpa batas)"}
              <input
                className={`${inputClass} w-32`}
                type="number"
                min={0}
                max={100}
                value={squadLimit(event)}
                disabled={!editable || event.mode === "duo"}
                onChange={(ev) =>
                  store.setSquadSizeLimit(Number(ev.target.value))
                }
              />
            </label>
          </div>
          <div className="grid gap-3">
            {event.squads.map((s) => (
              <div
                key={s.id}
                className="grid gap-2 rounded-xl bg-slate-50 p-3 md:grid-cols-[40px_minmax(130px,1fr)_minmax(160px,1fr)_auto] md:items-center"
              >
                <input
                  aria-label={`Warna ${s.name}`}
                  title="Warna squad"
                  type="color"
                  className="h-9 w-10 rounded-md"
                  value={s.color}
                  disabled={!editable}
                  onChange={(ev) =>
                    store.changeSquad(s.id, { color: ev.target.value })
                  }
                />
                <input
                  aria-label="Nama squad"
                  className={inputClass}
                  maxLength={70}
                  value={s.name}
                  disabled={!editable}
                  onChange={(ev) =>
                    store.changeSquad(s.id, { name: ev.target.value })
                  }
                />
                <select
                  aria-label={`Kapten squad ${s.name}`}
                  className={inputClass}
                  disabled={!editable}
                  value={s.captainId || ""}
                  onChange={(ev) =>
                    store.changeSquad(s.id, {
                      captainId: ev.target.value || null,
                    })
                  }
                >
                  <option value="">Pilih kapten (opsional)</option>
                  {event.participants
                    .filter((p) => p.squadId === s.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (@{p.username || "—"})
                      </option>
                    ))}
                </select>
                <Button
                  aria-label={`Hapus squad ${s.name}`}
                  variant="ghost"
                  size="icon"
                  disabled={
                    !editable ||
                    event.participants.some((p) => p.squadId === s.id)
                  }
                  title="Hapus squad kosong"
                  onClick={() => store.removeSquad(s.id)}
                >
                  <Trash2 size={16} />
                </Button>
                <p className="text-xs text-slate-500 md:col-start-2 md:col-span-2">
                  {event.participants.filter((p) => p.squadId === s.id).length}
                  {squadLimit(event) ? `/${squadLimit(event)}` : ""} anggota
                </p>
              </div>
            ))}
            {!event.squads.length && (
              <p className="text-sm text-slate-500">
                Belum ada squad. Tambahkan di bawah atau import dari CSV.
              </p>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              aria-label={
                event.mode === "duo" ? "Nama pasangan baru" : "Nama squad baru"
              }
              className={`${inputClass} flex-1`}
              maxLength={70}
              placeholder={
                event.mode === "duo" ? "Nama pasangan baru" : "Nama squad baru"
              }
              disabled={!editable}
              value={newSquad}
              onChange={(ev) => setNewSquad(ev.target.value)}
            />
            <Button
              disabled={!editable || !newSquad.trim()}
              onClick={() => {
                store.addSquad(newSquad);
                setNewSquad("");
              }}
            >
              Tambah Squad
            </Button>
          </div>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h4 className="mb-3 font-extrabold text-slate-900">
          Daftarkan peserta baru
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            Nama tampil
            <input
              className={inputClass}
              maxLength={80}
              value={displayName}
              disabled={!editable}
              placeholder="Nama peserta"
              onChange={(ev) => setDisplayName(ev.target.value)}
            />
          </label>
          <label className={labelClass}>
            Username Roblox
            <input
              className={inputClass}
              maxLength={21}
              value={username}
              disabled={!editable}
              placeholder="Username Roblox (opsional manual)"
              onChange={(ev) => setUsername(ev.target.value)}
            />
          </label>
          {event.mode !== "solo" && (
            <label className={labelClass}>
              Squad
              <select
                className={inputClass}
                disabled={!editable}
                value={selectedSquad}
                onChange={(ev) => setSelectedSquad(ev.target.value)}
              >
                <option value="">
                  {event.mode === "duo" ? "Pilih pasangan" : "Pilih squad"}
                </option>
                {event.squads.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Username yang sama tidak bisa didaftarkan dua kali di event ini.
          </p>
          <Button
            disabled={
              !editable ||
              !displayName.trim() ||
              (username.trim() !== "" &&
                !/^[A-Za-z0-9_]{3,20}$/.test(
                  username.trim().replace(/^@/, ""),
                )) ||
              (event.mode !== "solo" && !selectedSquad)
            }
            onClick={() => handleAdd(displayName, username)}
          >
            <UserPlus size={16} /> Daftarkan
          </Button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-extrabold text-slate-900">
            Participant Registry
          </h4>
          <span className="text-xs text-slate-500">
            {registry.length} username dari turnamen sebelumnya
          </span>
        </div>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Pilih pemain yang pernah mengikuti Galatama. Setiap pendaftaran
          membuat identitas peserta baru untuk event ini, tanpa mengubah hasil
          lama.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Search size={16} className="text-slate-400" />
          <input
            className="w-full bg-transparent py-2.5 text-sm outline-none"
            placeholder="Cari username dari arsip..."
            aria-label="Cari peserta dari registry"
            value={registrySearch}
            onChange={(ev) => setRegistrySearch(ev.target.value)}
          />
        </div>
        <div className="mt-3 grid gap-2">
          {knownPlayers.map((p) => (
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"
              key={playerKey(p.username)}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {p.name}
                </p>
                <p className="text-xs text-slate-500">
                  @{p.username} · {p.appearances} event
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={
                  !editable || (event.mode !== "solo" && !selectedSquad)
                }
                onClick={() => handleAdd(p.name, p.username)}
              >
                Gunakan
              </Button>
            </div>
          ))}
          {!knownPlayers.length && (
            <p className="py-2 text-sm text-slate-500">
              Belum ada pemain lain yang cocok pada arsip.
            </p>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-extrabold text-slate-900">Import peserta CSV</h4>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadTemplate(event.mode)}
          >
            <Download size={15} /> Template CSV
          </Button>
        </div>
        <p className="my-2 text-xs text-slate-500">
          Maksimal 300 baris per impor, 200 KB. Username wajib pada CSV, unik
          per event. Pada mode tim, nama pada kolom squad (termasuk pasangan
          DUO) yang belum ada dibuat otomatis. Preview wajib lolos sebelum
          import.
        </p>
        <label className={`${labelClass} mt-3`}>
          Pilih file CSV
          <input
            className={inputClass}
            type="file"
            accept=".csv,text/csv"
            disabled={!editable}
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              setNotice("");
              setCsvFilename(file.name);
              if (file.size > 200000) {
                setCsvContent("");
                setNotice("Ukuran CSV melebihi 200 KB.");
                return;
              }
              setCsvContent(await file.text());
            }}
          />
        </label>
        {csvPreview && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
            <p className="font-bold text-slate-800">
              Preview {csvFilename}: {csvPreview.rows.length} pemain,{" "}
              {csvPreview.addedSquads} squad baru
            </p>
            <div className="mt-2 max-h-36 overflow-auto text-xs text-slate-600">
              {csvPreview.rows.slice(0, 8).map((row) => (
                <p key={row.line}>
                  {row.line}. {row.name} (@{row.username}){" "}
                  {event.mode !== "solo" ? `— ${row.squad}` : ""}
                </p>
              ))}
            </div>
            {!!csvPreview.errors.length && (
              <ul className="mt-2 list-disc pl-4 text-xs text-rose-700">
                {csvPreview.errors.slice(0, 8).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}
            {!csvPreview.errors.length && (
              <p className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <Check size={15} /> Validasi lolos. Siap diimpor.
              </p>
            )}
            <Button
              className="mt-3"
              disabled={
                !editable ||
                !csvPreview.prepared ||
                csvPreview.rows.length === 0
              }
              onClick={() => {
                if (store.importRosterCsv(csvContent)) {
                  setCsvContent("");
                  setCsvFilename("");
                  setNotice(
                    `${csvPreview.rows.length} peserta diimpor. Jangan lupa Simpan ke Server.`,
                  );
                }
              }}
            >
              <FileUp size={16} /> Import {csvPreview.rows.length} Peserta
            </Button>
          </div>
        )}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h4 className="font-extrabold text-slate-900">Roster Turnamen</h4>
          <span className="text-xs text-slate-500">
            {participants.length} ditampilkan
          </span>
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={16} className="text-slate-400" />
            <input
              aria-label="Cari peserta"
              placeholder="Cari nama atau username..."
              className="w-full bg-transparent py-2.5 text-sm outline-none"
              value={search}
              onChange={(ev) => setSearch(ev.target.value)}
            />
          </div>
          {event.mode !== "solo" && (
            <select
              aria-label="Filter squad"
              className={inputClass}
              value={squadFilter}
              onChange={(ev) => setSquadFilter(ev.target.value)}
            >
              <option value="all">Semua Squad</option>
              {event.squads.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="mt-3 grid gap-2">
          {participants.map((p) => (
            <div
              className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 lg:grid-cols-[minmax(130px,1fr)_minmax(140px,1fr)_auto_auto] lg:items-center"
              key={p.id}
            >
              <div className="flex min-w-0 items-center gap-2">
                <PlayerAvatar target={avatarTarget(event, p.id)} size="sm" />
                <input
                  aria-label={`Nama ${p.name}`}
                  className={inputClass}
                  maxLength={80}
                  value={p.name}
                  disabled={!editable}
                  onChange={(ev) =>
                    store.changeParticipant(p.id, { name: ev.target.value })
                  }
                />
              </div>
              <input
                aria-label={`Username ${p.name}`}
                className={inputClass}
                maxLength={20}
                value={p.username}
                disabled={!editable}
                placeholder="Username Roblox"
                onChange={(ev) =>
                  store.changeParticipant(p.id, { username: ev.target.value })
                }
              />
              {event.mode !== "solo" && (
                <select
                  aria-label={`Squad ${p.name}`}
                  className={inputClass}
                  value={p.squadId || ""}
                  disabled={!editable}
                  onChange={(ev) =>
                    store.changeParticipant(p.id, {
                      squadId: ev.target.value || null,
                    })
                  }
                >
                  <option value="">
                    {event.mode === "duo" ? "Tanpa pasangan" : "Tanpa squad"}
                  </option>
                  {event.squads.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={p.checkedIn}
                    disabled={event.status === "finished"}
                    onChange={(ev) =>
                      store.changeParticipant(p.id, {
                        checkedIn: ev.target.checked,
                      })
                    }
                  />{" "}
                  Check-in
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Hapus peserta yang belum memiliki skor"
                  aria-label={`Hapus ${p.name}`}
                  disabled={
                    !editable ||
                    event.entries.some((x) => x.participantId === p.id)
                  }
                  onClick={() => store.removeParticipant(p.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
              {event.mode !== "solo" && (
                <p className="text-xs text-slate-500 lg:col-span-4">
                  {getSquad(p)}{" "}
                  {event.squads.some((s) => s.captainId === p.id)
                    ? "• Kapten"
                    : ""}
                </p>
              )}
            </div>
          ))}
          {!participants.length && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              <Users size={18} /> Belum ada peserta yang cocok.
            </div>
          )}
        </div>
      </div>
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-800"
        >
          <ShieldCheck size={16} className="mr-2 inline" />
          {notice}
        </div>
      )}
    </section>
  );
}

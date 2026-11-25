import { sameJson } from "./json-equal";
import type { ArenaData, ArenaEvent, Participant } from "./arena-types";
import { completeDuoRoster } from "./arena-rules";
import { newId } from "./arena-data";

/** V2.7: Participant roster is per-event; registry is an index of historic events.
 * It contains no private account linkage and requires no SQL/schema migration.
 */
export const playerKey = (username: string) =>
  username.trim().replace(/^@/, "").toLowerCase();
export const squadKey = (name: string) =>
  name.trim().toLocaleLowerCase("id-ID");
export const validRobloxUsername = (value: string) =>
  /^[A-Za-z0-9_]{3,20}$/.test(value.trim().replace(/^@/, ""));
export const rosterEditable = (event: ArenaEvent) =>
  event.status === "draft" && !event.rosterLocked && event.entries.length === 0;
export const squadLimit = (event: ArenaEvent) =>
  event.mode === "duo" ? 2 : (event.squadSizeLimit ?? 0);

export function rosterRegistry(data: ArenaData) {
  const players = new Map<
    string,
    { name: string; username: string; appearances: number }
  >();
  for (const event of data.events
    .filter((item) => !item.trashedAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const seenInEvent = new Set<string>();
    for (const p of event.participants) {
      const key = playerKey(p.username);
      if (!key) continue;
      const prev = players.get(key);
      players.set(key, {
        name: p.name,
        username: p.username,
        appearances: (prev?.appearances || 0) + (seenInEvent.has(key) ? 0 : 1),
      });
      seenInEvent.add(key);
    }
  }
  return [...players.values()].sort((a, b) =>
    a.username.localeCompare(b.username),
  );
}

export function addRosterMember(
  event: ArenaEvent,
  name: string,
  username: string,
  squadId: string | null,
): ArenaEvent | null {
  const cleanName = name.trim().slice(0, 80);
  const cleanUsername = username.trim().replace(/^@/, "");
  if (
    !rosterEditable(event) ||
    !cleanName ||
    cleanUsername.length > 20 ||
    (cleanUsername !== "" && !validRobloxUsername(cleanUsername)) ||
    event.participants.length >= 2000
  )
    return null;
  const key = playerKey(cleanUsername);
  if (key && event.participants.some((p) => playerKey(p.username) === key))
    return null;
  if (
    !key &&
    event.participants.some(
      (p) => !playerKey(p.username) && squadKey(p.name) === squadKey(cleanName),
    )
  )
    return null;
  if (event.mode !== "solo") {
    if (!squadId || !event.squads.some((s) => s.id === squadId)) return null;
    if (
      squadLimit(event) > 0 &&
      event.participants.filter((p) => p.squadId === squadId).length >=
      squadLimit(event)
    )
      return null;
  }
  const player: Participant = {
    id: newId(),
    name: cleanName,
    username: cleanUsername,
    checkedIn: false,
    squadId: event.mode !== "solo" ? squadId : null,
  };
  return { ...event, participants: [...event.participants, player] };
}

export function addRosterSquad(
  event: ArenaEvent,
  name: string,
): ArenaEvent | null {
  const clean = name.trim().slice(0, 70);
  if (
    !rosterEditable(event) ||
    event.mode === "solo" ||
    !clean ||
    event.squads.length >= 200 ||
    event.squads.some((s) => squadKey(s.name) === squadKey(clean))
  )
    return null;
  return {
    ...event,
    squads: [...event.squads, { id: newId(), name: clean, color: "#3478F6" }],
  };
}

export type CsvPlayer = {
  name: string;
  username: string;
  squad: string;
  checkedIn: boolean;
  line: number;
};
export type CsvPlan = {
  rows: CsvPlayer[];
  errors: string[];
  addedSquads: number;
  prepared: ArenaEvent | null;
};

/** RFC4180-style quotes, escaped quotes and CRLF. No dependency or eval. */
function csvCells(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (!quoted && value === "") quoted = true;
      else if (quoted) quoted = false;
      else throw new Error(`Format CSV tidak valid dekat karakter ${i + 1}.`);
    } else if (c === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(value.trim());
      if (row.some(Boolean)) result.push(row);
      row = [];
      value = "";
    } else value += c;
  }
  if (quoted) throw new Error("CSV memiliki tanda kutip yang belum ditutup.");
  row.push(value.trim());
  if (row.some(Boolean)) result.push(row);
  return result;
}

export function planCsvImport(event: ArenaEvent, input: string): CsvPlan {
  const errors: string[] = [];
  const empty: CsvPlan = { rows: [], errors, addedSquads: 0, prepared: null };
  if (!rosterEditable(event))
    return {
      ...empty,
      errors: [
        "Roster terkunci. Hanya Draft yang belum dikunci dan tanpa skor dapat diimpor.",
      ],
    };
  if (input.length > 200_000)
    return { ...empty, errors: ["File CSV maksimal 200 KB."] };
  let cells: string[][];
  try {
    cells = csvCells(input.replace(/^\uFEFF/, ""));
  } catch (err) {
    return { ...empty, errors: [(err as Error).message] };
  }
  if (!cells.length) return { ...empty, errors: ["CSV kosong."] };
  const header = cells[0].map((v) => v.toLowerCase().replace(/[\s_-]/g, ""));
  const idx = (name: string) => header.indexOf(name);
  const nameCol = idx("name"),
    userCol = idx("username"),
    squadCol = idx("squad"),
    checkCol = idx("checkedin");
  if (nameCol < 0 || userCol < 0 || (event.mode !== "solo" && squadCol < 0))
    return {
      ...empty,
      errors: [
        event.mode !== "solo"
          ? "Header wajib: name,username,squad,checkedIn"
          : "Header wajib: name,username (checkedIn opsional)",
      ],
    };
  if (cells.length <= 1)
    return { ...empty, errors: ["Belum ada baris peserta setelah header."] };
  if (cells.length - 1 > 300)
    return {
      ...empty,
      errors: [
        "Maksimal 300 peserta per impor. Pisahkan menjadi beberapa file.",
      ],
    };
  const seen = new Set(
    event.participants.map((p) => playerKey(p.username)).filter(Boolean),
  );
  const rows: CsvPlayer[] = [];
  for (const [index, row] of cells.slice(1).entries()) {
    const line = index + 2;
    const name = (row[nameCol] || "").trim();
    const username = (row[userCol] || "").trim().replace(/^@/, "");
    const squad = squadCol < 0 ? "" : (row[squadCol] || "").trim();
    const rawChecked =
      checkCol < 0 ? "" : (row[checkCol] || "").trim().toLowerCase();
    if (name.length < 1 || name.length > 80)
      errors.push(`Baris ${line}: nama wajib, maksimal 80 karakter.`);
    if (!validRobloxUsername(username))
      errors.push(
        `Baris ${line}: username Roblox harus 3–20 karakter (huruf, angka, underscore).`,
      );
    if (validRobloxUsername(username) && seen.has(playerKey(username)))
      errors.push(`Baris ${line}: username @${username} sudah terdaftar.`);
    seen.add(playerKey(username));
    if (event.mode !== "solo" && (!squad || squad.length > 70))
      errors.push(`Baris ${line}: squad wajib, maksimal 70 karakter.`);
    if (
      rawChecked &&
      !["1", "0", "true", "false", "yes", "no", "ya", "tidak"].includes(
        rawChecked,
      )
    )
      errors.push(`Baris ${line}: checkedIn harus true/false atau 1/0.`);
    rows.push({
      line,
      name,
      username,
      squad,
      checkedIn: ["1", "true", "yes", "ya"].includes(rawChecked),
    });
  }
  if (event.participants.length + rows.length > 2000)
    errors.push("Total peserta turnamen maksimal 2.000.");
  let prepared = {
    ...event,
    squads: [...event.squads],
    participants: [...event.participants],
  };
  let addedSquads = 0;
  for (const row of rows) {
    if (
      event.mode !== "solo" &&
      row.squad &&
      !prepared.squads.some((s) => squadKey(s.name) === squadKey(row.squad))
    ) {
      if (prepared.squads.length >= 200) {
        errors.push("Maksimal 200 squad per turnamen.");
        break;
      }
      prepared.squads.push({ id: newId(), name: row.squad, color: "#3478F6" });
      addedSquads++;
    }
    const target =
      event.mode !== "solo"
        ? prepared.squads.find((s) => squadKey(s.name) === squadKey(row.squad))
        : undefined;
    if (event.mode !== "solo" && !target) continue;
    prepared.participants.push({
      id: newId(),
      name: row.name,
      username: row.username,
      checkedIn: row.checkedIn,
      squadId: target?.id ?? null,
    });
  }
  if (squadLimit(event) > 0) {
    for (const squad of prepared.squads) {
      if (
        prepared.participants.filter((p) => p.squadId === squad.id).length >
        squadLimit(event)
      )
        errors.push(
          `Squad ${squad.name} melewati batas ${squadLimit(event)} anggota.`,
        );
    }
  }
  return {
    rows,
    errors: errors.slice(0, 30),
    addedSquads,
    prepared: errors.length ? null : prepared,
  };
}

/** Server boundary: all roster changes are validated under the row lock. */
export function validateRosterChange(
  before: ArenaEvent | undefined,
  next: ArenaEvent,
): string | null {
  if (next.rosterLocked !== undefined && typeof next.rosterLocked !== "boolean")
    return "Pengaturan kunci roster tidak valid.";
  if (
    next.squadSizeLimit !== undefined &&
    (!Number.isSafeInteger(next.squadSizeLimit) ||
      next.squadSizeLimit < 0 ||
      next.squadSizeLimit > 100)
  )
    return "Batas anggota squad harus 0–100 (0 tanpa batas).";
  if (
    next.mode === "duo" &&
    ((next.squadSizeLimit ?? 2) !== 2 ||
      ((next.status !== "draft" ||
        next.entries.length > 0 ||
        next.rosterLocked) &&
        !completeDuoRoster(next)))
  )
    return "DUO wajib tepat 2 anggota dengan username Roblox unik per pasangan sebelum roster dikunci, skor dicatat, atau pertandingan dimulai.";
  const details = (event: ArenaEvent) => ({
    squads: event.squads,
    participants: event.participants.map((p) => ({
      id: p.id,
      name: p.name,
      username: p.username,
      squadId: p.squadId,
    })),
    squadSizeLimit: event.squadSizeLimit ?? 0,
  });
  if (
    before &&
    (before.status !== "draft" ||
      before.rosterLocked ||
      before.entries.length > 0) &&
    !sameJson(details(before), details(next))
  ) {
    // Explicit unlock of a draft roster is allowed; never unlock once LIVE.
    if (
      !(
        before.status === "draft" &&
        before.rosterLocked &&
        !next.rosterLocked &&
        before.entries.length === 0
      )
    )
      return `Roster ${next.title} terkunci. Anggota, squad, username dan kapten tidak boleh diubah.`;
  }
  if (
    before &&
    before.status !== "draft" &&
    next.rosterLocked !== before.rosterLocked
  )
    return `Pengaturan roster event LIVE/FINISHED tidak dapat diubah.`;
  if (next.squads.length > 200 || next.participants.length > 2000)
    return "Batas jumlah squad/peserta terlampaui.";
  if (
    new Set(next.squads.map((s) => s.id)).size !== next.squads.length ||
    new Set(next.participants.map((p) => p.id)).size !==
    next.participants.length
  )
    return "ID roster harus unik.";
  if (next.mode !== "solo") {
    for (const p of next.participants)
      if (p.squadId && !next.squads.some((s) => s.id === p.squadId))
        return `Squad peserta ${p.name} tidak ditemukan.`;
  }
  for (const squad of next.squads) {
    if (
      squad.captainId !== undefined &&
      squad.captainId !== null &&
      !next.participants.some(
        (p) => p.id === squad.captainId && p.squadId === squad.id,
      )
    )
      return `Kapten ${squad.name} harus anggota squad itu.`;
    if (
      next.mode !== "solo" &&
      squadLimit(next) > 0 &&
      next.participants.filter((p) => p.squadId === squad.id).length >
      squadLimit(next)
    )
      return `Squad ${squad.name} melampaui batas anggota.`;
  }
  const oldParticipantMap = new Map(
    before?.participants.map((p) => [p.id, p]) || [],
  );
  const currentCounts = new Map<string, number>(),
    oldCounts = new Map<string, number>();
  for (const p of before?.participants || []) {
    const k = playerKey(p.username);
    if (k) oldCounts.set(k, (oldCounts.get(k) || 0) + 1);
  }
  for (const p of next.participants) {
    if (!p.name.trim() && oldParticipantMap.get(p.id)?.name !== p.name)
      return "Nama peserta tidak boleh kosong.";
    const k = playerKey(p.username);
    if (k) {
      if (
        !validRobloxUsername(p.username) &&
        oldParticipantMap.get(p.id)?.username !== p.username
      )
        return `Username Roblox ${p.username} tidak valid.`;
      currentCounts.set(k, (currentCounts.get(k) || 0) + 1);
    }
  }
  for (const [key, count] of currentCounts)
    if (count > Math.max(1, oldCounts.get(key) || 0))
      return `Username @${key} terdaftar lebih dari sekali pada turnamen.`;
  const oldAnonymous = new Map<string, number>(),
    newAnonymous = new Map<string, number>();
  for (const p of before?.participants || [])
    if (!playerKey(p.username)) {
      const k = squadKey(p.name);
      oldAnonymous.set(k, (oldAnonymous.get(k) || 0) + 1);
    }
  for (const p of next.participants)
    if (!playerKey(p.username)) {
      const k = squadKey(p.name);
      newAnonymous.set(k, (newAnonymous.get(k) || 0) + 1);
    }
  for (const [key, count] of newAnonymous)
    if (count > Math.max(1, oldAnonymous.get(key) || 0))
      return `Peserta tanpa username dengan nama ${key} sudah ada.`;
  const oldNames = new Map<string, number>(),
    currentNames = new Map<string, number>();
  for (const s of before?.squads || []) {
    const k = squadKey(s.name);
    oldNames.set(k, (oldNames.get(k) || 0) + 1);
  }
  for (const s of next.squads) {
    if (!s.name.trim()) return "Nama squad tidak boleh kosong.";
    const k = squadKey(s.name);
    currentNames.set(k, (currentNames.get(k) || 0) + 1);
  }
  for (const [key, count] of currentNames)
    if (count > Math.max(1, oldNames.get(key) || 0))
      return `Nama squad ${key} tidak boleh duplikat.`;
  if (!before) return null;
  return null;
}

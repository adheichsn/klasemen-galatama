import type { ArenaEvent } from "./arena-types";
import { standings } from "./arena-utils";

/**
 * V2.10 derives read-only results from finalized event snapshots. No mutable
 * global player/squad totals, new tables, or re-scoring against current rules.
 */
export function finalEvents(events: ArenaEvent[]): ArenaEvent[] {
  return events
    .filter((event) => event.status === "finished" && !event.trashedAt)
    .sort(
      (a, b) =>
        (b.finishedAt || b.eventDate || "").localeCompare(
          a.finishedAt || a.eventDate || "",
        ) || a.id.localeCompare(b.id),
    );
}

export function normalizedRobloxUsername(input: string): string | null {
  const username = input.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(username) ? username : null;
}

export type ResultRow = ReturnType<typeof standings>[number] & {
  rank: number;
  username: string;
  members: { id: string; name: string; username: string; points: number }[];
};

export function resultRows(event: ArenaEvent): ResultRow[] {
  const people = new Map(event.participants.map((p) => [p.id, p]));
  const contributions = new Map<
    string,
    Map<string, ResultRow["members"][number]>
  >();
  if (event.mode === "squad") {
    for (const squad of event.squads) contributions.set(squad.id, new Map());
    // Include current zero-score members, but attribute every ledger delta to
    // the *historical squad snapshot* first, even after a legacy roster move.
    for (const participant of event.participants) {
      const bucket = participant.squadId
        ? contributions.get(participant.squadId)
        : undefined;
      bucket?.set(participant.id, {
        id: participant.id,
        name: participant.name,
        username: participant.username,
        points: 0,
      });
    }
    for (const entry of event.entries) {
      const person = people.get(entry.participantId);
      const snapSquad = entry.squadId || person?.squadId;
      const bucket = snapSquad ? contributions.get(snapSquad) : undefined;
      if (!bucket) continue;
      const current = bucket.get(entry.participantId) || {
        id: entry.participantId,
        name: person?.name || "Peserta lama",
        username: person?.username || "",
        points: 0,
      };
      current.points += entry.delta;
      bucket.set(entry.participantId, current);
    }
  }
  return standings(event).map((row, index) => ({
    ...row,
    rank: index + 1,
    username: event.mode === "solo" ? people.get(row.id)?.username || "" : "",
    members:
      event.mode === "squad"
        ? [...(contributions.get(row.id)?.values() || [])].sort(
            (a, b) => b.points - a.points || a.name.localeCompare(b.name),
          )
        : [],
  }));
}

export type Champion = {
  username: string;
  name: string;
  wins: number;
  podiums: number;
  appearances: number;
  bestRank: number;
};

/** SOLO identities match on entered Roblox usernames, not display names. */
export function allTimeSoloChampions(events: ArenaEvent[]): Champion[] {
  const records = new Map<string, Champion>();
  for (const event of finalEvents(events)) {
    if (event.mode !== "solo") continue;
    const seenInEvent = new Set<string>();
    for (const row of resultRows(event)) {
      const username = normalizedRobloxUsername(row.username);
      if (!username || seenInEvent.has(username)) continue;
      seenInEvent.add(username);
      const previous = records.get(username) || {
        username,
        name: row.name,
        wins: 0,
        podiums: 0,
        appearances: 0,
        bestRank: Number.MAX_SAFE_INTEGER,
      };
      previous.name = row.name || previous.name;
      previous.wins += row.rank === 1 ? 1 : 0;
      previous.podiums += row.rank <= 3 ? 1 : 0;
      previous.appearances++;
      previous.bestRank = Math.min(previous.bestRank, row.rank);
      records.set(username, previous);
    }
  }
  return [...records.values()]
    .filter((r) => r.wins > 0)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.podiums - a.podiums ||
        b.appearances - a.appearances ||
        a.username.localeCompare(b.username),
    );
}

export function playerHistory(events: ArenaEvent[], rawUsername: string) {
  const username = normalizedRobloxUsername(rawUsername);
  if (!username) return [];
  return finalEvents(events)
    .filter((event) => event.mode === "solo")
    .flatMap((event) => {
      const row = resultRows(event).find(
        (r) => normalizedRobloxUsername(r.username) === username,
      );
      return row ? [{ event, row }] : [];
    });
}

// Excel/Sheets-safe CSV: quotes/newlines are escaped and user-supplied cells
// beginning with formula metacharacters are stored as literal strings.
function csvCell(value: string | number): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "0";
  }
  const text = /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}
function csv(rows: (string | number)[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export type ExportKind = "standings" | "ledger";
export function exportResultsCsv(event: ArenaEvent, kind: ExportKind) {
  if (kind === "standings") {
    return csv([
      [
        "Event",
        "Mode",
        "Peringkat",
        "Nama",
        "Username Roblox",
        "Anggota Squad",
        "Poin",
        "Secret",
        "Tangkapan Bonus Tiebreak",
      ],
      ...resultRows(event).map((r) => [
        event.title,
        event.mode.toUpperCase(),
        r.rank,
        r.name,
        r.username,
        event.mode === "squad" ? r.members.map((m) => m.name).join("; ") : "",
        r.points,
        r.catches,
        r.bonusCatches,
      ]),
    ]);
  }
  const reversed = new Set(
    event.entries.flatMap((e) =>
      e.kind === "reversal" && e.reversesEntryId ? [e.reversesEntryId] : [],
    ),
  );
  const people = new Map(event.participants.map((p) => [p.id, p]));
  const squads = new Map(event.squads.map((s) => [s.id, s.name]));
  const rows: (string | number)[][] = [
    [
      "Event",
      "Mode",
      "Waktu ISO",
      "ID Transaksi",
      "Peserta",
      "Username Roblox",
      "Squad Snapshot",
      "Jenis Transaksi",
      "Ikan Snapshot",
      "Jumlah",
      "Poin Dasar/Ikan",
      "Bonus Snapshot",
      "Delta Poin",
      "Status",
      "ID Dibatalkan",
      "Referensi Bukti",
    ],
  ];
  for (const e of event.entries) {
    const person = people.get(e.participantId);
    const snapSquad = e.squadId || person?.squadId;
    rows.push([
      event.title,
      event.mode.toUpperCase(),
      e.createdAt,
      e.id,
      person?.name || "Peserta lama",
      person?.username || "",
      snapSquad ? squads.get(snapSquad) || "Squad lama" : "",
      e.kind,
      e.fishName || "",
      e.kind === "catch" ? e.quantity || 1 : "",
      e.basePoints ?? "",
      (e.bonuses || []).map((b) => `${b.name}: ${b.points}`).join("; "),
      e.delta,
      reversed.has(e.id)
        ? "Dibatalkan"
        : e.kind === "reversal"
          ? "Pembatalan"
          : "Valid",
      e.reversesEntryId || "",
      e.catchRef || "",
    ]);
  }
  return csv(rows);
}

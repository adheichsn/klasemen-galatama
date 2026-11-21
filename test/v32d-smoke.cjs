/** V3.2D: first-class DUO with hard capacity, real ledger and independent results. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = (() => {
  try {
    return require("typescript");
  } catch {
    return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
  }
})();
const root = path.resolve(__dirname, ".."),
  cache = new Map();
function load(rel) {
  const file = path.resolve(root, rel);
  if (cache.has(file)) return cache.get(file).exports;
  const m = new Module(file, module);
  cache.set(file, m);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = (name) =>
    name.startsWith("./")
      ? load(path.resolve(path.dirname(file), name + ".ts"))
      : require(name);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const { completeDuoRoster, canAssignSquad, calculateCatch } =
  load("lib/arena-rules.ts");
const {
  squadLimit,
  addRosterSquad,
  addRosterMember,
  planCsvImport,
  validateRosterChange,
} = load("lib/roster-management.ts");
const { tournamentReadiness } = load("lib/tournament-readiness.ts");
const { prepareSnapshot } = load("lib/score-integrity.ts");
const { startMatch, finishMatch, validateMatchTransition } = load(
  "lib/match-operations.ts",
);
const { validateHistoricalFinal, validateHistoricalDraft } = load(
  "lib/historical-entry.ts",
);
const { standings, squadContribution } = load("lib/arena-utils.ts");
const { resultRows, exportResultsCsv } = load("lib/tournament-results.ts");
const { tournamentAnalytics } = load("lib/tournament-analytics.ts");
const { avatarTarget, rankAvatarTargets, projectAvatarProfiles } = load(
  "lib/avatar-identity.ts",
);
const { identityRosterKey } = load("lib/player-identity.ts");
const { buildPlayerDirectory, playerTotals, findDirectoryPlayers } = load(
  "lib/player-directory.ts",
);
const { filterMarketplaceEvents } = load("lib/marketplace-filters.ts");
const { validArena } = load("lib/arena-storage.ts");
const wrap = (e) => ({ version: 2, activeEventId: e.id, events: [e] });
const now = Date.UTC(2026, 10, 21, 4);
let e = newEvent("DUO test", "duo");
e.fish = [{ id: "f", name: "Fish", points: 2, enabled: true }];
e.location = "Planetary";
e.eventDate = "2026-11-18";
assert.equal(squadLimit(e), 2);
assert.equal(completeDuoRoster(e), false);
assert.equal(validArena(wrap(e)), true);
e = addRosterSquad(e, "Alpha");
const a = e.squads[0].id;
e = addRosterMember(e, "First", "UserOne", a);
assert.equal(tournamentReadiness(e).canStart, false);
assert.equal(startMatch(e, now), e);
assert.match(validateRosterChange(e, { ...e, rosterLocked: true }), /DUO/);
const incomplete = structuredClone(e);
e = addRosterMember(e, "Second", "UserTwo", a);
assert.equal(addRosterMember(e, "Third", "UserThree", a), null);
assert.equal(addRosterMember(e, "Alias", "userone", a), null);
assert.equal(tournamentReadiness(e).canStart, true);
e = addRosterSquad(e, "Beta");
const b = e.squads[1].id;
assert.equal(
  tournamentReadiness(e).canStart,
  false,
  "empty pair must block start",
);
e = addRosterMember(e, "Third", "UserThree", b);
assert.equal(canAssignSquad(e, e.participants[2].id, a), false);
e = addRosterMember(e, "Fourth", "UserFour", b);
e = addRosterSquad(e, "Gamma");
const c = e.squads[2].id;
e = addRosterMember(e, "Fifth", "UserFive", c);
e = addRosterMember(e, "Sixth", "UserSix", c);
assert.equal(completeDuoRoster(e), true);
assert.match(validateRosterChange(e, { ...e, squadSizeLimit: 3 }), /DUO/);
assert.match(
  validateRosterChange(e, {
    ...e,
    participants: [
      ...e.participants,
      {
        id: "fake",
        name: "fake",
        username: "OtherUser",
        checkedIn: false,
        squadId: a,
      },
    ],
  }),
  /batas/,
);
const dup = structuredClone(e);
dup.participants[5].username = "userone";
assert.equal(completeDuoRoster(dup), false);
assert.match(validateRosterChange(e, dup), /lebih dari sekali/);
const anonymous = structuredClone(e);
anonymous.participants[0].username = "";
assert.equal(completeDuoRoster(anonymous), false);
assert.equal(
  planCsvImport(
    newEvent("CSV", "duo"),
    "name,username,squad\nOne,UserA,Alpha\nTwo,UserB,Alpha\nThree,UserC,Alpha",
  ).prepared,
  null,
);
assert.ok(
  planCsvImport(
    newEvent("CSV", "duo"),
    "name,username,squad\nOne,UserA,Alpha\nTwo,UserB,Alpha",
  ).prepared,
);
const forgedStart = { ...incomplete, status: "live" };
assert.match(
  validateMatchTransition(wrap(incomplete), wrap(forgedStart)),
  /status/i,
);
assert.equal(
  prepareSnapshot(wrap(incomplete), wrap(forgedStart), now).ok,
  false,
);
assert.equal(
  prepareSnapshot(wrap(e), wrap({ ...e, mode: "squad" }), now).ok,
  false,
);
const live = startMatch(e, now);
const started = prepareSnapshot(wrap(e), wrap(live), now);
assert.equal(started.ok, true);
const running = started.data.events[0];
const mkCatch = (i, idx, qty) => {
  const p = e.participants[idx];
  const v = calculateCatch(e, "f", [], qty);
  return {
    id: `c${i}`,
    participantId: p.id,
    squadId: p.squadId,
    kind: "catch",
    delta: v.delta,
    description: "Fish",
    fishId: "f",
    fishName: "Fish",
    basePoints: 2,
    quantity: qty,
    bonuses: [],
    createdAt: new Date(now).toISOString(),
  };
};
const entries = [
  mkCatch(1, 0, 3),
  mkCatch(2, 1, 4),
  mkCatch(3, 2, 5),
  mkCatch(4, 3, 1),
  mkCatch(5, 4, 2),
  mkCatch(6, 5, 2),
];
const bad = { ...entries[0], squadId: b };
assert.equal(
  prepareSnapshot(
    wrap(running),
    wrap({ ...running, entries: [bad] }),
    now + 1000,
  ).ok,
  false,
);
assert.equal(
  prepareSnapshot(
    wrap(running),
    wrap({ ...running, entries: [{ ...entries[0], squadId: undefined }] }),
    now + 1000,
  ).ok,
  false,
);
const scored = prepareSnapshot(
  wrap(running),
  wrap({ ...running, entries }),
  now + 1000,
);
assert.equal(scored.ok, true, JSON.stringify(scored));
const saved = scored.data.events[0];
assert.deepEqual(
  standings(saved).map((r) => r.points),
  [14, 12, 8],
);
assert.deepEqual(
  squadContribution(saved, a).map((r) => r.points),
  [8, 6],
);
const reversed = {
  ...entries[2],
  id: "rev",
  kind: "reversal",
  delta: -entries[2].delta,
  reversesEntryId: entries[2].id,
  description: "Reverse",
};
const afterReverse = prepareSnapshot(
  wrap(saved),
  wrap({ ...saved, entries: [...saved.entries, reversed] }),
  now + 2000,
);
assert.equal(afterReverse.ok, true);
assert.deepEqual(
  standings(afterReverse.data.events[0]).map((r) => r.points),
  [14, 8, 2],
);
assert.equal(tournamentAnalytics(afterReverse.data.events[0]).validCatches, 12);
const finished = finishMatch(saved, now + 2000);
assert.equal(prepareSnapshot(wrap(saved), wrap(finished), now + 2000).ok, true);
assert.match(
  validateMatchTransition(wrap(finished), wrap({ ...finished, mode: "squad" })),
  /terkunci/,
);
assert.equal(resultRows(finished)[0].members.length, 2);
assert.match(exportResultsCsv(finished, "standings"), /"DUO"/);
assert.equal(rankAvatarTargets(finished, a).length, 2);
const h = { ...e, historical: true, published: false };
assert.equal(startMatch(h, now), h);
assert.equal(
  validateHistoricalDraft(
    { ...incomplete, historical: true },
    { ...incomplete, historical: true, entries: [entries[0]] },
  ).ok,
  false,
);
const histInput = { ...h, entries };
const histSaved = prepareSnapshot(wrap(h), wrap(histInput), now);
assert.equal(histSaved.ok, true, JSON.stringify(histSaved));
assert.equal(validateHistoricalFinal(histSaved.data.events[0], now), null);
const twoPairs = {
  ...histSaved.data.events[0],
  squads: e.squads.slice(0, 2),
  participants: e.participants.slice(0, 4),
  entries: entries.slice(0, 4),
};
assert.match(validateHistoricalFinal(twoPairs, now), /tiga tim/);
const historicFinal = {
  ...histSaved.data.events[0],
  published: true,
  status: "finished",
  historicalPodium: [a, b, c],
  rosterLocked: true,
};
assert.deepEqual(
  standings(historicFinal).map((r) => r.id),
  [a, b, c],
);
const links = historicFinal.participants.map((p, i) => ({
  event_id: historicFinal.id,
  participant_id: p.id,
  roster_key: identityRosterKey(historicFinal, p),
  roblox_id: String(i + 100),
  username: p.username,
  display_name: p.name,
  avatar_url: null,
}));
const profiles = projectAvatarProfiles([historicFinal], links);
const directory = buildPlayerDirectory([historicFinal], profiles);
assert.equal(directory.length, 6);
const first = directory.find((p) => p.profile.robloxId === "100");
assert.equal(first.stats.duo.points, 6);
assert.equal(first.stats.duo.wins, 1);
assert.equal(first.stats.squad.events, 0);
assert.equal(first.stats.solo.events, 0);
assert.deepEqual(playerTotals(first), { finalEvents: 1, wins: 1, podiums: 1 });
assert.equal(findDirectoryPlayers(directory, "", "duo", "name").length, 6);
assert.equal(findDirectoryPlayers(directory, "", "squad", "name").length, 0);
const items = [
  historicFinal,
  { ...historicFinal, id: "solo", mode: "solo" },
  { ...historicFinal, id: "squad", mode: "squad" },
];
assert.deepEqual(
  filterMarketplaceEvents(items, {
    query: "",
    mode: "duo",
    status: "all",
    sort: "recommended",
  }).map((x) => x.id),
  [historicFinal.id],
);
assert.equal(
  buildPlayerDirectory([{ ...historicFinal, published: false }], profiles)
    .length,
  0,
);
const oldSolo = newEvent("old", "solo");
const oldSquad = newEvent("old", "squad");
const before = {
  version: 2,
  activeEventId: oldSolo.id,
  events: [oldSolo, oldSquad],
};
const previous = JSON.stringify(before);
const upgraded = prepareSnapshot(
  before,
  { ...before, events: [...before.events, e] },
  now,
);
assert.equal(upgraded.ok, true);
assert.equal(JSON.stringify(before), previous);
assert.deepEqual(upgraded.data.events.slice(0, 2), before.events);
const source = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
assert.match(source("components/arena-app.tsx"), /store\.create\("duo"\)/);
assert.match(
  source("components/arena-app.tsx"),
  /store\.createHistorical\("duo"\)/,
);
assert.match(source("components/arena-builder.tsx"), /Kompetisi pasangan/);
assert.match(source("hooks/use-arena.ts"), /completeDuoRoster/);
console.log(
  "PASS: V3.2D DUO independent mode, capacity, unique usernames, roster lock/start, CSV, snapshot validation, team scores/reversal, final lock, historical, avatars, directory stats, filters, legacy preservation",
);

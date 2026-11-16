// Dependency-light smoke tests for business logic. Run: npm run test:smoke
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
const root = path.resolve(__dirname, "..");
const cache = {};
function load(relative) {
  const absolute = path.join(root, relative);
  if (cache[absolute]) return cache[absolute].exports;
  const source = fs.readFileSync(absolute, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: absolute,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const m = new Module(absolute, module);
  cache[absolute] = m;
  m.filename = absolute;
  m.paths = Module._nodeModulePaths(path.dirname(absolute));
  m.require = (spec) =>
    spec.startsWith("./")
      ? load(path.join(path.dirname(relative), spec + ".ts"))
      : require(spec);
  m._compile(compiled, absolute);
  return m.exports;
}
const { newEvent, initialArena } = load("lib/arena-data.ts");
const { validArena, migrateLegacy } = load("lib/arena-storage.ts");
const { standings, secondsLeft, isReversed } = load("lib/arena-utils.ts");
const data = initialArena();
assert.equal(validArena(data), true);
assert.equal(data.events.length, 1);
const event = newEvent("Edisi Uji");
assert.equal(event.fish.length, 0);
assert.equal(event.bonuses.length, 0);
assert.equal(event.status, "draft");
event.participants = [
  {
    id: "p1",
    name: "Alice",
    username: "alice",
    checkedIn: true,
    squadId: null,
  },
  { id: "p2", name: "Bob", username: "bob", checkedIn: true, squadId: null },
];
event.entries = [
  {
    id: "score1",
    participantId: "p1",
    kind: "catch",
    delta: 6,
    description: "ikan + bonus",
    createdAt: "2026-11-16T00:00:00Z",
    fishName: "Ikan Uji",
    basePoints: 3,
    quantity: 1,
    bonuses: [{ id: "mut", name: "Mutasi", points: 3 }],
  },
  {
    id: "score2",
    participantId: "p2",
    kind: "catch",
    delta: 4,
    description: "ikan",
    createdAt: "2026-11-16T00:00:00Z",
    quantity: 2,
  },
];
assert.equal(standings(event)[0].name, "Alice");
assert.equal(standings(event)[0].points, 6);
event.bonuses = [{ id: "mut", name: "Mutasi", points: 7, enabled: true }];
assert.equal(
  standings(event)[0].points,
  6,
  "changing bonus must never recalculate old entries",
);
event.entries.unshift({
  id: "rev",
  participantId: "p1",
  kind: "reversal",
  delta: -6,
  description: "cancelled",
  createdAt: "2026-11-16T00:01:00Z",
  reversesEntryId: "score1",
});
assert.equal(isReversed(event.entries, "score1"), true);
assert.equal(standings(event)[0].name, "Bob");
event.mode = "squad";
event.squads = [
  { id: "s1", name: "Red", color: "#fff" },
  { id: "s2", name: "Blue", color: "#000" },
];
event.participants[0].squadId = "s1";
event.participants[1].squadId = "s2";
assert.equal(standings(event)[0].name, "Blue");
assert.equal(
  secondsLeft({ durationSec: 100, remainingSec: 60, runningSince: 1000 }, 2000),
  59,
);
const legacy = {
  version: 1,
  title: "Event Lawas",
  usn: "Host",
  map: "Pulau",
  teams: [
    {
      id: "team1",
      name: "Clan A",
      color: "#123456",
      players: [
        { id: "p-old", username: "old", displayName: "Old", checkedIn: true },
      ],
    },
  ],
  rules: [
    {
      id: "r1",
      name: "Ikan Lama",
      category: "Tarikan",
      points: 3,
      enabled: true,
    },
  ],
  entries: [
    {
      id: "en1",
      teamId: "team1",
      playerId: "p-old",
      kind: "manual",
      delta: 10,
      description: "Old entry",
      createdAt: "2026-11-01T00:00:00Z",
    },
  ],
  timer: { durationSec: 5400, remainingSec: 100, runningSince: null },
};
const migrated = migrateLegacy(legacy);
assert.ok(migrated);
assert.equal(validArena(migrated), true);
assert.equal(migrated.events[0].mode, "squad");
assert.equal(migrated.events[0].entries[0].delta, 10);
assert.equal(standings(migrated.events[0])[0].points, 10);
// Tie-breaker by a selected bonus, including reversal of an eligible catch.
const tied = newEvent("Tiebreak");
tied.participants = [
  { id: "x", name: "Xeno", username: "", checkedIn: true, squadId: null },
  { id: "y", name: "Yana", username: "", checkedIn: true, squadId: null },
];
tied.tieBreaker = "bonus";
tied.tieBonusId = "b1";
tied.entries = [
  {
    id: "x-catch",
    participantId: "x",
    kind: "catch",
    delta: 5,
    description: "bonus catch",
    quantity: 1,
    bonuses: [{ id: "b1", name: "Mutasi", points: 3 }],
    createdAt: "2026-11-16T00:00:00Z",
  },
  {
    id: "y-catch",
    participantId: "y",
    kind: "catch",
    delta: 5,
    description: "other catch",
    quantity: 1,
    bonuses: [],
    createdAt: "2026-11-16T00:00:00Z",
  },
];
assert.equal(standings(tied)[0].name, "Xeno");
tied.entries.unshift({
  id: "x-rev",
  participantId: "x",
  kind: "reversal",
  delta: -5,
  description: "undo",
  createdAt: "2026-11-16T00:00:01Z",
  reversesEntryId: "x-catch",
});
assert.equal(standings(tied)[0].name, "Yana");
assert.equal(standings(tied).find((r) => r.id === "x").catches, 0);
const corrupt = structuredClone(data);
corrupt.events[0].entries = [
  {
    id: "bad",
    kind: "catch",
    participantId: "x",
    delta: 1,
    description: "bad",
    createdAt: "2026-11-16",
    bonuses: "oops",
  },
];
assert.equal(validArena(corrupt), false);
console.log(
  "PASS: arena smoke assertions (new event, configurable rules, rankings, history, rollback, V1 migration).",
);

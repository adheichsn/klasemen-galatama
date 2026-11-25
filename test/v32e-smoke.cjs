/** V3.2E: final presentation, identity titles and historical member contributions. */
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
const { standings } = load("lib/arena-utils.ts");
const { resultRows } = load("lib/tournament-results.ts");
const { tournamentAnalytics } = load("lib/tournament-analytics.ts");
const { identityRosterKey } = load("lib/player-identity.ts");
const { projectAvatarProfiles } = load("lib/avatar-identity.ts");
const { publicFinalEditions, finalEditionMatches, teamModeChampions } = load(
  "lib/championship-insights.ts",
);
const person = (id, squadId, username) => ({
  id,
  name: username,
  username,
  squadId,
  checkedIn: true,
});
const make = (id, mode, date) => ({
  ...newEvent("Edition " + id, mode),
  id,
  eventDate: date,
  finishedAt: "2026-11-21T10:00:00Z",
  status: "finished",
  published: true,
  squads: [
    { id: "a", name: "Cosmic", color: "#fff" },
    { id: "b", name: "Other", color: "#fff" },
    { id: "c", name: "Third", color: "#fff" },
  ],
  participants: [
    person("p1", "a", "OldUser"),
    person("p2", "a", "Partner"),
    person("p3", "b", "OtherUser"),
    person("p4", "b", "SecondOther"),
    person("p5", "c", "ThirdUser"),
    person("p6", "c", "ThirdOther"),
  ],
  entries: [
    {
      id: "x",
      participantId: "p1",
      squadId: "a",
      kind: "catch",
      delta: 6,
      quantity: 3,
    },
    {
      id: "y",
      participantId: "p2",
      squadId: "a",
      kind: "catch",
      delta: 4,
      quantity: 2,
    },
    {
      id: "z",
      participantId: "p1",
      squadId: "a",
      kind: "catch",
      delta: 2,
      quantity: 1,
    },
    {
      id: "r",
      participantId: "p1",
      squadId: "a",
      kind: "reversal",
      delta: -2,
      reversesEntryId: "z",
    },
    { id: "m", participantId: "p2", squadId: "a", kind: "manual", delta: -1 },
    {
      id: "o",
      participantId: "p3",
      squadId: "b",
      kind: "catch",
      delta: 2,
      quantity: 1,
    },
  ],
});
const duo = make("duo", "duo", "2026-11-18");
const squad = make("squad", "squad", "2026-11-19");
const renamed = make("renamed", "duo", "2026-11-20");
renamed.participants[0].username = "NewUser";
const hidden = { ...make("hidden", "duo", "2026-11-21"), published: false };
const trash = {
  ...make("trash", "duo", "2026-11-21"),
  trashedAt: "2026-11-21",
};
const live = { ...make("live", "duo", "2026-11-21"), status: "live" };
const duplicate = make("duplicate", "duo", "2026-11-17");
const all = [duo, squad, renamed, hidden, trash, live, duplicate];
const links = all.flatMap((e) =>
  e.participants
    .slice(0, 3)
    .map((p, i) => ({
      event_id: e.id,
      participant_id: p.id,
      roster_key: identityRosterKey(e, p),
      roblox_id: String(e.id === "duplicate" && i === 1 ? 100 : 100 + i),
      username: i === 0 ? "NewUser" : p.username,
      display_name: p.name,
      avatar_url: null,
    })),
);
const profiles = projectAvatarProfiles(all, links);
const before = JSON.stringify(all);
assert.deepEqual(
  publicFinalEditions(all).map((e) => e.id),
  ["renamed", "squad", "duo", "duplicate"],
);
assert.ok(finalEditionMatches(duo, profiles, "@NewUser"));
assert.ok(finalEditionMatches(duo, profiles, "100"));
assert.ok(finalEditionMatches(duo, {}, "Partner"));
assert.ok(!finalEditionMatches(duo, profiles, "NotFound"));
const duoChamps = teamModeChampions(all, profiles, "duo");
assert.deepEqual(
  duoChamps.map((p) => [p.key, p.wins]),
  [
    ["id:100", 2],
    ["id:101", 2],
  ],
);
assert.deepEqual(
  teamModeChampions(all, profiles, "squad").map((p) => [p.key, p.wins]),
  [
    ["id:100", 1],
    ["id:101", 1],
  ],
);
assert.deepEqual(teamModeChampions(all, {}, "duo"), []);
const official = {
  ...duo,
  historical: true,
  historicalPodium: ["a", "c", "b"],
  entries: duo.entries.filter((e) => e.id !== "o"),
};
assert.deepEqual(
  resultRows(official).map((r) => r.id),
  ["a", "c", "b"],
);
const winner = resultRows(duo)[0];
assert.equal(winner.points, 9);
assert.equal(winner.catches, 5);
assert.deepEqual(
  winner.members.map((m) => [m.id, m.points, m.catches]),
  [
    ["p1", 6, 3],
    ["p2", 3, 2],
  ],
);
const moved = structuredClone(squad);
moved.participants[0].squadId = "b";
const data = tournamentAnalytics(moved);
for (const team of data.squads) {
  assert.equal(
    team.points,
    team.contributors.reduce((sum, p) => sum + p.points, 0),
  );
  assert.equal(
    team.catches,
    team.contributors.reduce((sum, p) => sum + p.catches, 0),
  );
}
assert.equal(
  data.squads.find((t) => t.id === "a").contributors.find((p) => p.id === "p1")
    .points,
  6,
);
assert.equal(
  data.squads.find((t) => t.id === "b").contributors.find((p) => p.id === "p1")
    .points,
  0,
);
assert.equal(JSON.stringify(all), before);
assert.deepEqual(
  resultRows(duo).map((r) => [r.id, r.points]),
  standings(duo).map((r) => [r.id, r.points]),
);
for (const f of [
  "app/arsip/page.tsx",
  "app/hall-of-fame/page.tsx",
  "app/turnamen/[id]/hasil/page.tsx",
]) {
  const source = fs.readFileSync(path.join(root, f), "utf8");
  assert.match(source, /ChampionshipPodium/);
  assert.match(source, /publicEvents\((?:id)?\)/);
}
console.log(
  "PASS: V3.2E public edition ordering, mode champions, per-account deduplication, historical podium, participant search, reversals, snapshot team contributions, immutable results",
);

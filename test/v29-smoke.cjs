/* WEJI ARENA V2.9: ledger-only historical analytics, score reversals, mode isolation. */
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
function load(rel) {
  const file = path.resolve(root, rel);
  if (cache[file]) return cache[file].exports;
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const mod = new Module(file, module);
  cache[file] = mod;
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = (name) =>
    name.startsWith("./")
      ? load(path.join(path.dirname(file), name + ".ts"))
      : require(name);
  mod._compile(js, file);
  return mod.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const { tournamentAnalytics } = load("lib/tournament-analytics.ts");
const { standings } = load("lib/arena-utils.ts");
const person = (id, squadId = null) => ({
  id,
  name: id.toUpperCase(),
  username: id,
  squadId,
  checkedIn: true,
});
const at = "2026-11-18T04:00:00.000Z";
const entry = (id, participantId, kind, delta, extras = {}) => ({
  id,
  participantId,
  kind,
  delta,
  description: "",
  createdAt: at,
  ...extras,
});
const solo = {
  ...newEvent("Solo", "solo"),
  participants: [person("p1"), person("p2")],
  // The current rule is +200, but the original catch snapshot was +3.
  fish: [{ id: "f", name: "Renamed Fish", points: 200, enabled: true }],
  bonuses: [{ id: "b", name: "Mutasi", points: 99, enabled: true }],
  entries: [
    entry("a", "p1", "catch", 8, {
      fishId: "f",
      fishName: "Blob Shark",
      basePoints: 1,
      quantity: 2,
      bonuses: [{ id: "b", name: "Mutasi", points: 3 }],
    }),
    entry("b", "p1", "catch", 2, {
      fishId: "g",
      fishName: "Ghost Shark",
      basePoints: 2,
      quantity: 1,
    }),
    entry("c", "p1", "reversal", -2, { reversesEntryId: "b" }),
    entry("d", "p1", "manual", 5),
    entry("e", "p2", "manual", -4),
    entry("f", "p2", "reversal", 4, { reversesEntryId: "e" }),
    entry("g", "p2", "catch", 1, { quantity: 1 }), // legacy, unknown fish snapshot
  ],
};
const a = tournamentAnalytics(solo);
assert.equal(a.mode, "solo");
assert.equal(a.validCatches, 3);
assert.equal(a.catchRecords, 2);
assert.equal(a.reversedCatches, 1);
assert.equal(a.reversedAdjustments, 1);
assert.equal(a.catchPoints, 9);
assert.equal(a.adjustmentPoints, 5);
assert.equal(a.netPoints, 14);
assert.equal(a.averagePerCatch, 3);
assert.equal(a.contributors.find((p) => p.id === "p1").points, 13);
assert.equal(a.fish.find((f) => f.id === "f").name, "Blob Shark");
assert.equal(a.fish.find((f) => f.id === "f").points, 8);
assert.equal(a.bonuses[0].awardedPoints, 6);
assert.equal(a.bonuses[0].catches, 2);
assert.ok(a.fish.some((f) => f.name.includes("nama tidak tercatat")));
assert.ok(!a.fish.some((f) => f.name === "Ghost Shark"));
assert.equal(a.squads.length, 0);
const squad = {
  ...newEvent("Squad", "squad"),
  squads: [
    { id: "s1", name: "Alpha", color: "#fff" },
    { id: "s2", name: "Beta", color: "#000" },
  ],
  participants: [person("p1", "s2"), person("p2", "s2")],
  entries: [
    entry("s1", "p1", "catch", 5, {
      squadId: "s1",
      fishId: "f",
      fishName: "Old",
      quantity: 1,
    }),
    entry("s2", "p2", "catch", 2, {
      squadId: "s2",
      fishId: "f",
      fishName: "Old",
      quantity: 1,
    }),
    entry("s3", "p2", "manual", -1, { squadId: "s2" }),
  ],
};
const b = tournamentAnalytics(squad);
assert.equal(
  b.squads.find((s) => s.id === "s1").points,
  standings(squad).find((s) => s.id === "s1").points,
);
assert.equal(
  b.squads.find((s) => s.id === "s1").catches,
  1,
  "use historical squad snapshot",
);
assert.equal(b.squads.find((s) => s.id === "s2").points, 1);
assert.equal(b.netPoints, 6);
const source = fs.readFileSync(
  path.join(root, "lib/public-event-projection.ts"),
  "utf8",
);
for (const attr of [
  "fishId: entry.fishId",
  "fishName: entry.fishName",
  "basePoints: entry.basePoints",
])
  assert.ok(source.includes(attr));
const publicPage = fs.readFileSync(
  path.join(root, "app/turnamen/[id]/statistik/page.tsx"),
  "utf8",
);
assert.match(
  publicPage,
  /publicEvents\((?:id)?\)/,
  "statistics use published-only public event source",
);
assert.match(publicPage, /notFound\(\)/);
assert.ok(fs.existsSync(path.join(root, "app/statistik/page.tsx")));
assert.ok(
  fs.existsSync(path.join(root, "components/tournament-analytics.tsx")),
);
console.log(
  "PASS: V2.9 SOLO/SQUAD analytics, reversals, snapshots, dynamic rules, contributions, public privacy",
);

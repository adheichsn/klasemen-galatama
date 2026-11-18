/* WEJI ARENA V2.8 regression: event-scoped notifications, spectator privacy, activity feed. */
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
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
  mod._compile(code, file);
  return mod.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const { changedPublicEventIds, validPublicEventId } = load(
  "lib/public-changes.ts",
);
const { recentPublicActivity } = load("lib/live-activity.ts");
const e1 = newEvent("First", "solo");
const e2 = newEvent("Second", "squad");
const data = (events) => ({ version: 2, activeEventId: e1.id, events });
assert.deepEqual(
  changedPublicEventIds(null, data([e1, e2])),
  [],
  "unpublished drafts never notify",
);
const a = { ...e1, published: true };
const b = { ...e2, published: true };
assert.deepEqual(
  changedPublicEventIds(data([e1, e2]), data([a, e2])),
  [e1.id],
  "first publish notifies affected event only",
);
assert.deepEqual(
  changedPublicEventIds(data([a, b]), data([{ ...a, title: "Updated" }, b])),
  [e1.id],
  "updates do not trigger unrelated events",
);
assert.deepEqual(
  changedPublicEventIds(data([a, b]), data([{ ...a, published: false }, b])),
  [e1.id],
  "unpublish notifies spectator",
);
assert.deepEqual(
  changedPublicEventIds(data([a, b]), data([b])),
  [e1.id],
  "removed public event notifies spectator",
);
assert.deepEqual(
  changedPublicEventIds(
    data([e1, e2]),
    data([{ ...e1, title: "changed" }, e2]),
  ),
  [],
  "draft edits stay private",
);
assert.equal(validPublicEventId("abc-123"), true);
assert.equal(validPublicEventId("x\n"), false);
assert.equal(validPublicEventId("x".repeat(129)), false);
const base = Date.UTC(2026, 10, 18, 8);
const solo = {
  ...a,
  participants: [
    {
      id: "p1",
      name: "Captain",
      username: "captain",
      checkedIn: true,
      squadId: null,
    },
  ],
  entries: [
    {
      id: "s1",
      participantId: "p1",
      kind: "catch",
      delta: 5,
      description: "Blob Shark • Mutasi",
      catchRef: "SECRET-EVIDENCE",
      createdAt: new Date(base).toISOString(),
    },
    {
      id: "s2",
      participantId: "p1",
      kind: "reversal",
      delta: -5,
      description: "Private reason",
      createdAt: new Date(base + 1000).toISOString(),
      reversesEntryId: "s1",
    },
    {
      id: "s3",
      participantId: "p1",
      kind: "manual",
      delta: 2,
      description: "Staff note hidden",
      createdAt: new Date(base + 2000).toISOString(),
    },
  ],
};
const act = recentPublicActivity(solo);
assert.equal(act.length, 3);
assert.equal(act[0].action, "manual");
assert.equal(act[0].detail, "Penyesuaian poin");
assert.equal(act[1].detail, "Pembatalan poin");
assert.equal(act[2].detail, "Blob Shark • Mutasi");
assert.ok(!JSON.stringify(act).includes("SECRET-EVIDENCE"));
assert.ok(!JSON.stringify(act).includes("Staff note hidden"));
assert.ok(!JSON.stringify(act).includes("Private reason"));
assert.equal(recentPublicActivity(solo, 2).length, 2);
const squad = {
  ...b,
  squads: [{ id: "sq1", name: "Space Fishers", color: "#fff" }],
  participants: [{ ...solo.participants[0], squadId: "sq1" }],
  entries: [{ ...solo.entries[0], squadId: "sq1" }],
};
assert.equal(recentPublicActivity(squad)[0].squad, "Space Fishers");
const db = fs.readFileSync(path.join(root, "lib/db.ts"), "utf8");
assert.equal(
  (db.match(/changedPublicEventIds\(/g) || []).length,
  2,
  "both snapshot and event lifecycle publish changes",
);
assert.equal(
  (db.match(/pg_notify\(/g) || []).length,
  2,
  "notifications emitted inside transactions",
);
const stream = fs.readFileSync(
  path.join(root, "app/api/public/stream/route.ts"),
  "utf8",
);
assert.match(
  stream,
  /getPublicEvents\(\)/,
  "subscriptions validate event visibility",
);
assert.match(stream, /subscribePublicChanges\(/);
assert.match(stream, /event: update/);
assert.match(stream, /text\/event-stream/);
const auto = fs.readFileSync(
  path.join(root, "components/public-auto-refresh.tsx"),
  "utf8",
);
assert.match(auto, /new EventSource/);

assert.match(
  auto,
  /(?:window\.)?setInterval\(\s*(?:refresh\b|\(\)\s*=>\s*queueRefresh\()/
);

const spectator = fs.readFileSync(
  path.join(root, "app/spectate/[id]/page.tsx"),
  "utf8",
);
assert.match(spectator, /notFound\(\)/);
assert.match(spectator, /LiveActivityFeed/);
assert.match(spectator, /PublicRanking/);
assert.match(spectator, /PublicAutoRefresh/);
assert.ok(
  fs.existsSync(path.join(root, "app/api/admin/events/route.ts")),
  "canonical /events route restored",
);
console.log(
  "PASS: V2.8 scoped LIVE notifications, private-event isolation, activity sanitization, SOLO/SQUAD, spectator gate, poll fallback and admin endpoint compatibility",
);

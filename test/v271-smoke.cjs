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
  const resolved = path.resolve(root, rel);
  if (cache[resolved]) return cache[resolved].exports;
  const code = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = new Module(resolved, module);
  cache[resolved] = mod;
  mod.filename = resolved;
  mod.paths = Module._nodeModulePaths(path.dirname(resolved));
  mod.require = (name) =>
    name.startsWith("./")
      ? load(path.join(path.dirname(resolved), name + ".ts"))
      : require(name);
  mod._compile(code, resolved);
  return mod.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const { applyEventLifecycle } = load("lib/event-lifecycle.ts");
const { validateMatchTransition } = load("lib/match-operations.ts");
const { prepareSnapshot } = load("lib/score-integrity.ts");
const { validArena } = load("lib/arena-storage.ts");
const { rosterRegistry } = load("lib/roster-management.ts");
const now = Date.UTC(2026, 10, 18, 8, 0, 0);
const first = newEvent("Galatama SOLO", "solo");
const second = newEvent("Galatama Final Skor", "squad");
second.status = "finished";
second.published = true;
second.featured = true;
second.entries = [
  {
    id: "entry1",
    participantId: "p1",
    kind: "catch",
    delta: 4,
    description: "Ikan langka",
    createdAt: new Date(now).toISOString(),
  },
  {
    id: "entry2",
    participantId: "p1",
    kind: "manual",
    delta: -1,
    description: "Koreksi",
    createdAt: new Date(now).toISOString(),
  },
];
second.participants = [
  {
    id: "p1",
    name: "Fish Winner",
    username: "winner_1",
    checkedIn: true,
    squadId: "sq1",
  },
];
second.squads = [{ id: "sq1", name: "Squad A", color: "#ffffff" }];
const base = { version: 2, activeEventId: second.id, events: [first, second] };
assert.equal(validArena(base), true);
assert.equal(
  prepareSnapshot(base, { ...base, events: [first] }, now).ok,
  false,
  "cannot bypass permanent deletion via snapshot PUT",
);
assert.match(
  validateMatchTransition(base, { ...base, events: [first] }),
  /tidak boleh dihapus/,
);
const trashed = applyEventLifecycle(base, second.id, "trash", now, "panitia");
assert.equal(trashed.ok, true);
assert.ok(trashed.data.events.find((e) => e.id === second.id).trashedAt);
assert.equal(
  trashed.data.events.find((e) => e.id === second.id).published,
  false,
);
assert.equal(
  trashed.data.events.find((e) => e.id === second.id).featured,
  false,
);
assert.equal(trashed.data.activeEventId, first.id);
assert.equal(validArena(trashed.data), true);
assert.equal(
  trashed.data.events[0],
  first,
  "unrelated event reference unchanged",
);
assert.equal(
  rosterRegistry(trashed.data).length,
  0,
  "trashed member not in registry",
);
assert.match(
  validateMatchTransition(base, trashed.data),
  /Trash/,
  "cannot trash via normal PUT",
);
assert.equal(
  applyEventLifecycle(trashed.data, second.id, "trash", now, "panitia").ok,
  false,
);
const restored = applyEventLifecycle(
  trashed.data,
  second.id,
  "restore",
  now,
  "panitia",
);
assert.equal(restored.ok, true);
assert.equal(
  restored.data.events.find((e) => e.id === second.id).trashedAt,
  undefined,
);
assert.equal(
  restored.data.events.find((e) => e.id === second.id).published,
  false,
  "restore never auto publishes",
);
assert.equal(
  restored.data.events.find((e) => e.id === second.id).entries.length,
  2,
);
assert.equal(
  applyEventLifecycle(base, second.id, "delete", now, "panitia").ok,
  false,
  "cannot bypass trash",
);
const deleted = applyEventLifecycle(
  trashed.data,
  second.id,
  "delete",
  now,
  "panitia",
);
assert.equal(deleted.ok, true);
assert.equal(
  deleted.data.events.some((e) => e.id === second.id),
  false,
  "score and roster event no longer exist",
);
assert.deepEqual(deleted.data.events, [first], "other event not changed");
assert.equal(validArena(deleted.data), true);
assert.equal(
  prepareSnapshot(trashed.data, deleted.data, now).ok,
  false,
  "client cannot spoof purge using PUT",
);
// Last visible event gets a new draft. Existing Trash events remain untouched.
const lone = { version: 2, activeEventId: first.id, events: [first] };
const loneTrash = applyEventLifecycle(lone, first.id, "trash", now, "panitia");
assert.equal(loneTrash.ok, true);
assert.equal(loneTrash.data.events.length, 2);
assert.equal(
  loneTrash.data.events.find((e) => e.id === loneTrash.data.activeEventId)
    .status,
  "draft",
);
const loneDelete = applyEventLifecycle(
  loneTrash.data,
  first.id,
  "delete",
  now,
  "panitia",
);
assert.equal(loneDelete.ok, true);
assert.equal(loneDelete.data.events.length, 1);
assert.equal(validArena(loneDelete.data), true);
// Live match must not silently resume after restoring from Trash.
const live = newEvent("Live Match", "solo");
live.status = "live";
live.timer = {
  durationSec: 5400,
  remainingSec: 3000,
  runningSince: now - 10000,
};
const liveTrash = applyEventLifecycle(
  { version: 2, activeEventId: live.id, events: [live] },
  live.id,
  "trash",
  now,
  "admin",
);
assert.equal(liveTrash.ok, true);
assert.equal(
  liveTrash.data.events.find((e) => e.id === live.id).timer.runningSince,
  null,
);
assert.equal(
  liveTrash.data.events.find((e) => e.id === live.id).timer.remainingSec,
  2990,
);
const liveRestore = applyEventLifecycle(
  liveTrash.data,
  live.id,
  "restore",
  now,
  "admin",
);
assert.equal(
  liveRestore.data.events.find((e) => e.id === live.id).timer.runningSince,
  null,
);
// Frontend/API checks for lifecycle-only operations.
const db = fs.readFileSync(path.join(root, "lib/db.ts"), "utf8");
const route = fs.readFileSync(
  path.join(root, "app/api/admin/events/route.ts"),
  "utf8",
);
const publicEvents = fs.readFileSync(
  path.join(root, "lib/public-event-projection.ts"),
  "utf8",
);
assert.match(db, /return projectPublicEvents\(data.events\)/);
assert.match(route, /isAdminAuthenticated\(\)/);
assert.match(route, /sameOrigin\(request\)/);
assert.match(db, /confirmedTitle !== applied\.target\.title/);
assert.match(db, /DELETE FROM weji_arena_score_audit/);
assert.match(db, /weji_arena_event_audit/);
assert.match(publicEvents, /e\.published && !e\.trashedAt/);
console.log(
  "PASS: V2.7.1 Trash, restore, permanent score deletion, last-event fallback, unchanged other events, live pause, admin protection, scoring snapshot guard.",
);

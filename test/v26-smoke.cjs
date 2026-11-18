/** V2.6: immutable entries, receipt dedupe, server time, audit, finalized lock. */
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
function load(file) {
  const resolved = path.resolve(root, file);
  if (cache[resolved]) return cache[resolved].exports;
  const output = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    fileName: resolved,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText;
  const m = new Module(resolved, module);
  cache[resolved] = m;
  m.filename = resolved;
  m.paths = Module._nodeModulePaths(path.dirname(resolved));
  m.require = (name) =>
    name.startsWith("./")
      ? load(path.join(path.dirname(resolved), name + ".ts"))
      : require(name);
  m._compile(output, resolved);
  return m.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const {
  startMatch,
  pauseMatch,
  resumeMatch,
  finishMatch,
  validateMatchTransition,
} = load("lib/match-operations.ts");
const { validArena } = load("lib/arena-storage.ts");
const { prepareSnapshot } = load("lib/score-integrity.ts");
const { calculateCatch } = load("lib/arena-rules.ts");
const t = Date.UTC(2026, 10, 17, 10, 0, 0);
const e = newEvent("V2.6 test", "solo");
e.fish = [{ id: "f1", name: "Blob Shark", enabled: true, points: 1 }];
e.bonuses = [{ id: "b1", name: "Mutasi", enabled: true, points: 3 }];
e.participants = [
  {
    id: "p1",
    name: "Peserta Satu",
    username: "p1",
    squadId: null,
    checkedIn: true,
  },
];
e.timer = { durationSec: 120, remainingSec: 120, runningSince: null };
const data = (event) => ({
  version: 2,
  activeEventId: event.id,
  events: [event],
});
let baseline = data(e);
const localStart = startMatch(e, t - 50_000);
let result = prepareSnapshot(baseline, data(localStart), t);
assert.equal(result.ok, true);
let live = result.data.events[0];
assert.equal(live.timer.runningSince, t, "start uses SERVER time");
assert.equal(live.startedAt, new Date(t).toISOString());
assert.deepEqual(
  result.activity.map((x) => x.action),
  ["start"],
);
baseline = result.data;
const catchCalc = calculateCatch(live, "f1", ["b1"], 1);
const entry = {
  id: "score1",
  participantId: "p1",
  squadId: null,
  kind: "catch",
  delta: catchCalc.delta,
  fishId: "f1",
  fishName: "Blob Shark",
  basePoints: 1,
  bonuses: catchCalc.bonuses,
  quantity: 1,
  description: "Blob Shark • Mutasi",
  catchRef: "SS-001",
  createdAt: new Date(t - 45_000).toISOString(),
};
const updated = structuredClone(live);
updated.entries = [entry];
result = prepareSnapshot(baseline, data(updated), t + 10_000);
assert.equal(result.ok, true);
assert.equal(result.activity[0].action, "catch");
assert.equal(result.activity[0].delta, 4);
assert.equal(
  result.data.events[0].entries[0].createdAt,
  new Date(t + 10_000).toISOString(),
  "score gets server timestamp",
);
assert.equal(validArena(result.data), true);
baseline = result.data;
live = baseline.events[0];
const withNew = (item) => data({ ...live, entries: [item, ...live.entries] });
const invalidScore = { ...entry, id: "score2", delta: 100, catchRef: "SS-002" };
assert.match(
  prepareSnapshot(baseline, withNew(invalidScore), t + 15_000).error,
  /Perhitungan/,
);
const duplicateRef = { ...entry, id: "score2", catchRef: "ss-001" };
assert.match(
  prepareSnapshot(baseline, withNew(duplicateRef), t + 15_000).error,
  /Referensi/,
);
const otherCatch = { ...entry, id: "score2", catchRef: "SS-002" };
assert.equal(
  prepareSnapshot(baseline, withNew(otherCatch), t + 15_000).ok,
  true,
  "two legit identical fish with distinct IDs are allowed",
);
const changedHistory = data({
  ...live,
  entries: [{ ...live.entries[0], delta: 99 }],
});
assert.match(
  prepareSnapshot(baseline, changedHistory, t + 20_000).error,
  /historis/,
);
const missingHistory = data({ ...live, entries: [] });
assert.match(
  prepareSnapshot(baseline, missingHistory, t + 20_000).error,
  /historis/,
);
const reversal = {
  id: "rev1",
  participantId: "p1",
  squadId: null,
  kind: "reversal",
  delta: -4,
  reversesEntryId: "score1",
  description: "Pembatalan",
  createdAt: new Date(t).toISOString(),
};
result = prepareSnapshot(baseline, withNew(reversal), t + 20_000);
assert.equal(result.ok, true);
assert.equal(result.activity[0].action, "reversal");
const reversed = result.data;
const repeatReversal = { ...reversal, id: "rev2" };
assert.match(
  prepareSnapshot(
    reversed,
    data({
      ...reversed.events[0],
      entries: [repeatReversal, ...reversed.events[0].entries],
    }),
    t + 30_000,
  ).error,
  /lebih dari sekali/,
);
const pausedLocal = pauseMatch(live, t + 20_000);
result = prepareSnapshot(
  baseline,
  data({ ...pausedLocal, timer: { ...pausedLocal.timer, remainingSec: 1000 } }),
  t + 25_000,
);
assert.equal(result.ok, true);
assert.equal(
  result.data.events[0].timer.remainingSec,
  95,
  "pause uses elapsed SERVER time, ignores forged browser time",
);
assert.equal(result.activity[0].action, "pause");
const paused = result.data;
const pausedCatch = { ...entry, id: "score3", catchRef: "SS-003" };
assert.match(
  prepareSnapshot(
    paused,
    data({
      ...paused.events[0],
      entries: [pausedCatch, ...paused.events[0].entries],
    }),
    t + 28_000,
  ).error,
  /timer/,
);
const resumeLocal = resumeMatch(paused.events[0], t + 80_000);
result = prepareSnapshot(paused, data(resumeLocal), t + 90_000);
assert.equal(result.ok, true);
assert.equal(
  result.data.events[0].timer.runningSince,
  t + 90_000,
  "resume uses server time",
);
assert.equal(result.activity[0].action, "resume");
const expired = prepareSnapshot(
  baseline,
  withNew({ ...entry, id: "score4", catchRef: "SS-004" }),
  t + 121_000,
);
assert.match(expired.error, /belum habis/);
const finishWithUnsaved = finishMatch(
  { ...live, entries: [otherCatch, ...live.entries] },
  t + 30_000,
);
assert.match(
  prepareSnapshot(baseline, data(finishWithUnsaved), t + 32_000).error,
  /Simpan semua skor/,
);
const tamperedFinish = finishMatch(
  { ...live, entries: [{ ...live.entries[0], delta: 999 }] },
  t + 20_000,
);
assert.match(
  prepareSnapshot(baseline, data(tamperedFinish), t + 30_000).error,
  /Simpan semua skor/,
);
const finish = finishMatch(live, t + 20_000);
result = prepareSnapshot(baseline, data(finish), t + 30_000);
assert.equal(result.ok, true);
assert.equal(
  result.data.events[0].finishedAt,
  new Date(t + 30_000).toISOString(),
);
assert.equal(result.data.events[0].timer.remainingSec, 90);
assert.equal(result.activity[0].action, "finish");
assert.equal(validateMatchTransition(baseline, result.data), null);
const finished = result.data;
assert.match(validateMatchTransition(finished, baseline), /terkunci/);
const illegalNewEvent = data(startMatch(e, t));
illegalNewEvent.events[0].id = "brand-new";
assert.match(prepareSnapshot(null, illegalNewEvent, t).error, /Draft kosong/);
const squad = newEvent("SQUAD Test", "squad");
squad.squads = [{ id: "team1", name: "Alpha", color: "#2463EB" }];
squad.participants = [{ ...e.participants[0], squadId: "team1" }];
squad.fish = e.fish;
squad.timer = e.timer;
const squadLive = startMatch(squad, t);
const squadPrepared = prepareSnapshot(data(squad), data(squadLive), t);
assert.equal(squadPrepared.ok, true);
const squadCatch = {
  ...entry,
  id: "team-entry",
  squadId: "team1",
  catchRef: "TEAM-1",
  bonuses: [],
  delta: 1,
  description: "Blob Shark",
};
assert.equal(
  prepareSnapshot(
    squadPrepared.data,
    data({ ...squadPrepared.data.events[0], entries: [squadCatch] }),
    t + 5_000,
  ).ok,
  true,
);
const squadTransfer = structuredClone(squadPrepared.data);
squadTransfer.events[0].participants[0].squadId = "another";
squadTransfer.events[0].entries = [squadCatch];
const squadSaved = prepareSnapshot(
  squadPrepared.data,
  data({ ...squadPrepared.data.events[0], entries: [squadCatch] }),
  t + 5_000,
);
const illicit = structuredClone(squadSaved.data);
illicit.events[0].participants[0].squadId = "other";
assert.match(
  prepareSnapshot(squadSaved.data, illicit, t + 6_000).error,
  /dipindah/,
);
// Source integration checks; no database connection or network required.
const db = fs.readFileSync(path.join(root, "lib/db.ts"), "utf8");
assert.match(db, /prepareSnapshot/);
assert.match(db, /weji_arena_score_audit/);
assert.match(db, /FOR UPDATE/);
const sql = fs.readFileSync(path.join(root, "db/schema.sql"), "utf8");
assert.match(sql, /CREATE TABLE IF NOT EXISTS weji_arena_score_audit/);
const auditRoute = fs.readFileSync(
  path.join(root, "app/api/admin/audit/route.ts"),
  "utf8",
);
assert.match(auditRoute, /isAdminAuthenticated/);
const app = fs.readFileSync(
  path.join(root, "components/arena-app.tsx"),
  "utf8",
);
assert.match(app, /FinalizationReview/);
assert.match(app, /ScoreAuditDialog/);
console.log(
  "PASS: V2.6 server timestamps, anti-duplicate proof, immutable scores, audit, pause/resume, final review, SOLO/SQUAD",
);

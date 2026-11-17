/** V2.5: lifecycle, clock, finalization and backward-compatible snapshots. */
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
const { newEvent, initialArena } = load("lib/arena-data.ts");
const { validArena } = load("lib/arena-storage.ts");
const { secondsLeft, standings } = load("lib/arena-utils.ts");
const {
  startMatch,
  pauseMatch,
  resumeMatch,
  finishMatch,
  resetDraftClock,
  validateMatchTransition,
} = load("lib/match-operations.ts");
const time = Date.UTC(2026, 10, 17, 7, 0, 0);
const e = newEvent("Satu test", "solo");
e.fish = [{ id: "f", name: "Ikan test", points: 2, enabled: true }];
e.participants = [
  { id: "p", name: "A", username: "a", squadId: null, checkedIn: true },
];
e.timer = { durationSec: 180, remainingSec: 180, runningSince: null };
assert.equal(
  startMatch({ ...e, fish: [] }, time).status,
  "draft",
  "cannot start without fish",
);
const live = startMatch(e, time);
assert.equal(live.status, "live");
assert.equal(live.timer.runningSince, time, "start must start countdown");
assert.equal(live.startedAt, new Date(time).toISOString());
assert.equal(secondsLeft(live.timer, time + 70000), 110);
const paused = pauseMatch(live, time + 70000);
assert.equal(paused.timer.runningSince, null);
assert.equal(paused.timer.remainingSec, 110);
assert.equal(
  secondsLeft(paused.timer, time + 200000),
  110,
  "paused time stays fixed",
);
const resumed = resumeMatch(paused, time + 80000);
assert.equal(secondsLeft(resumed.timer, time + 100000), 90);
assert.equal(
  startMatch(resumed, time + 110000),
  resumed,
  "cannot restart an active match",
);
const finished = finishMatch(resumed, time + 100000);
assert.equal(finished.status, "finished");
assert.equal(finished.timer.remainingSec, 90);
assert.equal(finished.timer.runningSince, null);
assert.equal(finishMatch(finished, time + 120000), finished);
assert.equal(resumeMatch(finished, time + 120000), finished);
assert.equal(resetDraftClock(finished), finished);
assert.equal(
  validArena({ version: 2, activeEventId: e.id, events: [finished] }),
  true,
);
assert.equal(
  validArena(initialArena()),
  true,
  "legacy event without startedAt is valid",
);
const previous = { version: 2, activeEventId: e.id, events: [e] };
const liveState = { ...previous, events: [live] };
const finalState = { ...previous, events: [finished] };
assert.equal(validateMatchTransition(previous, liveState), null);
assert.equal(validateMatchTransition(liveState, finalState), null);
assert.match(
  validateMatchTransition(previous, finalState),
  /tidak valid/,
  "draft cannot jump to finished",
);
assert.match(
  validateMatchTransition(finalState, liveState),
  /terkunci/,
  "finished cannot reopen",
);
assert.match(
  validateMatchTransition(finalState, { ...finalState, events: [] }),
  /tidak boleh dihapus/,
);
const marketingOnly = structuredClone(finalState);
marketingOnly.events[0].published = true;
marketingOnly.events[0].featured = true;
marketingOnly.events[0].bannerUrl =
  "/api/assets/123e4567-e89b-42d3-a456-426614174000";
assert.equal(
  validateMatchTransition(finalState, marketingOnly),
  null,
  "archive promotion allowed",
);
const modified = structuredClone(finalState);
modified.events[0].entries = [
  {
    id: "score1",
    participantId: "p",
    kind: "manual",
    delta: 1,
    description: "manipulated",
    createdAt: new Date(time).toISOString(),
  },
];
assert.match(
  validateMatchTransition(finalState, modified),
  /terkunci/,
  "final score cannot change",
);
assert.deepEqual(
  standings(finished),
  standings(e),
  "finalization does not modify rankings",
);
const squad = newEvent("Team Test", "squad");
squad.fish = e.fish;
squad.participants = [{ ...e.participants[0], squadId: "s" }];
squad.squads = [{ id: "s", name: "Team", color: "#123456" }];
assert.equal(
  startMatch(squad, time).status,
  "live",
  "squad can start with valid team",
);
const invalidSquad = structuredClone(squad);
invalidSquad.participants[0].squadId = "missing";
assert.equal(startMatch(invalidSquad, time).status, "draft");
// Integration wiring guards
const api = fs.readFileSync(path.join(root, "lib/db.ts"), "utf8");
assert.match(api, /FOR UPDATE/);
assert.match(api, /validateMatchTransition/);
const adminApp = fs.readFileSync(
  path.join(root, "components/arena-app.tsx"),
  "utf8",
);
assert.doesNotMatch(adminApp, /Buka kembali event/);
const page = fs.readFileSync(
  path.join(root, "app/turnamen/[id]/page.tsx"),
  "utf8",
);
assert.match(page, /LiveMatchClock/);
console.log(
  "PASS: V2.5 lifecycle, countdown, pause/resume, final snapshot lock, SOLO/SQUAD, public timer",
);

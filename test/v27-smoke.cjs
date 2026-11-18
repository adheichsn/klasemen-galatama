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
  const output = ts.transpileModule(fs.readFileSync(resolved, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
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
  mod._compile(output, resolved);
  return mod.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const {
  addRosterMember,
  addRosterSquad,
  planCsvImport,
  rosterEditable,
  rosterRegistry,
  validateRosterChange,
} = load("lib/roster-management.ts");
const { validArena } = load("lib/arena-storage.ts");
const { prepareSnapshot } = load("lib/score-integrity.ts");
const { startMatch } = load("lib/match-operations.ts");
const at = Date.UTC(2026, 10, 18, 8, 0, 0);
const wrap = (e) => ({ version: 2, activeEventId: e.id, events: [e] });
let solo = newEvent("SOLO Registry", "solo");
assert.equal(rosterEditable(solo), true);
solo = addRosterMember(solo, "A B", "MyRoblox_01", null);
assert.ok(solo);
assert.equal(
  addRosterMember(solo, "Alias", "myroblox_01", null),
  null,
  "username cannot duplicate case-insensitive",
);
assert.equal(addRosterMember(solo, "No user", "", null).participants.length, 2);
assert.equal(
  addRosterMember(
    addRosterMember(solo, "No user", "", null),
    "No user",
    "",
    null,
  ),
  null,
  "anonymous name cannot duplicate",
);
assert.equal(addRosterMember(solo, "Invalid", "@12", null), null);
const registry = rosterRegistry({
  version: 2,
  activeEventId: solo.id,
  events: [solo],
});
assert.equal(registry.length, 1);
assert.equal(registry[0].username, "MyRoblox_01");
assert.equal(registry[0].appearances, 1);
let next = newEvent("Other", "solo");
next = addRosterMember(next, "Latest Alias", "myroblox_01", null);
assert.equal(
  rosterRegistry({
    version: 2,
    activeEventId: solo.id,
    events: [solo, next],
  })[0].appearances,
  2,
);
assert.equal(validArena(wrap(solo)), true);
assert.equal(validArena(wrap({ ...solo, rosterLocked: true })), true);
assert.equal(validArena(wrap({ ...solo, squadSizeLimit: -1 })), false);
assert.equal(
  planCsvImport(solo, 'name,username\n"A, B",new_player\n').rows[0].name,
  "A, B",
);
assert.ok(
  planCsvImport(solo, "name,username\nFoo,myroblox_01\n").errors[0].includes(
    "terdaftar",
  ),
);
assert.ok(
  planCsvImport(solo, "name,username\nFoo,abc\nBar,ABC\n").errors.length,
);
assert.ok(planCsvImport(solo, "name,username\nFoo,ab\n").errors.length);
assert.ok(planCsvImport(solo, 'name,username\n"Unclosed,foo').errors.length);
assert.ok(planCsvImport(solo, "name,username\nFoo,valid_user\n").prepared);
assert.equal(
  planCsvImport(solo, "name,username\nFoo,valid_user\n").prepared.participants
    .length,
  2,
);
const originalSolo = structuredClone(solo);
solo = { ...solo, rosterLocked: true };
assert.equal(addRosterMember(solo, "Cannot", "newuser", null), null);
assert.equal(planCsvImport(solo, "name,username\nFoo,newuser").prepared, null);
assert.equal(validateRosterChange(originalSolo, solo), null);
assert.equal(
  validateRosterChange(solo, { ...solo, rosterLocked: false }),
  null,
  "draft roster unlock is allowed",
);
const cheatedLocked = {
  ...solo,
  participants: [
    ...solo.participants,
    {
      id: "bad",
      name: "Bad",
      username: "badUser",
      squadId: null,
      checkedIn: false,
    },
  ],
};
assert.match(validateRosterChange(solo, cheatedLocked), /terkunci/);
let squad = newEvent("SQUAD", "squad");
squad.fish = [{ id: "fish-1", name: "Fish", points: 1, enabled: true }];
squad = addRosterSquad(squad, "Alpha");
assert.equal(addRosterSquad(squad, "alpha"), null);
squad = { ...squad, squadSizeLimit: 2 };
const teamId = squad.squads[0].id;
squad = addRosterMember(squad, "Captain", "captain_01", teamId);
squad = addRosterMember(squad, "Member", "member_01", teamId);
assert.equal(
  addRosterMember(squad, "Extra", "extra_01", teamId),
  null,
  "squad cap enforced",
);
squad = {
  ...squad,
  squads: [{ ...squad.squads[0], captainId: squad.participants[0].id }],
};
assert.equal(validateRosterChange(undefined, squad), null);
assert.ok(
  validateRosterChange(undefined, {
    ...squad,
    squads: [{ ...squad.squads[0], captainId: "not-member" }],
  }),
);
const squadCsv =
  'name,username,squad,checkedIn\nPlayer1,player1,Team B,true\n"Player, Two",player2,Team B,1\n';
const squadImport = planCsvImport({ ...squad, squadSizeLimit: 0 }, squadCsv);
assert.equal(squadImport.errors.length, 0);
assert.equal(squadImport.addedSquads, 1);
assert.equal(squadImport.prepared.participants.length, 4);
assert.equal(squadImport.prepared.participants.at(-1).checkedIn, true);
assert.ok(
  planCsvImport({ ...squad, squadSizeLimit: 1 }, squadCsv).errors.some((e) =>
    e.includes("batas"),
  ),
);
const saved = prepareSnapshot(null, wrap(squad), at);
assert.equal(saved.ok, true);
const started = startMatch(squad, at);
assert.equal(prepareSnapshot(saved.data, wrap(started), at).ok, true);
let live = {
  ...started,
  participants: [
    ...started.participants,
    {
      id: "late",
      name: "Late",
      username: "late_user",
      checkedIn: false,
      squadId: teamId,
    },
  ],
};
assert.match(
  prepareSnapshot(wrap(started), wrap(live), at + 1000).error,
  /terkunci/,
  "server rejects LIVE roster edits",
);
live = {
  ...started,
  participants: started.participants.map((p) => ({ ...p, checkedIn: true })),
};
assert.equal(
  prepareSnapshot(wrap(started), wrap(live), at + 1000).ok,
  true,
  "LIVE checkin allowed",
);
const invalidCAP = { ...squad, squadSizeLimit: 1 };
assert.match(validateRosterChange(undefined, invalidCAP), /melampaui/);
assert.match(
  validateRosterChange(undefined, {
    ...squad,
    squadSizeLimit: 0,
    participants: [
      ...squad.participants,
      {
        id: "duplicate",
        name: "D",
        username: "CAPTAIN_01",
        squadId: teamId,
        checkedIn: false,
      },
    ],
  }),
  /lebih dari sekali/,
);
const route = fs.readFileSync(
  path.join(root, "lib/score-integrity.ts"),
  "utf8",
);
assert.match(
  route,
  /validateRosterChange/,
  "server enforces roster checks under snapshot validation",
);
const hook = fs.readFileSync(path.join(root, "hooks/use-arena.ts"), "utf8");
assert.match(hook, /importRosterCsv/);
const builder = fs.readFileSync(
  path.join(root, "components/arena-builder.tsx"),
  "utf8",
);
assert.match(builder, /ParticipantRoster/);
console.log(
  "PASS: V2.7 per-event registry, CSV previews/import, duplicate usernames, squad caps/captains, draft lock, LIVE check-in, server rejection",
);

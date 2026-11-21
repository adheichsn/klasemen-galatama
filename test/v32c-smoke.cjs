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
const source = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const modules = new Map();
let pool;
const errors = [];
function load(rel) {
  if (modules.has(rel)) return modules.get(rel).exports;
  const file = path.resolve(root, rel),
    m = new Module(file, module);
  modules.set(rel, m);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = (name) =>
    name === "server-only"
      ? {}
      : name === "./db"
        ? { getDatabasePool: () => pool }
        : name === "./server-errors"
          ? { logServerFailure: (...args) => errors.push(args) }
          : name.startsWith("./")
            ? load(
                path.relative(
                  root,
                  path.resolve(path.dirname(file), name + ".ts"),
                ),
              )
            : require(name);
  m._compile(
    ts.transpileModule(source(rel), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const { avatarTarget, projectAvatarProfiles } = load("lib/avatar-identity.ts");
const { identityRosterKey } = load("lib/player-identity.ts");
const {
  buildPlayerDirectory,
  playerTotals,
  findDirectoryPlayers,
  resolveLegacyHistory,
  identitySoloChampions,
  playerHref,
} = load("lib/player-directory.ts");
const { resultRows } = load("lib/tournament-results.ts");
const { publicAvatarProfiles } = load("lib/avatar-identity-db.ts");
const p = (id, name, username, squadId = null) => ({
  id,
  name,
  username,
  squadId,
  checkedIn: true,
});
const base = (id, date, participants, fields = {}) => ({
  id,
  eventDate: date,
  createdAt: date,
  title: `Event ${id}`,
  location: "Island",
  status: "finished",
  published: true,
  mode: "solo",
  participants,
  entries: [],
  squads: [],
  tieBreaker: "alphabetical",
  ...fields,
});
const score = (id, participantId, delta, fields = {}) => ({
  id,
  participantId,
  kind: "catch",
  delta,
  quantity: 1,
  ...fields,
});
const a = base(
  "a",
  "2026-11-18",
  [
    p("p1", "Old display", "OldUser"),
    p("p2", "Second", "SecondUser"),
    p("p3", "Third", "ThirdUser"),
  ],
  {
    historical: true,
    historicalPodium: ["p1", "p2", "p3"],
    entries: [score("a1", "p1", 5), score("a2", "p2", 5), score("a3", "p3", 5)],
  },
);
const b = base(
  "b",
  "2026-11-19",
  [p("q1", "Renamed display", "NewUser"), p("q2", "Second", "SecondUser")],
  {
    entries: [
      score("b1", "q1", 8),
      score("b2", "q1", 3, { kind: "manual" }),
      score("b3", "q1", 2, { quantity: 2 }),
      score("b4", "q1", -2, { kind: "reversal", reversesEntryId: "b3" }),
      score("b5", "q2", 1),
    ],
  },
);
const s = base(
  "s",
  "2026-11-20",
  [
    p("s1", "New display", "NewUser", "teamA"),
    p("s2", "Partner", "Partner", "teamA"),
    p("s3", "Other", "Other", "teamB"),
  ],
  {
    mode: "squad",
    squads: [
      { id: "teamA", name: "Alpha" },
      { id: "teamB", name: "Beta" },
    ],
    entries: [
      score("s1", "s1", 4, { squadId: "teamA" }),
      score("s2", "s2", 20, { squadId: "teamA" }),
      score("s3", "s3", 7, { squadId: "teamB" }),
    ],
  },
);
const reused = base("reuse", "2026-11-17", [p("z", "Old display", "OldUser")], {
  entries: [score("z1", "z", 42)],
});
const unlinked = base(
  "unlinked",
  "2026-11-16",
  [p("u", "Old display", "OldUser")],
  { entries: [score("u1", "u", 100)] },
);
const live = base("live", "2026-11-21", [p("l", "New display", "NewUser")], {
  status: "live",
  entries: [score("l1", "l", 900)],
});
const draft = base("draft", "2026-11-22", [p("d", "New display", "NewUser")], {
  status: "draft",
});
const hidden = base(
  "hidden",
  "2026-11-21",
  [p("h", "Private only", "PrivateOnly")],
  { published: false, entries: [score("h1", "h", 999)] },
);
const trash = base("trash", "2026-11-21", [p("t", "Trash only", "TrashOnly")], {
  trashedAt: "2026-11-21",
});
const stale = base("stale", "2026-11-21", [p("st", "Stale", "StaleName")]);
const duplicate = base("duplicate", "2026-11-22", [
  p("d1", "Duplicate1", "Duplicate1"),
  p("d2", "Duplicate2", "Duplicate2"),
]);
const link = (event, participant, id, username = "NewUser", extra = {}) => ({
  event_id: event.id,
  participant_id: participant.id,
  roster_key: identityRosterKey(event, participant),
  roblox_id: id,
  username,
  display_name: username,
  avatar_url: "https://tr.rbxcdn.com/avatar.png",
  ...extra,
});
const events = [
  a,
  b,
  s,
  reused,
  unlinked,
  live,
  draft,
  hidden,
  trash,
  stale,
  duplicate,
];
const rows = [
  link(a, a.participants[0], "123"),
  link(b, b.participants[0], "123"),
  link(s, s.participants[0], "123"),
  link(s, s.participants[1], "222", "Partner"),
  link(s, s.participants[2], "333", "Other"),
  link(reused, reused.participants[0], "999", "OldUser"),
  link(live, live.participants[0], "123"),
  link(draft, draft.participants[0], "123"),
  link(hidden, hidden.participants[0], "777", "PrivateOnly"),
  link(trash, trash.participants[0], "888", "TrashOnly"),
  link(stale, stale.participants[0], "555", "StaleName", {
    roster_key: "stale",
  }),
  link(duplicate, duplicate.participants[0], "123"),
  link(duplicate, duplicate.participants[1], "123"),
];
const before = JSON.stringify(events);
// Even if a caller accidentally supplies private identity maps, projection must filter event visibility itself.
const profileMap = projectAvatarProfiles(events, rows);
const directory = buildPlayerDirectory(events, profileMap);
assert.deepEqual(directory.map((x) => x.profile.robloxId).sort(), [
  "123",
  "222",
  "333",
  "999",
]);
const player = directory.find((x) => x.profile.robloxId === "123");
assert.equal(player.history.length, 5);
assert.equal(player.history[0].eventId, "draft");
assert.deepEqual(playerTotals(player), { finalEvents: 3, wins: 3, podiums: 3 });
assert.deepEqual(player.stats.solo, {
  events: 2,
  wins: 2,
  podiums: 2,
  silver: 0,
  bronze: 0,
  points: 16,
  catches: 2,
  bestRank: 1,
});
assert.deepEqual(player.stats.squad, {
  events: 1,
  wins: 1,
  podiums: 1,
  silver: 0,
  bronze: 0,
  points: 4,
  catches: 1,
  bestRank: 1,
});
assert.equal(player.history.find((x) => x.eventId === "s").teamName, "Alpha");
assert.equal(player.history.find((x) => x.eventId === "live").points, null);
assert.equal(
  player.history.find((x) => x.eventId === "a").recordedUsername,
  "OldUser",
);
assert.equal(
  directory.find((x) => x.profile.robloxId === "222").stats.squad.points,
  20,
);
assert.equal(
  directory.find((x) => x.profile.robloxId === "333").stats.squad.silver,
  1,
);
assert.equal(
  findDirectoryPlayers(directory, "@olduser", "all", "name").length,
  2,
);
assert.deepEqual(
  findDirectoryPlayers(directory, "123", "squad", "wins").map(
    (x) => x.profile.robloxId,
  ),
  ["123"],
);
assert.equal(
  findDirectoryPlayers(directory, "PrivateOnly", "all", "name").length,
  0,
);
assert.equal(
  findDirectoryPlayers(directory, "", "solo", "wins")[0].profile.robloxId,
  "123",
);
assert.equal(playerHref("123"), "/pemain/id/123");
assert.equal(
  resolveLegacyHistory([a, b], profileMap, "OldUser").redirectId,
  "123",
);
const ambiguous = resolveLegacyHistory(events, profileMap, "OldUser");
assert.equal(ambiguous.redirectId, null);
assert.deepEqual(ambiguous.ids.sort(), ["123", "999"]);
assert.equal(ambiguous.unlinked.length, 1);
const champions = identitySoloChampions(events, profileMap);
assert.deepEqual(
  champions.map((x) => [x.key, x.wins]),
  [
    ["id:123", 2],
    ["id:999", 1],
    ["legacy:olduser", 1],
    ["legacy:stalename", 1],
  ],
);
assert.equal(resultRows(a)[0].id, "p1"); // historical tie podium preserved
assert.equal(JSON.stringify(events), before);
(async () => {
  let reads = 0,
    args;
  pool = {
    query: async (sql, values) => {
      reads++;
      args = values;
      assert.match(sql, /SELECT/);
      return { rows };
    },
  };
  const projected = await publicAvatarProfiles(events);
  assert.equal(reads, 1);
  assert.ok(!args[0].includes("hidden"));
  assert.ok(!args[0].includes("trash"));
  assert.deepEqual(
    buildPlayerDirectory(events, projected)
      .map((x) => x.profile.robloxId)
      .sort(),
    directory.map((x) => x.profile.robloxId).sort(),
  );
  let unavailable = false;
  pool = {
    query: async () => {
      throw Error("offline");
    },
  };
  assert.deepEqual(
    await publicAvatarProfiles(events, () => {
      unavailable = true;
    }),
    {},
  );
  assert.ok(unavailable);
  for (const f of [
    "app/pemain/page.tsx",
    "app/pemain/id/[robloxId]/page.tsx",
    "app/pemain/[username]/page.tsx",
  ]) {
    assert.match(source(f), /publicEvents\(\)/);
    assert.match(source(f), /await publicAvatarProfiles\(/);
    assert.match(source(f), /identityUnavailable/);
  }
  assert.match(
    source("app/pemain/id/[robloxId]/page.tsx"),
    /validRobloxId\(robloxId\)/,
  );
  assert.match(
    source("app/pemain/id/[robloxId]/page.tsx"),
    /if \(!player\) notFound\(\)/,
  );
  assert.match(
    source("app/hall-of-fame/page.tsx"),
    /identityUnavailable\s*\?\s*\[\]\s*:\s*identitySoloChampions/,
  );
  assert.match(source("components/public-header.tsx"), /href: "\/pemain"/);
  assert.match(source("components/player-avatar.tsx"), /publicLinks = false/);
  assert.match(source("components/player-avatar.tsx"), /prefetch=\{false\}/);
  assert.match(
    source("components/public-site.tsx"),
    /AvatarScope profiles=\{profiles\} publicLinks/,
  );
  assert.doesNotMatch(
    source("lib/player-directory.ts"),
    /fetch\(|getDatabasePool|INSERT|UPDATE|DELETE/,
  );
  console.log(
    "PASS: V3.2C stable Roblox IDs, name reuse, historical podium, SOLO/SQUAD contributions, reversed catches, private/Trash/stale exclusion, duplicate protection, unlinked history isolation, read failure, navigation and immutable scores",
  );
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

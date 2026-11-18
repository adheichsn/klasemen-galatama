/* V2.10: final results, SOLO identity, SQUAD separation, safe CSV, privacy. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const cache = {};
function load(rel) {
  const file = path.resolve(root, rel);
  if (cache[file]) return cache[file].exports;
  const transpiled = ts.transpileModule(fs.readFileSync(file, "utf8"), {
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
      ? load(path.join(path.dirname(file), `${name}.ts`))
      : require(name);
  mod._compile(transpiled, file);
  return mod.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const {
  finalEvents,
  allTimeSoloChampions,
  resultRows,
  playerHistory,
  normalizedRobloxUsername,
  exportResultsCsv,
} = load("lib/tournament-results.ts");
const participant = (id, username, squadId = null) => ({
  id,
  name: id,
  username,
  checkedIn: true,
  squadId,
});
function make(id, mode, users = []) {
  const event = newEvent(id, mode);
  event.id = id;
  event.status = "finished";
  event.published = true;
  event.finishedAt = `2026-11-${id.endsWith("2") ? "18" : "17"}T12:00:00.000Z`;
  event.participants = users;
  return event;
}
const a = make("solo1", "solo", [
  participant("Alpha", "Sample_123"),
  participant("Bravo", "bravo"),
]);
a.entries = [
  {
    id: "c1",
    participantId: "Alpha",
    kind: "catch",
    delta: 7,
    createdAt: "2026-11-18T12:00:00Z",
    fishName: "Blob",
    fishId: "f",
    quantity: 1,
    basePoints: 1,
    bonuses: [{ id: "b", name: "Mutation", points: 6 }],
  },
  {
    id: "adj",
    participantId: "Alpha",
    kind: "manual",
    delta: 2,
    description: "",
    createdAt: "2026-11-18T12:00:10Z",
  },
  {
    id: "br",
    participantId: "Bravo",
    kind: "catch",
    delta: 3,
    description: "",
    createdAt: "2026-11-18T12:00:11Z",
  },
];
const b = make("solo2", "solo", [
  participant("New Display", "@SAMPLE_123"),
  participant("Other", "bravo"),
]);
b.entries = [
  {
    id: "z",
    participantId: "New Display",
    kind: "catch",
    delta: 5,
    createdAt: "2026-11-18T12:00:00Z",
  },
  {
    id: "oth",
    participantId: "Other",
    kind: "catch",
    delta: 10,
    createdAt: "2026-11-18T12:00:00Z",
  },
];
const s = make("squad1", "squad", [participant("Alpha", "Sample_123", "s1")]);
s.squads = [{ id: "s1", name: "Best Squad", color: "#ffffff" }];
s.entries = [
  {
    id: "team",
    participantId: "Alpha",
    squadId: "s1",
    kind: "catch",
    delta: 100,
    createdAt: "2026-11-18T12:00:00Z",
  },
];
const hidden = {
  ...a,
  id: "hidden",
  published: false,
  trashedAt: "2026-11-18T13:00:00Z",
};
const draft = { ...a, id: "draft", status: "draft" };
assert.deepEqual(
  finalEvents([draft, s, hidden, a, b]).map((e) => e.id),
  ["solo2", "solo1", "squad1"],
);
assert.equal(normalizedRobloxUsername(" @SAMPLE_123 "), "sample_123");
assert.equal(normalizedRobloxUsername("invalid name"), null);
const rank = resultRows(a);
assert.equal(rank[0].points, 9);
assert.equal(rank[0].rank, 1);
assert.equal(resultRows(s)[0].members[0].points, 100);
// Legacy roster transfer: scoring must remain with the original squad.
const moved = {
  ...s,
  squads: [...s.squads, { id: "s2", name: "New Squad", color: "#fff" }],
  participants: [participant("Alpha", "Sample_123", "s2")],
};
assert.equal(
  resultRows(moved)
    .find((r) => r.id === "s1")
    .members.find((m) => m.id === "Alpha").points,
  100,
);
assert.equal(
  resultRows(moved)
    .find((r) => r.id === "s2")
    .members.find((m) => m.id === "Alpha").points,
  0,
);

const allTime = allTimeSoloChampions([a, b, s, hidden, draft]);
assert.equal(allTime.find((p) => p.username === "sample_123").wins, 1);
assert.equal(allTime.find((p) => p.username === "sample_123").podiums, 2);
assert.equal(allTime.find((p) => p.username === "sample_123").appearances, 2);
assert.equal(playerHistory([a, b, s, hidden, draft], "sample_123").length, 2);
assert.equal(playerHistory([a, b, s], "invalid name").length, 0);
const csv = exportResultsCsv(a, "standings");
assert.ok(csv.startsWith("\uFEFF"));
assert.match(csv, /"Sample_123"/);
assert.match(csv, /"9"|,9,/); // integer exported as numeric
const malicious = {
  ...a,
  title: '=HYPERLINK("https://evil.example")',
  participants: [participant("=1+1", "evil123")],
};
const safeCsv = exportResultsCsv(malicious, "standings");
assert.ok(safeCsv.includes(`"'=HYPERLINK(`));
assert.ok(safeCsv.includes(`"'=1+1"`));
const ledger = exportResultsCsv(a, "ledger");
assert.match(ledger, /Blob/);
assert.match(ledger, /Mutation: 6/);
assert.match(ledger, /Jum(lah)?/); // fixed header
for (const rel of [
  "app/turnamen/[id]/hasil/page.tsx",
  "app/pemain/[username]/page.tsx",
  "app/hall-of-fame/page.tsx",
]) {
  assert.ok(fs.existsSync(path.join(root, rel)), `${rel} exists`);
  assert.match(
    fs.readFileSync(path.join(root, rel), "utf8"),
    /publicEvents\(\)/,
  );
}
const resultPage = fs.readFileSync(
  path.join(root, "app/turnamen/[id]/hasil/page.tsx"),
  "utf8",
);
assert.match(resultPage, /e.status === "finished"/);
assert.match(resultPage, /notFound\(\)/);
const route = fs.readFileSync(
  path.join(root, "app/api/admin/results/[id]/route.ts"),
  "utf8",
);
assert.match(route, /isAdminAuthenticated\(\)/);
assert.match(route, /event.status !== "finished"/);
assert.match(route, /no-store/);
assert.ok(!route.includes("getPublicEvents"));
console.log(
  "PASS: V2.10 finalized results, multi-edition SOLO history, SQUAD isolation, CSV export, auth/privacy gates",
);

async function checkExportRoute() {
  const file = path.join(root, "app/api/admin/results/[id]/route.ts");
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  let authenticated = false;
  let storedEvent = a;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = (name) =>
    ({
      "next/server": {
        NextResponse: {
          json(payload, options = {}) {
            return {
              status: options.status || 200,
              body: payload,
              headers: new Headers(options.headers),
            };
          },
        },
      },
      "@/lib/auth": { isAdminAuthenticated: async () => authenticated },
      "@/lib/db": {
        getArenaSnapshot: async () => ({ data: { events: [storedEvent] } }),
      },
      "@/lib/tournament-results": { exportResultsCsv },
    })[name] || require(name);
  m._compile(js, file);
  const request = (type = "standings") => ({
    nextUrl: new URL(
      `http://localhost:3000/api/admin/results/solo1?type=${type}`,
    ),
  });
  const params = { params: Promise.resolve({ id: "solo1" }) };
  assert.equal(
    (await m.exports.GET(request(), params)).status,
    401,
    "anon must be denied",
  );
  authenticated = true;
  assert.equal(
    (await m.exports.GET(request("bad"), params)).status,
    400,
    "unrecognized format denied",
  );
  storedEvent = { ...a, trashedAt: "2026-11-18T00:00:00Z" };
  assert.equal(
    (await m.exports.GET(request(), params)).status,
    404,
    "trashed event denied",
  );
  storedEvent = { ...a, status: "live" };
  assert.equal(
    (await m.exports.GET(request(), params)).status,
    404,
    "non-final event denied",
  );
  storedEvent = a;
  const result = await m.exports.GET(request(), params);
  assert.equal(result.status, 200);
  assert.match(result.headers.get("Content-Type"), /text\/csv/);
  assert.match(result.headers.get("Cache-Control"), /no-store/);
  assert.match(result.headers.get("Content-Disposition"), /attachment/);
  assert.match(await result.text(), /Sample_123/);
  console.log(
    "PASS: V2.10 authenticated CSV route, 401/400/404, final-only, private no-store download",
  );
}
checkExportRoute().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

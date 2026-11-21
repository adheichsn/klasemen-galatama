/** V3.2G: behavioral projection, security health, pool error and SSE disabled tests. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const { EventEmitter } = require("node:events");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
function load(rel, mocks = {}) {
  const file = path.join(root, rel),
    m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = (name) => (name in mocks ? mocks[name] : require(name));
  m._compile(
    ts.transpileModule(read(rel), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.CommonJS,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const { newEvent } = load("lib/arena-data.ts");
const { standings } = load("lib/arena-utils.ts");
const { projectPublicEvents } = load("lib/public-event-projection.ts");
const { sameOrigin, readLimitedText } = load("lib/request-security.ts");
const names = [
  "state",
  "audit",
  "assets",
  "score_audit",
  "event_audit",
  "login_limits",
  "players",
  "player_links",
  "identity_audit",
].map((s) => "weji_arena_" + s);
const sql = read("db/migrations/032g_server_only_tables.sql"),
  schema = read("db/schema.sql");
for (const name of names) {
  assert.ok(
    sql.includes(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;`),
  );
  assert.ok(
    schema.includes(`ALTER TABLE public.${name} ENABLE ROW LEVEL SECURITY;`),
  );
}
assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.%I FROM PUBLIC/);
assert.match(sql, /ARRAY\['anon', 'authenticated', 'service_role'\]/);
assert.doesNotMatch(
  sql,
  /\b(DROP TABLE|TRUNCATE TABLE|DELETE FROM|UPDATE public\.|FORCE ROW LEVEL SECURITY)\b/i,
);
assert.ok(sql.startsWith("BEGIN;") && sql.trim().endsWith("COMMIT;"));
for (const mode of ["solo", "duo", "squad"]) {
  const event = {
    ...newEvent("Final", mode),
    published: true,
    status: "finished",
    internal: "PRIVATE_SENTINEL",
    participants: [
      {
        id: "a",
        name: "A",
        username: "Aplayer",
        checkedIn: true,
        squadId: mode === "solo" ? null : "s",
        private: "PRIVATE_SENTINEL",
      },
      {
        id: "b",
        name: "B",
        username: "Bplayer",
        checkedIn: true,
        squadId: mode === "solo" ? null : "s",
      },
    ],
    squads:
      mode === "solo" ? [] : [{ id: "s", name: "Team", color: "#ffffff" }],
    entries: [
      {
        id: "x",
        participantId: "a",
        squadId: mode === "solo" ? null : "s",
        kind: "catch",
        delta: 3,
        quantity: 1,
        basePoints: 1,
        fishName: "Fish",
        description: "PRIVATE_SENTINEL",
        catchRef: "PRIVATE_SENTINEL",
        bonuses: [
          { id: "m", name: "Mutation", points: 2, private: "PRIVATE_SENTINEL" },
        ],
        createdAt: "2026-11-18T12:00:00Z",
      },
      {
        id: "y",
        participantId: "b",
        squadId: mode === "solo" ? null : "s",
        kind: "manual",
        delta: 2,
        description: "PRIVATE_SENTINEL",
        createdAt: "2026-11-18T12:01:00Z",
      },
    ],
  };
  const before = JSON.stringify(event);
  const publicEvents = projectPublicEvents([
    event,
    { ...event, id: "private", published: false },
    { ...event, id: "trash", trashedAt: "2026-11-20" },
  ]);
  assert.equal(publicEvents.length, 1);
  assert.ok(!JSON.stringify(publicEvents).includes("PRIVATE_SENTINEL"));
  assert.equal(publicEvents[0].entries[0].description, "Fish + Mutation");
  assert.equal(publicEvents[0].entries[1].description, "");
  assert.deepEqual(
    standings(publicEvents[0]).map((x) => [x.id, x.points]),
    standings(event).map((x) => [x.id, x.points]),
  );
  assert.equal(JSON.stringify(event), before);
}
const makeReq = (origin, body = "abc") => ({
  headers: new Headers(origin ? { origin } : {}),
  nextUrl: new URL("https://example.test/admin"),
  body: new Response(body).body,
});
assert.equal(sameOrigin(makeReq("https://example.test")), true);
assert.equal(sameOrigin(makeReq("https://evil.test")), false);
assert.equal(sameOrigin(makeReq("http://example.test")), false);
assert.equal(sameOrigin(makeReq(null)), false);
let secure = true,
  bytes = 0,
  logs = [];
class Pool extends EventEmitter {
  async query(s) {
    if (s.includes("to_regclass"))
      return {
        rows: [
          {
            state_ready: true,
            audit_ready: true,
            assets_ready: true,
            score_audit_ready: true,
            event_audit_ready: true,
            login_limits_ready: true,
            players_ready: true,
            player_links_ready: true,
            identity_audit_ready: true,
          },
        ],
      };
    if (s.includes("pg_class"))
      return {
        rows: names.map((name, i) => ({
          name,
          rls: secure || i !== 0,
          api_access: !secure && i === 0,
        })),
      };
    if (s.includes("octet_length"))
      return { rows: [{ snapshot_bytes: bytes }] };
    throw Error("unexpected query");
  }
  async end() {}
}
const { getDatabaseHealth, getDatabasePool } = load("lib/db.ts", {
  "server-only": {},
  pg: { Pool },
  "@/lib/arena-data": { initialArena: () => ({}) },
  "@/lib/match-operations": {},
  "@/lib/score-integrity": {},
  "@/lib/event-lifecycle": {},
  "@/lib/banner": {},
  "@/lib/public-changes": {},
  "./server-errors": { logServerFailure: (...args) => logs.push(args) },
  "./public-event-projection": { projectPublicEvents },
});
const run = async () => {
  assert.equal(await readLimitedText(makeReq(null, "é"), 2), "é");
  assert.equal(await readLimitedText(makeReq(null, "é"), 1), null);
  process.env.DATABASE_URL = "postgresql://fake:fake@localhost:5432/test";
  assert.equal((await getDatabaseHealth()).ready, true);
  secure = false;
  assert.equal((await getDatabaseHealth()).ready, false);
  secure = true;
  bytes = 3_100_000;
  assert.equal((await getDatabaseHealth()).snapshotSizeWarning, true);
  getDatabasePool().emit("error", new Error("simulated idle error"));
  assert.equal(logs[0][0], "database-idle-pool");
  let subscribed = false;
  const { GET } = load("app/api/public/stream/route.ts", {
    "@/lib/db": { getPublicEvents: async () => [{ id: "public" }] },
    "@/lib/public-broker": {
      listenerDatabaseUrl: () => null,
      subscribePublicChanges: () => {
        subscribed = true;
      },
    },
    "@/lib/public-changes": {
      validPublicEventId: (v) => typeof v === "string" && v.length > 0,
    },
  });
  const req = (id) => ({
    nextUrl: new URL(`https://example.test/api/public/stream?eventId=${id}`),
    signal: new AbortController().signal,
  });
  assert.equal((await GET(req("public"))).status, 204);
  assert.equal((await GET(req("private"))).status, 404);
  assert.equal(subscribed, false);
  assert.match(read("components/public-auto-refresh.tsx"), /!streamingEnabled/);
  for (const f of [
    "app/turnamen/[id]/page.tsx",
    "app/turnamen/[id]/statistik/page.tsx",
    "app/spectate/[id]/page.tsx",
  ])
    assert.match(read(f), /streamingEnabled=\{!!listenerDatabaseUrl\(\)\}/);
  // Every admin route except login/logout/compat alias must perform session auth.
  for (const f of [
    "assets",
    "audit",
    "events",
    "health",
    "historical",
    "player-identity",
    "results/[id]",
    "state",
  ])
    assert.match(
      read(`app/api/admin/${f}/route.ts`),
      /await isAdminAuthenticated\(\)/,
    );
  console.log(
    "PASS: V3.2G public projection and score parity, RLS migration assertions, mocked health diagnostics, idle pool error, polling-only SSE, origin and byte limits, auth route audit",
  );
};
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

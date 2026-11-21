/* V2.8.1: deterministic policies plus an actual ReadableStream SSE route with mocks. */
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
function load(rel, mocks = {}) {
  const file = path.join(root, rel);
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = (id) => (id in mocks ? mocks[id] : require(id));
  m._compile(js, file);
  return m.exports;
}
const policy = load("lib/realtime-policy.ts");
assert.equal(policy.reconnectDelay(0, 0.5), 1000);
assert.equal(policy.reconnectDelay(1, 0.5), 2000);
assert.equal(policy.reconnectDelay(10, 0.5), 30000);
assert.equal(policy.reconnectDelay(0, 0), 750);
assert.equal(policy.reconnectDelay(0, 1), 1250);
assert.equal(policy.makeClockAnchor(2000, 100, 200).serverAtMs, 2050);
assert.equal(policy.makeClockAnchor(2000, 100, 200).observedMonoMs, 200);
assert.equal(
  policy.clockFromAnchor({ serverAtMs: 2050, observedMonoMs: 200 }, 5100),
  6950,
);
assert.equal(
  policy.clockFromAnchor({ serverAtMs: 2050, observedMonoMs: 200 }, 190),
  2050,
);
assert.equal(
  policy.makeClockAnchor(1000, 0, 10001),
  null,
  "reject slow time samples",
);
assert.equal(policy.makeClockAnchor(NaN, 0, 100), null);

const client = fs.readFileSync(
  path.join(root, "components/public-auto-refresh.tsx"),
  "utf8",
);
assert.match(
  client,
  /(?:window\.)?setInterval\(\s*\(\)\s*=>\s*queueRefresh\(0\)/,
);
assert.match(client, /visibilitychange/);
assert.match(client, /next\.onerror = retry/);
assert.match(client, /addEventListener\("connected"/);
assert.match(client, /addEventListener\("degraded"/);
assert.match(client, /queueRefresh\(0\)/);
const clock = fs.readFileSync(
  path.join(root, "components/live-match-clock.tsx"),
  "utf8",
);
assert.match(clock, /performance\.now\(\)/);
assert.match(clock, /makeClockAnchor/);
assert.match(clock, /syncSequence/);
const broker = fs.readFileSync(path.join(root, "lib/public-broker.ts"), "utf8");
assert.match(broker, /LISTEN/);
assert.match(broker, /query\("SELECT 1"\)/);
assert.match(broker, /broadcastStatus\(false\)/);
assert.match(broker, /reconnectSoon/);

async function exerciseStream() {
  let listener = () => {};
  let status = () => {};
  let unsubscribed = 0;
  let visibility = true;
  const { GET } = load("app/api/public/stream/route.ts", {
    "@/lib/db": {
      getPublicEvents: async () => (visibility ? [{ id: "public-1" }] : []),
    },
    "@/lib/public-broker": {
      listenerDatabaseUrl: () => "postgresql://test:5432/test",
      subscribePublicChanges(onUpdate, onStatus) {
        listener = onUpdate;
        status = onStatus;
        onStatus(false);
        return () => {
          unsubscribed++;
        };
      },
    },
    "@/lib/public-changes": {
      validPublicEventId: (v) =>
        typeof v === "string" && v.length > 0 && v.length <= 128,
    },
  });
  const makeRequest = (id, controller) => ({
    nextUrl: new URL(`http://localhost/api/public/stream?eventId=${id}`),
    signal: controller.signal,
  });
  const controller = new AbortController();
  const response = await GET(makeRequest("public-1", controller));
  assert.equal(response.status, 200);
  assert.match(response.headers.get("Content-Type"), /text\/event-stream/);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  assert.match(decoder.decode((await reader.read()).value), /retry: 2000/);
  assert.match(decoder.decode((await reader.read()).value), /event: degraded/);
  status(true);
  assert.match(decoder.decode((await reader.read()).value), /event: connected/);
  listener("another-event");
  listener("public-1");
  assert.match(decoder.decode((await reader.read()).value), /event: update/);
  status(false);
  assert.match(decoder.decode((await reader.read()).value), /event: degraded/);
  controller.abort();
  const end = await reader.read();
  assert.equal(end.done, true);
  assert.equal(unsubscribed, 1, "abort unsubscribes from broker");
  visibility = false;
  const hidden = await GET(makeRequest("public-1", new AbortController()));
  assert.equal(
    hidden.status,
    404,
    "private or removed event cannot open a stream",
  );
}
exerciseStream().then(
  () =>
    console.log(
      "PASS: V2.8.1 backoff, monotonic clock, SSE live/degraded/update/abort, private-event isolation, fallback wiring",
    ),
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);

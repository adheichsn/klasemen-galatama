// WEJI ARENA V3.0: single-admin, durable login throttle and safe deployment checks.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
function loadPure(rel) {
  const file = path.join(root, rel);
  const js = ts.transpileModule(read(rel), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const m = new Module(file, module);
  m.filename = file;
  m.paths = Module._nodeModulePaths(path.dirname(file));
  m._compile(js, file);
  return m.exports;
}
const {
  loginClientBucket,
  LOGIN_GLOBAL_LIMIT,
  LOGIN_PER_CLIENT_LIMIT,
  LOGIN_WINDOW_MINUTES,
} = loadPure("lib/login-throttle-core.ts");
assert.equal(LOGIN_PER_CLIENT_LIMIT, 8);
assert.equal(LOGIN_GLOBAL_LIMIT, 300);
assert.equal(LOGIN_WINDOW_MINUTES, 15);
const headers = {
  get(name) {
    return name === "x-forwarded-for" ? "203.0.113.1, 10.0.0.5" : null;
  },
};
const secret = "test-secret-".repeat(5);
const vercel = loginClientBucket(headers, secret, true);
const unverified = loginClientBucket(headers, secret, false);
assert.notEqual(vercel, unverified);
assert.equal(loginClientBucket(headers, secret, true), vercel);
assert.equal(
  loginClientBucket({ get: () => "not-an-ip" }, secret, true),
  unverified,
);
assert.notEqual(loginClientBucket(headers, secret + "changed", true), vercel);
assert.ok(!vercel.includes("203.0.113.1"));
const { configuredSessionSecret, generateSession, verifySession } =
  loadPure("lib/auth-core.ts");
const prev = {
  WEJI_SESSION_SECRET: process.env.WEJI_SESSION_SECRET,
  WEJI_ADMIN_PASSWORD_HASH: process.env.WEJI_ADMIN_PASSWORD_HASH,
};
try {
  process.env.WEJI_SESSION_SECRET = "A".repeat(64);
  process.env.WEJI_ADMIN_PASSWORD_HASH = "hash-first";
  const first = configuredSessionSecret();
  const token = generateSession(first, Date.UTC(2026, 10, 18));
  assert.ok(verifySession(token, first, Date.UTC(2026, 10, 18)));
  process.env.WEJI_ADMIN_PASSWORD_HASH = "hash-changed";
  assert.ok(
    !verifySession(token, configuredSessionSecret(), Date.UTC(2026, 10, 18)),
  );
} finally {
  for (const key of Object.keys(prev)) {
    if (prev[key] === undefined) delete process.env[key];
    else process.env[key] = prev[key];
  }
}
const schema = read("db/schema.sql");
assert.match(schema, /CREATE TABLE IF NOT EXISTS weji_arena_login_limits/);
assert.doesNotMatch(schema, /DROP TABLE|TRUNCATE TABLE/i);
const throttle = read("lib/login-throttle.ts");
assert.match(throttle, /ON CONFLICT \(bucket\) DO UPDATE/);
assert.match(throttle, /BEGIN/);
assert.match(throttle, /COMMIT/);
assert.match(throttle, /LOGIN_GLOBAL_LIMIT/);
assert.match(throttle, /LOGIN_PER_CLIENT_LIMIT/);
assert.match(
  throttle,
  /DELETE FROM weji_arena_login_limits WHERE bucket = \$1/,
);
const login = read("app/api/admin/login/route.ts");
assert.match(login, /chargeLoginAttempt\(req, sessionSecret\)/);
assert.ok(
  login.indexOf("chargeLoginAttempt") <
    login.indexOf("verifyAdminCredentials(value.username"),
);
assert.match(login, /status: 429/);
assert.match(login, /Retry-After/);
assert.match(login, /sameSite: "strict"/);
assert.match(login, /configuredSessionSecret/);
const health = read("app/api/admin/health/route.ts");
assert.match(health, /isAdminAuthenticated\(\)/);
assert.match(health, /getDatabaseHealth\(\)/);
const session = read("lib/auth.ts");
assert.match(session, /configuredSessionSecret\(\)/);
const db = read("lib/db.ts");
assert.match(db, /getDatabaseHealth/);
assert.match(db, /__wejiPoolFingerprint/);
assert.match(db, /max: process.env.NODE_ENV === "production" \? 2 : 5/);
const listener = read("lib/public-broker.ts");
assert.match(listener, /WEJI_LISTEN_DATABASE_URL/);
assert.match(listener, /\.port === "6543"/);
const config = read("next.config.ts");
assert.match(config, /Strict-Transport-Security/);
assert.match(config, /Content-Security-Policy/);
assert.match(config, /\/api\/admin\/:path\*/);
assert.ok(fs.existsSync(path.join(root, "docs/UPGRADE_V3_0.md")));
assert.ok(fs.existsSync(path.join(root, "scripts/preflight.cjs")));
console.log(
  "PASS: V3.0 single-admin session rotation, hashed client buckets, durable atomic rate limiting, protected DB health, connection pool and deployment config.",
);

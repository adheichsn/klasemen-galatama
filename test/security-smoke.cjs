// Dependency-free auth and authorization smoke assertions.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = (() => {
  try {
    return require("typescript");
  } catch {
    return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
  }
})();
const vm = require("node:vm");
const file = fs.readFileSync(
  require("node:path").join(__dirname, "../lib/auth-core.ts"),
  "utf8",
);
const src = ts.transpileModule(file, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const m = { exports: {} };
vm.runInNewContext(src, {
  require,
  Buffer,
  module: m,
  exports: m.exports,
  process,
  Date,
});
const { generateSession, verifySession, verifyPassword } = m.exports;
const secret = "safe-".repeat(10);
const now = Date.UTC(2026, 10, 16, 0, 0, 0);
const token = generateSession(secret, now);
assert.equal(verifySession(token, secret, now), true);
assert.equal(verifySession(token, "different-".repeat(8), now), false);
assert.equal(verifySession(token.slice(0, -2) + "xx", secret, now), false);
assert.equal(verifySession(token, secret, now + 13 * 60 * 60 * 1000), false);
assert.equal(verifySession("bad", secret, now), false);
const { scryptSync } = require("node:crypto");
const salt = "a".repeat(48);
const hash =
  salt +
  ":" +
  scryptSync("some-strong-password-2026", salt, 64, {
    maxmem: 64 * 1024 * 1024,
  }).toString("hex");
assert.equal(verifyPassword("some-strong-password-2026", hash), true);
assert.equal(verifyPassword("wrong", hash), false);
for (const route of [
  "app/api/admin/state/route.ts",
  "app/admin/(protected)/layout.tsx",
]) {
  const content = fs.readFileSync(
    require("node:path").join(__dirname, "..", route),
    "utf8",
  );
  assert.match(
    content,
    /isAdminAuthenticated/,
    "admin auth required in " + route,
  );
}
const publicPage = fs.readFileSync(
  require("node:path").join(__dirname, "../app/page.tsx"),
  "utf8",
);
assert.doesNotMatch(
  publicPage,
  /<ArenaApp/,
  "public homepage must never mount admin app",
);
console.log(
  "PASS: signed sessions, password hashing, server authorization gates, public/admin page separation",
);

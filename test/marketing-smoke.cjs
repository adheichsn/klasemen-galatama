// Tests marketing metadata compatibility with legacy events without npm dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
}
function transpile(file, inject = {}) {
  const script = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../", file), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const module = { exports: {} };
  vm.runInNewContext(
    script,
    {
      require: (name) => {
        if (name === "./arena-data") return { newId: () => "id" };
        if (name === "./banner") return inject;
        throw Error(name);
      },
      exports: module.exports,
      module,
      URL,
    },
    { filename: file },
  );
  return module.exports;
}
const banner = transpile("lib/banner.ts");
assert.equal(banner.validBannerUrl(""), true);
assert.equal(banner.validBannerUrl("https://cdn.example.com/event.png"), true);
assert.equal(
  banner.validBannerUrl("/api/assets/123e4567-e89b-42d3-a456-426614174000"),
  true,
);
for (const bad of [
  "javascript:alert(1)",
  "data:image/svg+xml,<svg>",
  "http://cdn.example.com",
  "//evil.example",
  "/api/admin/state",
  "https://user:pass@example.org/c.png",
  'https://cdn.example.com/a")',
  "https://example.org/" + "a".repeat(700),
]) {
  assert.equal(banner.validBannerUrl(bad), false, `reject ${bad.slice(0, 40)}`);
}
const original = fs.readFileSync(
  path.join(__dirname, "../lib/arena-storage.ts"),
  "utf8",
);
assert.match(original, /e\.bannerUrl !== undefined/);
assert.match(original, /e\.featured !== undefined/);
const sql = fs.readFileSync(path.join(__dirname, "../db/schema.sql"), "utf8");
assert.match(sql, /CREATE TABLE IF NOT EXISTS weji_arena_assets/);
const upload = fs.readFileSync(
  path.join(__dirname, "../app/api/admin/assets/route.ts"),
  "utf8",
);
assert.match(upload, /isAdminAuthenticated/);
assert.match(upload, /sameOrigin/);
assert.match(upload, /MAX_FILE/);
console.log(
  "PASS: banner URL rules, backward compatibility, migration, authenticated asset API",
);

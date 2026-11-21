/** Tests V2.4 presentation-only readiness + safe CSS architecture, no npm dependencies. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = (() => {
  try {
    return require("typescript");
  } catch {
    return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
  }
})();
const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(
  path.join(root, "lib/tournament-readiness.ts"),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  fileName: "tournament-readiness.ts",
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", compiled)(
  mod,
  mod.exports,
  (name) => {
    if (name !== "./arena-rules") return require(name);
    const dep = { exports: {} };
    const js = ts.transpileModule(
      fs.readFileSync(path.join(root, "lib/arena-rules.ts"), "utf8"),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } },
    ).outputText;
    new Function("module", "exports", "require", js)(dep, dep.exports, require);
    return dep.exports;
  },
);
const { tournamentReadiness } = mod.exports;
const base = {
  title: "Galatama custom",
  mode: "solo",
  fish: [],
  bonuses: [],
  bannerUrl: "",
  featured: false,
  writtenRules: [],
  participants: [],
  squads: [],
  faqs: [],
};
assert.equal(
  tournamentReadiness(base).canStart,
  false,
  "No roster and fish => cannot start",
);
assert.equal(
  tournamentReadiness({ ...base, fish: [{ id: "f", enabled: true }] }).canStart,
  false,
);
const solo = {
  ...base,
  fish: [{ id: "f", enabled: true }],
  participants: [{ id: "p", squadId: null }],
};
assert.equal(
  tournamentReadiness(solo).canStart,
  true,
  "SOLO only needs a valid fish and participant",
);
const squadMissing = { ...solo, mode: "squad" };
assert.equal(
  tournamentReadiness(squadMissing).canStart,
  false,
  "SQUAD needs a team assignment",
);
const squadReady = {
  ...squadMissing,
  squads: [{ id: "a" }],
  participants: [{ id: "p", squadId: "a" }],
};
assert.equal(tournamentReadiness(squadReady).canStart, true);
assert.equal(
  tournamentReadiness({ ...squadReady, fish: [{ enabled: false }] }).canStart,
  false,
);
assert.equal(
  tournamentReadiness({
    ...squadReady,
    participants: [{ id: "p", squadId: "missing" }],
  }).canStart,
  false,
);
assert.equal(tournamentReadiness(squadReady).sections.participants, true);
assert.equal(tournamentReadiness(squadReady).sections.faq, false);
// CSS guard: globals stays foundational and legacy style is loaded only in protected layout.
const globalCss = fs.readFileSync(path.join(root, "app/globals.css"), "utf8");
const adminCss = fs.readFileSync(
  path.join(root, "styles/admin-interactions.css"),
  "utf8",
);
assert.ok(globalCss.split("\n").length < 160, "Global CSS must stay small");
assert.match(globalCss, /@import "tailwindcss"/);
assert.match(adminCss, /@media/);
const adminLayout = fs.readFileSync(
  path.join(root, "app/admin/(protected)/layout.tsx"),
  "utf8",
);
assert.match(adminLayout, /admin-interactions\.css/);
assert.doesNotMatch(
  fs.readFileSync(path.join(root, "app/layout.tsx"), "utf8"),
  /admin-interactions/,
);
const modal = fs.readFileSync(
  path.join(root, "components/arena-score-modal.tsx"),
  "utf8",
);
assert.match(modal, /Tambah & Lanjut/);
assert.match(modal, /Simpan ke Server/);
assert.match(modal, /calculateCatch/);
console.log(
  "PASS: v2.4 readiness SOLO/SQUAD, admin-scoped styles, fast input controls",
);

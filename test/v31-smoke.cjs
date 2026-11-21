// WEJI ARENA V3.1: pure filtering + source wiring; no database/network required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const base = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(base, relative), "utf8");
const file = path.join(base, "lib/marketplace-filters.ts");
const mod = new Module(file, module);
mod.filename = file;
mod._compile(
  ts.transpileModule(read("lib/marketplace-filters.ts"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText,
  file,
);
const { filterMarketplaceEvents } = mod.exports;
const fake = (id, title, mode, status, opts = {}) => ({
  id,
  title,
  mode,
  status,
  subtitle: opts.subtitle || "Fishing",
  location: opts.location || "Island",
  host: opts.host || "WEJI",
  featured: !!opts.featured,
  eventDate: opts.date || "2026-11-20",
  createdAt: opts.created || "2026-11-18",
  participantCount: opts.players || 0,
});
const events = [
  fake("a", "Planetary Observatory", "solo", "live", {
    featured: true,
    players: 3,
    location: "Observatory",
  }),
  fake("b", "Stonewood Night", "squad", "draft", {
    location: "Stonewood",
    players: 8,
  }),
  fake("c", "Fishing Day", "solo", "finished", {
    players: 5,
    host: "Festival",
  }),
];
const params = { query: "", mode: "all", status: "all", sort: "recommended" };
assert.deepEqual(
  filterMarketplaceEvents(events, params).map((e) => e.id),
  ["a", "b", "c"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, { ...params, mode: "squad" }).map(
    (e) => e.id,
  ),
  ["b"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, {
    ...params,
    status: "live",
    query: "OBSERVATORY",
  }).map((e) => e.id),
  ["a"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, { ...params, query: "festival" }).map(
    (e) => e.id,
  ),
  ["c"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, { ...params, sort: "participants" }).map(
    (e) => e.id,
  ),
  ["b", "c", "a"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, { ...params, sort: "alphabetical" }).map(
    (e) => e.id,
  ),
  ["c", "a", "b"],
);
assert.deepEqual(
  filterMarketplaceEvents(events, { ...params, query: "not found" }),
  [],
);
assert.deepEqual(
  events.map((e) => e.id),
  ["a", "b", "c"],
  "original list unchanged",
);
const home = read("app/page.tsx");
const catalog = read("components/marketplace-catalog.tsx");
const listing = read("app/turnamen/page.tsx");
const header = read("components/public-header.tsx");
const hero = read("components/featured-carousel.tsx");
assert.match(home, /publicEvents\(\)/);
assert.match(home, /FeaturedCarousel/);
assert.match(catalog, /filterMarketplaceEvents\(events/);
assert.match(catalog, /setQuery\(e.target.value\)/);
assert.match(catalog, /history\.replaceState/);
assert.match(catalog, /aria-pressed/);
assert.match(listing, /MarketplaceCatalog/);
assert.match(listing, /participantCount: event.participants.length/);
assert.match(listing, /topPoints: standings\(event\)/);
assert.doesNotMatch(listing, /entries: event.entries/);
assert.match(header, /aria-expanded=\{open\}/);
assert.match(header, /setOpen\(false\)/);
assert.match(hero, /useReducedMotion/);
assert.match(hero, /onTouchEnd/);
assert.match(hero, /aria-label=\{`Tampilkan banner/);
const types = read("lib/arena-types.ts");
assert.match(types, /type EventMode = "solo" \| "duo" \| "squad"/);
assert.doesNotMatch(catalog, /\/api\/admin|DATABASE_URL|WEJI_ADMIN_/);
assert.doesNotMatch(read("db/schema.sql"), /DROP TABLE|TRUNCATE TABLE/i);
console.log(
  "PASS: V3.1 marketplace filters, ordering, shareable URLs, responsive header, carousel navigation, public data boundaries",
);

/** V3.2F: crawler policy, visibility, metadata, JSON-LD, general copy and assets. */
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const ts = (() => {
  try {
    return require("typescript");
  } catch {
    return require("/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript");
  }
})();
const root = path.resolve(__dirname, "..");
const source = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const fixture = (id, status, published = true, extra = {}) => ({
  id,
  title: `Event ${id}`,
  subtitle: "Turnamen komunitas",
  location: "Planetary Observatory",
  mode: "duo",
  status,
  published,
  ...extra,
});
const events = [
  fixture("live", "live"),
  fixture("final", "finished", true, {
    bannerUrl: "/api/assets/123e4567-e89b-42d3-a456-426614174000",
  }),
  fixture("draft", "draft"),
  fixture("secret", "finished", false, { title: "PRIVATE TITLE" }),
  fixture("trash", "finished", true, {
    trashedAt: "2026-11-18",
    title: "TRASH TITLE",
  }),
];
let unavailable = false,
  identityUnavailable = false,
  eligibleIds;
const mocks = {
  "lib/public-events.ts": {
    publicEvents: async () => ({ events, unavailable }),
  },
  "lib/avatar-identity-db.ts": {
    publicAvatarProfiles: async (eligible, callback) => {
      eligibleIds = eligible.map((e) => e.id);
      if (identityUnavailable) callback();
      return {};
    },
  },
  "lib/player-directory.ts": {
    buildPlayerDirectory: (eligible) =>
      eligible.some((e) => e.id === "final")
        ? [
            {
              profile: {
                robloxId: "123",
                username: "fishplayer",
                displayName: "Fish Player",
              },
            },
          ]
        : [],
    playerHref: (id) => `/pemain/id/${id}`,
  },
};
const cache = new Map();
function load(rel) {
  const file = path.resolve(root, rel);
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (mocks[relative]) return mocks[relative];
  if (cache.has(file)) return cache.get(file).exports;
  const m = new Module(file, module);
  cache.set(file, m);
  m.filename = file;
  m.require = (name) =>
    name === "server-only"
      ? {}
      : name === "react"
        ? { cache: (fn) => fn }
        : name.startsWith("./")
          ? load(path.resolve(path.dirname(file), name + ".ts"))
          : name.startsWith("@/")
            ? load(name.slice(2) + ".ts")
            : require(name);
  m._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
  return m.exports;
}
const core = load("lib/seo-core.ts");
const {
  seoPolicy,
  parseSiteOrigin,
  sitemapPaths,
  serializeJsonLd,
  cleanSeoText,
} = core;
const prod = {
  VERCEL_ENV: "production",
  VERCEL_PROJECT_PRODUCTION_URL: "arena.example.com",
};
assert.deepEqual(seoPolicy(prod), {
  origin: "https://arena.example.com",
  index: true,
});
assert.deepEqual(
  seoPolicy({ ...prod, WEJI_SITE_URL: "https://custom.example.com/" }),
  { origin: "https://custom.example.com", index: true },
);
assert.equal(seoPolicy({ ...prod, VERCEL_ENV: "preview" }).index, false);
assert.equal(
  seoPolicy({
    NODE_ENV: "development",
    WEJI_SITE_URL: "https://custom.example.com",
  }).index,
  false,
);
assert.equal(seoPolicy({ NODE_ENV: "production" }).index, false);
assert.equal(seoPolicy({ ...prod, WEJI_SITE_URL: "not a url" }).index, false);
for (const bad of [
  "http://arena.example.com",
  "https://user:password@arena.example.com",
  "https://arena.example.com/path",
  "https://arena.example.com/?q=1",
  "https://arena.example.com/#hash",
  "https://127.0.0.1",
  "https://localhost",
  "https://arena.example.com:8080",
])
  assert.equal(parseSiteOrigin(bad), null, bad);
const paths = sitemapPaths(events, [
  "123",
  "123",
  "0",
  "../admin",
  "9999999999999999",
]);
assert.ok(paths.includes("/turnamen/live"));
assert.ok(paths.includes("/turnamen/live/statistik"));
assert.ok(!paths.includes("/turnamen/live/hasil"));
assert.ok(paths.includes("/turnamen/final/hasil"));
assert.equal(paths.filter((p) => p === "/pemain/id/123").length, 1);
for (const p of [
  "draft",
  "secret",
  "trash",
  "admin",
  "spectate",
  "9999999999999999",
])
  assert.ok(!paths.some((x) => x.includes(p)), p);
const payload = { name: "</script><script>alert(1)</script>\u2028" };
const output = serializeJsonLd(payload);
assert.ok(!output.includes("<"));
assert.deepEqual(JSON.parse(output), payload);
assert.equal(cleanSeoText("  hello\nworld ", 20), "hello world");
const { HERO_PHRASES, initialHeroFrame, nextHeroFrame } =
  load("lib/hero-copy.ts");
assert.equal(initialHeroFrame.length, HERO_PHRASES[0].length);
for (const phrase of HERO_PHRASES) {
  assert.match(phrase, /^[A-Za-z ]+$/);
  assert.doesNotMatch(phrase, /solo|duo|squad/i);
}
let frame = initialHeroFrame;
const seen = new Set();
for (let i = 0; i < 1000; i++) {
  const { next, delay } = nextHeroFrame(frame);
  assert.ok([30, 55, 180, 2500].includes(delay));
  assert.ok(next.length >= 0 && next.length <= HERO_PHRASES[next.index].length);
  if (next.length === HERO_PHRASES[next.index].length) seen.add(next.index);
  frame = next;
}
assert.equal(seen.size, HERO_PHRASES.length);
const { generalFaq } = load("lib/general-faq.ts");
assert.equal(generalFaq.length, 8);
assert.equal(new Set(generalFaq.map((q) => q.id)).size, 8);
assert.ok(generalFaq.every((q) => q.question && q.answer));
assert.doesNotMatch(
  JSON.stringify(generalFaq),
  /Mutasi|Shiny|Aurora|Meteor Shower|90 menit/i,
);
assert.match(source("app/page.tsx"), /generalFaq\.slice/);
assert.match(source("app/faq/page.tsx"), /questions=\{generalFaq\}/);
assert.doesNotMatch(source("app/faq/page.tsx"), /publicEvents|\.faqs/);
assert.match(source("app/turnamen/[id]/page.tsx"), /e\.faqs/);
assert.match(
  source("components/featured-carousel.tsx"),
  /HeroTypewriter paused=\{pausedByUser\}/,
);
assert.match(source("components/hero-typewriter.tsx"), /window\.clearTimeout/);
assert.match(
  source("styles/public-effects.css"),
  /prefers-reduced-motion: reduce/,
);
const png = fs.readFileSync(path.join(root, "public/weji-social.png"));
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
const ico = fs.readFileSync(path.join(root, "app/favicon.ico"));
assert.equal(ico.readUInt16LE(0), 0);
assert.equal(ico.readUInt16LE(2), 1);
assert.ok(ico.readUInt16LE(4) > 0);
(async () => {
  process.env.VERCEL_ENV = "production";
  process.env.WEJI_SITE_URL = "https://arena.example.com";
  const { pageMetadata } = load("lib/seo.ts"),
    { eventMetadata, playerMetadata } = load("lib/seo-server.ts");
  const { default: sitemap } = load("app/sitemap.ts"),
    { default: robots } = load("app/robots.ts");
  let meta = pageMetadata({
    title: core.HOME_TITLE,
    path: "/",
    absoluteTitle: true,
  });
  assert.equal(meta.alternates.canonical, "https://arena.example.com/");
  assert.equal(meta.robots.index, true);
  assert.equal(
    meta.openGraph.images[0].url,
    "https://arena.example.com/weji-social.png",
  );
  assert.match(meta.description, /Roblox.*Fish It/);
  meta = await eventMetadata("final", "hasil");
  assert.match(meta.title, /Hasil Final Event final/);
  assert.equal(
    meta.alternates.canonical,
    "https://arena.example.com/turnamen/final/hasil",
  );
  assert.equal(
    meta.openGraph.images[0].url,
    "https://arena.example.com/api/assets/123e4567-e89b-42d3-a456-426614174000",
  );
  for (const id of ["secret", "trash", "missing"]) {
    meta = await eventMetadata(id, "detail");
    assert.equal(meta.robots.index, false);
    assert.doesNotMatch(JSON.stringify(meta), /PRIVATE TITLE|TRASH TITLE/);
    assert.equal(meta.alternates, undefined);
  }
  assert.equal((await eventMetadata("draft", "detail")).robots.index, false);
  assert.equal((await eventMetadata("live", "hasil")).robots.index, false);
  meta = await playerMetadata("123");
  assert.match(meta.title, /fishplayer/);
  assert.equal(
    meta.alternates.canonical,
    "https://arena.example.com/pemain/id/123",
  );
  assert.deepEqual(eligibleIds, ["live", "final"]);
  assert.equal((await playerMetadata("999")).robots.index, false);
  const sitemapUrls = (await sitemap()).map((x) => x.url);
  assert.ok(sitemapUrls.includes("https://arena.example.com/pemain/id/123"));
  assert.ok(
    !sitemapUrls.some(
      (x) => x.includes("draft") || x.includes("secret") || x.includes("trash"),
    ),
  );
  assert.equal(robots().sitemap, "https://arena.example.com/sitemap.xml");
  identityUnavailable = true;
  await assert.rejects(sitemap(), /temporarily unavailable/);
  assert.equal((await playerMetadata("123")).robots.index, false);
  identityUnavailable = false;
  unavailable = true;
  assert.equal((await eventMetadata("final", "detail")).robots.index, false);
  await assert.rejects(sitemap(), /temporarily unavailable/);
  unavailable = false;
  process.env.VERCEL_ENV = "preview";
  assert.deepEqual(await sitemap(), []);
  assert.equal(robots().rules.disallow, "/");
  assert.equal(
    pageMetadata({ title: "Preview", path: "/" }).robots.index,
    false,
  );
  for (const f of [
    "app/turnamen/[id]/page.tsx",
    "app/turnamen/[id]/hasil/page.tsx",
    "app/turnamen/[id]/statistik/page.tsx",
    "app/pemain/id/[robloxId]/page.tsx",
  ])
    assert.match(source(f), /generateMetadata/);
  assert.match(source("next.config.ts"), /X-Robots-Tag/);
  assert.match(source("app/admin/login/page.tsx"), /index: false/);
  assert.match(source("app/pemain/[username]/page.tsx"), /nonIndexMetadata/);
  assert.match(source("app/spectate/[id]/page.tsx"), /index: false/);
  console.log(
    "PASS: V3.2F general FAQ, typewriter cycle, SEO origin/canonical/social assets, dynamic public metadata, noindex/private/Trash/Draft protection, sitemap/robots, outage handling, JSON-LD escaping",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = (() => { try { return require('typescript'); } catch { return require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); } })();
const root = path.resolve(__dirname, '..');
const source = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const cache = new Map();
let pool;
function load(rel) {
  if (cache.has(rel)) return cache.get(rel).exports;
  const file = path.resolve(root, rel), m = new Module(file, module);
  cache.set(rel, m); m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file));
  m.require = name => name === 'server-only' ? {} : name === './db' ? { getDatabasePool: () => pool } : name.startsWith('./') ? load(path.relative(root, path.resolve(path.dirname(file), name + '.ts'))) : require(name);
  m._compile(ts.transpileModule(source(rel), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, file);
  return m.exports;
}
const { parseRobloxLookup, safeAvatarUrl, validRobloxId, identityRosterKey, identityCacheFresh } = load('lib/player-identity.ts');
const { lookupRobloxProfile } = load('lib/roblox-profile-server.ts');
const { setPlayerLink, getIdentityIndex, getProfileForLink } = load('lib/player-identity-db.ts');
assert.deepEqual(parseRobloxLookup('@Example_User'), { username: 'Example_User' });
assert.deepEqual(parseRobloxLookup('https://www.roblox.com/users/123/profile?foo=1'), { id: '123' });
assert.deepEqual(parseRobloxLookup('123'), { id: '123' });
for (const input of ['https://evil.com/users/123/profile', 'https://www.roblox.com.evil.com/users/123/profile', 'https://www.roblox.com@evil.com/users/123/profile', 'http://www.roblox.com/users/123/profile', 'https://www.roblox.com:81/users/123/profile', 'https://127.0.0.1', '../secret']) assert.equal(parseRobloxLookup(input), null, input);
assert.equal(validRobloxId('9007199254740992'), false);
assert.equal(safeAvatarUrl('https://tr.rbxcdn.com/image.png'), 'https://tr.rbxcdn.com/image.png');
for (const url of ['javascript:alert(1)', 'http://tr.rbxcdn.com/a', 'https://rbxcdn.com.evil.com/a', 'https://foo@rbxcdn.com/a']) assert.equal(safeAvatarUrl(url), null);
const participant = { id: 'p1', name: 'Player', username: 'OldName', checkedIn: true, squadId: null };
const event = { id: 'e1', title: 'Historical', createdAt: '2026-11-18T00:00:00Z', eventDate: '2026-11-18', status: 'finished', participants: [participant], entries: [{ id: 'score', delta: 10 }], historicalPodium: ['p1'] };
const state = { revision: 7, payload: { events: [event] } };
assert.equal(identityRosterKey(event, participant), identityRosterKey(event, { ...participant, username: 'oldname' }));
assert.notEqual(identityRosterKey(event, participant), identityRosterKey(event, { ...participant, username: 'other' }));
const snapshotBefore = JSON.stringify(state);
const profile = { robloxId: '123', username: 'NewName', displayName: 'Display', avatarUrl: 'https://tr.rbxcdn.com/image.png', refreshedAt: new Date().toISOString() };
assert.ok(identityCacheFresh(profile));
assert.ok(!identityCacheFresh(profile, Date.now() + 86400001));
let calls = [], missing = false, thumbnailFail = false;
const originalFetch = global.fetch;
global.fetch = async (url, opts) => {
  calls.push([url, opts]); assert.equal(opts.redirect, 'error'); assert.equal(opts.cache, 'no-store');
  if (url.includes('/usernames/users')) return Response.json({ data: missing ? [] : [{ id: 123, name: 'NewName', displayName: 'Display' }] });
  if (url.includes('avatar-headshot')) return thumbnailFail ? new Response('', { status: 503 }) : Response.json({ data: [{ targetId: 123, state: 'Completed', imageUrl: profile.avatarUrl }] });
  if (url === 'https://users.roblox.com/v1/users/123') return Response.json({ id: 123, name: 'NewName', displayName: 'Display', isBanned: false });
  throw new Error('unexpected network destination');
};
let queries = [], current = null, duplicate = null, players = [], links = [];
const client = { release() { queries.push('RELEASE'); }, async query(sql, args = []) { queries.push(sql); if (sql.includes('SELECT revision, payload')) return { rows: [state] }; if (sql.includes('SELECT * FROM public.weji_arena_players')) return { rows: players }; if (sql.includes('participant_id <>')) return { rows: duplicate ? [duplicate] : [] }; if (sql.includes('AND participant_id =')) return { rows: current ? [current] : [] }; if (sql === 'SELECT * FROM public.weji_arena_player_links') return { rows: links }; return { rows: [] }; } };
pool = { connect: async () => client, query: client.query };
(async () => {
  try {
    const found = await lookupRobloxProfile('NewName'); assert.equal(found.robloxId, '123'); assert.equal(found.avatarUrl, profile.avatarUrl); assert.deepEqual(JSON.parse(calls[0][1].body), { usernames: ['NewName'], excludeBannedUsers: true });
    thumbnailFail = true; assert.equal((await lookupRobloxProfile('123')).avatarUrl, null); thumbnailFail = false;
    missing = true; await assert.rejects(() => lookupRobloxProfile('Missing'), /tidak ditemukan/); missing = false;
    await assert.rejects(() => lookupRobloxProfile('https://evil.com/users/123/profile'), /valid/);
    const input = { eventId: 'e1', participantId: 'p1', revision: 7, expectedId: null, profile };
    queries = []; await setPlayerLink(input); assert.ok(queries.some(q => q.includes('FOR UPDATE'))); assert.ok(queries.some(q => q.includes('INSERT INTO public.weji_arena_players'))); assert.ok(queries.some(q => q.includes('INSERT INTO public.weji_arena_identity_audit'))); assert.ok(queries.includes('COMMIT')); assert.ok(!queries.some(q => q.includes('UPDATE weji_arena_state'))); assert.equal(JSON.stringify(state), snapshotBefore);
    queries = []; await assert.rejects(() => setPlayerLink({ ...input, revision: 6 }), /Roster berubah/); assert.ok(queries.includes('ROLLBACK')); assert.ok(!queries.some(q => q.includes('INSERT INTO')));
    current = { roblox_id: '456' }; await assert.rejects(() => setPlayerLink(input), /Identitas sudah/); current = null;
    event.participants.push({ ...participant, id: 'p2' }); duplicate = { participant_id: 'p2', roblox_id: '123' }; await assert.rejects(() => setPlayerLink(input), /peserta lain/); duplicate = null; event.participants.pop();
    current = { roblox_id: '123' }; queries = []; await setPlayerLink({ ...input, expectedId: '123', profile: null }); assert.ok(queries.some(q => q.includes('DELETE FROM public.weji_arena_player_links'))); assert.ok(queries.includes('COMMIT')); current = null;
    players = [{ roblox_id: '123', username: 'NewName', display_name: 'Display', avatar_url: profile.avatarUrl, refreshed_at: new Date() }]; links = [{ event_id: 'e1', participant_id: 'p1', roster_key: identityRosterKey(event, participant), roblox_id: '123' }];
    assert.equal((await getIdentityIndex()).events[0].participants[0].stale, false); links[0].roster_key = 'old'; assert.equal((await getIdentityIndex()).events[0].participants[0].stale, true);
    const fetchCount = calls.length; await getProfileForLink('123', 'NewName'); assert.equal(calls.length, fetchCount, 'fresh profile reused without Roblox request');
    const api = source('app/api/admin/player-identity/route.ts'); assert.match(api, /isAdminAuthenticated/); assert.match(api, /sameOrigin\(request\)/); assert.match(api, /readLimitedText\(request, 4096\)/); assert.match(api, /getProfileForLink\(body.robloxId, body.username\)/);
    const sql = source('db/migrations/032a_player_identity.sql'); assert.match(sql, /UNIQUE \(event_id, roblox_id\)/); assert.equal((sql.match(/ENABLE ROW LEVEL SECURITY/g) || []).length, 3); assert.doesNotMatch(sql, /DROP TABLE|TRUNCATE|UPDATE weji_arena_state/i);
    assert.match(source('lib/db.ts'), /DELETE FROM public.weji_arena_player_links WHERE event_id/); assert.match(source('components/arena-app.tsx'), /PlayerIdentityPanel dirty=\{store.dirty\}/);
    console.log('PASS: V3.2A mocked Roblox lookup, avatar fallback, URL validation, cache, locked identity writes, conflict/duplicate checks, unlink, stale roster detection, immutable score snapshot, migration and auth guards');
  } finally { global.fetch = originalFetch; }
})().catch(e => { console.error(e); process.exitCode = 1; });

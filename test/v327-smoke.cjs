/** V3.2.7: safe rule formatting + shared accordion wiring. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
function load(rel, mocks = {}) {
  const file = path.join(root, rel);
  const mod = new Module(file, module);
  mod.filename = file;
  mod.paths = Module._nodeModulePaths(path.dirname(file));
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  mod._compile(ts.transpileModule(read(rel), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    }
  }).outputText, file);
  return mod.exports;
}
const parser = load('lib/rule-format.ts');
const { parseRuleText, inlineParts, groupWrittenRules } = parser;
const numbered = '1. Pertandingan DUO terdiri dari dua pemain.\r\n2. Durasi 90 menit.\n3. Lokasi Ocean.';
assert.deepEqual(parseRuleText(numbered), [{
  kind: 'ordered', items: [
    { number: 1, text: 'Pertandingan DUO terdiri dari dua pemain.' },
    { number: 2, text: 'Durasi 90 menit.' },
    { number: 3, text: 'Lokasi Ocean.' },
  ]
}]);
assert.deepEqual(parseRuleText('3) Tiga\n7. Tujuh'), [{ kind: 'ordered', items: [{ number: 3, text: 'Tiga' }, { number: 7, text: 'Tujuh' }] }]);
assert.deepEqual(parseRuleText('Biaya Rp10.000.\nPeserta wajib daftar.\n\nBaris baru.'), [
  { kind: 'paragraph', text: 'Biaya Rp10.000.\nPeserta wajib daftar.' },
  { kind: 'paragraph', text: 'Baris baru.' },
]);
assert.deepEqual(parseRuleText('# Bonus\n- Big +1\n• Shiny +1\n* Mutasi +1\n\n**Catatan**\nBisa digabung.'), [
  { kind: 'heading', text: 'Bonus' },
  { kind: 'bullet', items: [{ text: 'Big +1' }, { text: 'Shiny +1' }, { text: 'Mutasi +1' }] },
  { kind: 'paragraph', text: '**Catatan**\nBisa digabung.' },
]);
assert.deepEqual(parseRuleText('   \n\r\n '), []);
assert.deepEqual(parseRuleText('1. Satu. 2. Dua.'), [{ kind: 'ordered', items: [{ number: 1, text: 'Satu. 2. Dua.' }] }]);
assert.deepEqual(inlineParts('Gunakan **WR 1** dan *Pet Kanan*.'), [
  { kind: 'text', text: 'Gunakan ' }, { kind: 'bold', text: 'WR 1' }, { kind: 'text', text: ' dan ' },
  { kind: 'italic', text: 'Pet Kanan' }, { kind: 'text', text: '.' },
]);
assert.deepEqual(inlineParts('Teks *belum ditutup'), [{ kind: 'text', text: 'Teks *belum ditutup' }]);
const malicious = '<img src=x onerror=alert(1)> **<script>alert(1)</script>** [klik](javascript:alert(1))';
assert.equal(inlineParts(malicious).map(p => p.text).join(''), malicious.replaceAll('**', ''));
const rules = [
  { id: 'a', group: 'Sistem Pertandingan', content: numbered },
  { id: 'b', group: 'Biaya', content: 'Rp10.000 per pemain.' },
  { id: 'c', group: 'Sistem Pertandingan', content: 'Poin kedua pemain dijumlah.' },
  { id: 'd', group: '__proto__', content: '**Catatan lama**' },
];
const old = JSON.stringify(rules);
assert.deepEqual(groupWrittenRules(rules).map(g => [g.group, g.items.map(r => r.id)]), [
  ['Sistem Pertandingan', ['a', 'c']], ['Biaya', ['b']], ['__proto__', ['d']]
]);
assert.equal(JSON.stringify(rules), old);
// Inspect real component output via a minimal JSX element-tree runtime, not a browser.
const Fragment = Symbol('Fragment');
const jsx = (type, props) => ({ type, props });
const common = { 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment }, react: { Fragment }, '@/lib/rule-format': parser };
const formatted = load('components/formatted-event-text.tsx', common);
const accordion = load('components/event-accordions.tsx', {
  ...common, 'lucide-react': { ChevronRight: () => null }, '@/components/formatted-event-text': formatted,
});
function expand(n) {
  if (n == null || typeof n !== 'object') return n;
  if (Array.isArray(n)) return n.map(expand);
  if (typeof n.type === 'function') return expand(n.type(n.props));
  return { ...n, props: { ...n.props, children: expand(n.props.children) } };
}
function collect(n, pred, out = []) {
  if (Array.isArray(n)) n.forEach(x => collect(x, pred, out));
  else if (n && typeof n === 'object') { if (pred(n)) out.push(n); collect(n.props?.children, pred, out); }
  return out;
}
const tree = expand(accordion.RulesAccordion({ rules }));
const accordions = collect(tree, n => n.type === 'details');
assert.equal(accordions.length, 3);
assert.ok(accordions.every(n => !n.props.open && !n.props.name));
assert.equal(collect(tree, n => n.type === 'summary').length, 3);
assert.equal(collect(tree, n => n.type === 'ol').length, 1);
assert.deepEqual(collect(tree, n => n.type === 'li').map(n => n.props.value), [1, 2, 3]);
const fee = expand(formatted.FormattedEventText({ text: 'Biaya Rp10.000.' }));
assert.equal(collect(fee, n => n.type === 'li').length, 0);
const bad = expand(accordion.FaqAccordion({ questions: [{ id: '1', question: '<script>', answer: malicious + '\n- *miring*' }] }));
assert.equal(collect(bad, n => n.type === 'script' || n.type === 'img' || n.type === 'a' || 'dangerouslySetInnerHTML' in n.props).length, 0);
assert.equal(collect(bad, n => n.type === 'strong').length, 1);
assert.equal(collect(bad, n => n.type === 'em').length, 1);
assert.equal(JSON.stringify(rules), old);
assert.match(read('app/turnamen/[id]/page.tsx'), /<RulesAccordion rules=\{e\.writtenRules\}/);
assert.doesNotMatch(read('app/turnamen/[id]/page.tsx'), /\{i \+ 1\}\. \{r\.content\}/);
assert.match(read('components/arena-app.tsx'), /<RulesAccordion key=\{e\.id\} rules=\{e\.writtenRules\}/);
assert.match(read('components/public-site.tsx'), /export \{ FaqAccordion \} from "@\/components\/event-accordions"/);
for (const text of ['r.content', 'ruleText', 'f.answer', 'answer']) assert.ok(read('components/arena-builder.tsx').includes(`<FormatPreview text={${text}} />`));
console.log('PASS: V3.2.7 rule/FAQ formatting, line breaks, explicit numbering, bullet lists, safe inline markup, legacy grouping, closed accordion structure, unchanged source data and preview wiring');

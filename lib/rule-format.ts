/** Deliberately small, text-only formatting grammar. Never interprets HTML or links. */
export type InlinePart = { kind: "text" | "bold" | "italic"; text: string };
export type RuleBlock =
  | { kind: "paragraph" | "heading"; text: string }
  | { kind: "ordered"; items: { number: number; text: string }[] }
  | { kind: "bullet"; items: { text: string }[] };

export function inlineParts(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  // Match only paired, nonempty markers on the same line. Leave unmatched markers literal.
  const pattern = /\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) parts.push({ kind: "text", text: text.slice(cursor, start) });
    parts.push({ kind: match[1] !== undefined ? "bold" : "italic", text: match[1] ?? match[2] });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: "text", text: text.slice(cursor) });
  return parts;
}

export function parseRuleText(source: string): RuleBlock[] {
  const blocks: RuleBlock[] = [];
  let current: RuleBlock | undefined;
  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) { current = undefined; continue; }
    const heading = /^(?:#{1,6})[ \t]+(.+)$/.exec(line);
    const numbered = /^(\d{1,9})[.)][ \t]+(.+)$/.exec(line);
    const bullet = /^[-*•][ \t]+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", text: heading[1] });
      current = undefined;
    } else if (numbered) {
      const item = { number: Number(numbered[1]), text: numbered[2] };
      if (current?.kind === "ordered") current.items.push(item);
      else { current = { kind: "ordered", items: [item] }; blocks.push(current); }
    } else if (bullet) {
      const item = { text: bullet[1] };
      if (current?.kind === "bullet") current.items.push(item);
      else { current = { kind: "bullet", items: [item] }; blocks.push(current); }
    } else if (current?.kind === "paragraph") {
      current.text += "\n" + line;
    } else {
      current = { kind: "paragraph", text: line };
      blocks.push(current);
    }
  }
  return blocks;
}

export function groupWrittenRules<T extends { group: string }>(rules: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const rule of rules) {
    const items = groups.get(rule.group);
    if (items) items.push(rule);
    else groups.set(rule.group, [rule]);
  }
  return Array.from(groups, ([group, items]) => ({ group, items }));
}

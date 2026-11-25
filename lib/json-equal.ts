// Compare JSON values as PostgreSQL jsonb does for object key order.
// JSON transport also omits undefined object properties. Array order matters.
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, i) => sameJson(item, b[i]))
    );
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((k) => left[k] !== undefined);
  return (
    keys.length ===
    Object.keys(right).filter((k) => right[k] !== undefined).length &&
    keys.every(
      (k) =>
        Object.prototype.hasOwnProperty.call(right, k) &&
        sameJson(left[k], right[k]),
    )
  );
}

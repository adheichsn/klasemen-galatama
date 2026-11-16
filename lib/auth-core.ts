import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

const validitySeconds = 60 * 60 * 12;
export const SESSION_COOKIE = "weji_arena_session";

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (
    parts.length !== 2 ||
    !/^[a-f0-9]{32,128}$/i.test(parts[0]) ||
    !/^[a-f0-9]{128}$/i.test(parts[1])
  )
    return false;
  try {
    const expected = Buffer.from(parts[1], "hex");
    const derived = scryptSync(password, parts[0], 64, {
      maxmem: 64 * 1024 * 1024,
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function signed(input: string, secret: string) {
  return createHmac("sha256", secret).update(input).digest("base64url");
}
export function generateSession(
  secret: string,
  timestampMs: number = Date.now(),
): string {
  if (secret.length < 32)
    throw new Error("WEJI_SESSION_SECRET harus minimal 32 karakter.");
  const body = Buffer.from(
    JSON.stringify({
      role: "admin",
      expires: Math.floor(timestampMs / 1000) + validitySeconds,
    }),
  ).toString("base64url");
  return `${body}.${signed(body, secret)}`;
}
export function verifySession(
  token: string | undefined,
  secret: string | undefined,
  timestampMs: number = Date.now(),
): boolean {
  if (!token || !secret || secret.length < 32) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || parts[0].length > 500 || parts[1].length > 100)
    return false;
  const correct = Buffer.from(signed(parts[0], secret));
  const supplied = Buffer.from(parts[1]);
  if (correct.length !== supplied.length || !timingSafeEqual(correct, supplied))
    return false;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    );
    return (
      !!parsed &&
      typeof parsed === "object" &&
      "role" in parsed &&
      parsed.role === "admin" &&
      "expires" in parsed &&
      typeof parsed.expires === "number" &&
      parsed.expires > Math.floor(timestampMs / 1000) &&
      parsed.expires <= Math.floor(timestampMs / 1000) + validitySeconds
    );
  } catch {
    return false;
  }
}
export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  const expectedName = process.env.WEJI_ADMIN_USERNAME;
  const hashed = process.env.WEJI_ADMIN_PASSWORD_HASH;
  return (
    !!expectedName &&
    !!hashed &&
    username === expectedName &&
    verifyPassword(password, hashed)
  );
}

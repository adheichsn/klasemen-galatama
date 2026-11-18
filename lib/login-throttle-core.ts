import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const LOGIN_WINDOW_MINUTES = 15;
export const LOGIN_PER_CLIENT_LIMIT = 8;
export const LOGIN_GLOBAL_LIMIT = 300;

/** Only the Vercel edge-controlled forwarding header is trusted in production.
 * On local/self-hosted installs without a verified proxy, use one shared bucket;
 * never trust a caller-supplied X-Forwarded-For value there. */
export function loginClientBucket(
  headers: { get(name: string): string | null },
  hmacSecret: string,
  vercel: boolean,
): string {
  const first = vercel
    ? (headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "")
    : "";
  const identity = isIP(first) ? first : "unverified-client";
  return `ip:${createHmac("sha256", hmacSecret).update(identity).digest("hex")}`;
}

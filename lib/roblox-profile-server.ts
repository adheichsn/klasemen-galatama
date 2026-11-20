import "server-only";
import { parseRobloxLookup, safeAvatarUrl, validIdentityUsername, validRobloxId, type RobloxProfile } from "./player-identity";

export class RobloxLookupError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function json(url: string, options: RequestInit = {}): Promise<unknown> {
  const response = await fetch(url, { ...options, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000) });
  if (response.status === 429) throw new RobloxLookupError("Roblox membatasi request. Coba lagi nanti.", 429);
  if (response.status === 404) throw new RobloxLookupError("Akun Roblox tidak ditemukan.", 404);
  if (!response.ok) throw new RobloxLookupError("Layanan Roblox sedang tidak tersedia.", 503);
  return response.json();
}
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
export async function lookupRobloxProfile(input: string): Promise<RobloxProfile> {
  const target = parseRobloxLookup(input);
  if (!target) throw new RobloxLookupError("Masukkan username, User ID, atau URL profil Roblox yang valid.", 400);
  let account: Record<string, unknown>;
  if ("id" in target) {
    account = record(await json(`https://users.roblox.com/v1/users/${target.id}`));
    if (String(account.id) !== target.id || account.isBanned === true) throw new RobloxLookupError("Akun Roblox tidak tersedia.", 404);
  } else {
    const result = record(await json("https://users.roblox.com/v1/usernames/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usernames: [target.username], excludeBannedUsers: true }) }));
    account = (Array.isArray(result.data) ? result.data.map(record).find(row => typeof row.name === "string" && row.name.toLowerCase() === target.username.toLowerCase()) : undefined) ?? {};
  }
  const robloxId = String(account.id ?? "");
  if (!validRobloxId(robloxId) || !validIdentityUsername(account.name) || typeof account.displayName !== "string" || !account.displayName.trim() || account.displayName.length > 100) throw new RobloxLookupError("Akun Roblox tidak ditemukan atau tidak tersedia.", 404);
  let avatarUrl: string | null = null;
  try {
    const thumbnails = record(await json(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=false`));
    const thumbnail = Array.isArray(thumbnails.data) ? thumbnails.data.map(record).find(row => String(row.targetId) === robloxId && row.state === "Completed") : undefined;
    avatarUrl = safeAvatarUrl(thumbnail?.imageUrl);
  } catch { /* Profile remains usable if the third-party thumbnail service fails. */ }
  return { robloxId, username: account.name, displayName: account.displayName, avatarUrl, refreshedAt: new Date().toISOString() };
}

import type { ArenaEvent, Participant } from "./arena-types";

export type RobloxProfile = {
  robloxId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  refreshedAt: string;
};
export type IdentityTarget = { id: string; name: string; username: string; robloxId: string | null; stale: boolean };
export type IdentityEvent = { id: string; title: string; eventDate: string; status: ArenaEvent["status"]; participants: IdentityTarget[] };
export type IdentityIndex = { revision: number; players: RobloxProfile[]; events: IdentityEvent[] };
export const validRobloxId = (id: unknown): id is string =>
  typeof id === "string" && /^[1-9][0-9]{0,15}$/.test(id) && Number.isSafeInteger(Number(id));
export const validIdentityUsername = (name: unknown): name is string =>
  typeof name === "string" && /^[A-Za-z0-9_]{3,20}$/.test(name);
export function parseRobloxLookup(input: string): { id: string } | { username: string } | null {
  const value = input.trim();
  if (/^[0-9]+$/.test(value)) return validRobloxId(value) ? { id: value } : null;
  const name = value.replace(/^@/, "");
  if (validIdentityUsername(name)) return { username: name };
  try {
    const url = new URL(value);
    const match = /^\/users\/([1-9][0-9]{0,15})\/profile\/?$/i.exec(url.pathname);
    if (url.protocol === "https:" && ["www.roblox.com", "roblox.com"].includes(url.hostname) && !url.port && !url.username && !url.password && match && validRobloxId(match[1])) return { id: match[1] };
  } catch { /* invalid input */ }
  return null;
}
export function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 1000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "rbxcdn.com" || url.hostname.endsWith(".rbxcdn.com")) && !url.port && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
// Keep the historical roster intact. A replaced/edited participant is never silently relinked.
export const identityRosterKey = (event: ArenaEvent, p: Participant) =>
  JSON.stringify([event.createdAt, p.name, p.username.trim().toLowerCase()]);
export const identityCacheFresh = (profile: RobloxProfile, now = Date.now()) => {
  const age = now - Date.parse(profile.refreshedAt);
  return age >= 0 && age < 24 * 60 * 60 * 1000;
};

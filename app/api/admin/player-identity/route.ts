import { getArenaSnapshot } from "@/lib/db";
import { readAvatarProfiles } from "@/lib/avatar-identity-db";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readLimitedText, sameOrigin } from "@/lib/request-security";
import { getIdentityIndex, getProfileForLink, IdentityConflict, setPlayerLink } from "@/lib/player-identity-db";
import { lookupRobloxProfile, RobloxLookupError } from "@/lib/roblox-profile-server";
import { validIdentityUsername, validRobloxId, type RobloxProfile } from "@/lib/player-identity";
import { logServerFailure } from "@/lib/server-errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers });
function failure(error: unknown) {
  if (error instanceof IdentityConflict) return reply({ error: error.message }, 409);
  if (error instanceof RobloxLookupError) return reply({ error: error.message }, error.status);
  logServerFailure("player-identity", error);
  return reply({ error: "Profil belum tersedia. Periksa migrasi SQL V3.2A atau koneksi Roblox/Supabase." }, 503);
}
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return reply({ error: "Login panitia diperlukan." }, 401);
  try {
    if (request.nextUrl.searchParams.get("view") === "avatars") {
      const { data } = await getArenaSnapshot();
      return reply({ profiles: await readAvatarProfiles(data.events) });
    }
    return reply(await getIdentityIndex());
  } catch (error) { return failure(error); }
}
const validKey = (x: unknown): x is string => typeof x === "string" && x.length > 0 && x.length <= 128 && !/[\u0000-\u001f]/.test(x);
export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return reply({ error: "Login panitia diperlukan." }, 401);
  if (!sameOrigin(request)) return reply({ error: "Origin tidak sesuai." }, 403);
  let body: Record<string, unknown>;
  try {
    const raw = await readLimitedText(request, 4096);
    const parsed = JSON.parse(raw ?? "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed;
  } catch { return reply({ error: "Payload tidak valid." }, 400); }
  try {
    if (body.action === "lookup" && typeof body.query === "string" && body.query.length <= 300) return reply({ profile: await lookupRobloxProfile(body.query) });
    if ((body.action !== "link" && body.action !== "unlink") || !validKey(body.eventId) || !validKey(body.participantId) || !Number.isSafeInteger(body.revision) || (body.revision as number) < 1 || !(body.expectedId === null || validRobloxId(body.expectedId))) return reply({ error: "Permintaan identitas tidak valid." }, 400);
    let profile: RobloxProfile | null = null;
    if (body.action === "link") {
      if (!validRobloxId(body.robloxId) || !validIdentityUsername(body.username)) return reply({ error: "Pilih profil Roblox dahulu." }, 400);
      profile = await getProfileForLink(body.robloxId, body.username);
      if (profile.username.toLowerCase() !== body.username.toLowerCase()) return reply({ error: "Username Roblox berubah. Cari ulang dan konfirmasi profil." }, 409);
    }
    await setPlayerLink({ eventId: body.eventId, participantId: body.participantId, revision: body.revision as number, expectedId: body.expectedId as string | null, profile });
    return reply({ ok: true });
  } catch (error) { return failure(error); }
}

import { readLimitedText, sameOrigin } from "@/lib/request-security";
import { logServerFailure } from "@/lib/server-errors";
import { chargeLoginAttempt, clearSuccessfulLogin } from "@/lib/login-throttle";
import { LOGIN_WINDOW_MINUTES } from "@/lib/login-throttle-core";
import { NextRequest, NextResponse } from "next/server";
import {
  generateSession,
  SESSION_COOKIE,
  verifyAdminCredentials,
  configuredSessionSecret,
} from "@/lib/auth-core";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Permintaan lintas origin ditolak" },
      { status: 403 },
    );
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 8192)
    return NextResponse.json(
      { error: "Payload terlalu besar" },
      { status: 413 },
    );
  let body: unknown;
  try {
    const text = await readLimitedText(req, 8192);
    if (text === null)
      return NextResponse.json(
        { error: "Payload terlalu besar / tidak valid" },
        { status: 413 },
      );
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Format tidak valid" }, { status: 400 });
  }
  const value = body as { username?: unknown; password?: unknown };
  if (
    !value ||
    typeof value.username !== "string" ||
    typeof value.password !== "string" ||
    value.username.length > 120 ||
    value.password.length > 256
  )
    return NextResponse.json(
      { error: "Kredensial tidak valid" },
      { status: 400 },
    );
  const sessionSecret = configuredSessionSecret();
  if (!sessionSecret)
    return NextResponse.json(
      { error: "Konfigurasi server belum lengkap" },
      { status: 503 },
    );
  // Check durable database budgets before the expensive scrypt verification.
  // Fail closed if the V3.0 SQL migration / Supabase is unavailable.
  let clientBucket: string;
  try {
    const throttle = await chargeLoginAttempt(req, sessionSecret);
    if (throttle.denied) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan login. Coba lagi nanti." },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(LOGIN_WINDOW_MINUTES * 60),
          },
        },
      );
    }
    clientBucket = throttle.clientBucket;
  } catch (error) {
    logServerFailure("login-throttle", error);
    return NextResponse.json(
      { error: "Proteksi login belum tersedia. Periksa migrasi SQL V3.0." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!verifyAdminCredentials(value.username, value.password))
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    await clearSuccessfulLogin(clientBucket);
  } catch (error) {
    logServerFailure("login-reset", error);
    return NextResponse.json(
      { error: "Gagal menyelesaikan login. Coba lagi." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, generateSession(sessionSecret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
    priority: "high",
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

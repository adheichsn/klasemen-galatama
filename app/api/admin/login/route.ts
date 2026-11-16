import { readLimitedText, sameOrigin } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import {
  generateSession,
  SESSION_COOKIE,
  verifyAdminCredentials,
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
  if (
    !process.env.WEJI_SESSION_SECRET ||
    process.env.WEJI_SESSION_SECRET.length < 32
  )
    return NextResponse.json(
      { error: "Konfigurasi server belum lengkap" },
      { status: 503 },
    );
  if (!verifyAdminCredentials(value.username, value.password))
    return NextResponse.json(
      { error: "Username atau password salah" },
      { status: 401 },
    );
  const response = NextResponse.json({ ok: true });
  response.cookies.set(
    SESSION_COOKIE,
    generateSession(process.env.WEJI_SESSION_SECRET),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 12,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { readLimitedText, sameOrigin } from "@/lib/request-security";
import { finalizeHistoricalEvent } from "@/lib/historical-server";
import { logServerFailure } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Login panitia diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sesuai." }, { status: 403 });
  let raw: string | null;
  try { raw = await readLimitedText(request, 4096); }
  catch { return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 }); }
  if (!raw) return NextResponse.json({ error: "Payload kosong atau terlalu besar." }, { status: 400 });
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 }); }
  if (!parsed || typeof parsed !== "object") return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  const body = parsed as Record<string, unknown>;
  if (typeof body.eventId !== "string" || body.eventId.length < 1 || body.eventId.length > 128 ||
    !Number.isSafeInteger(body.revision) || (body.revision as number) < 1 ||
    typeof body.confirmTitle !== "string" || body.confirmTitle.length > 100 ||
    !Array.isArray(body.podium) || body.podium.length !== 3 ||
    body.podium.some((item: unknown) => typeof item !== "string" || item.length > 128 || item.length === 0))
    return NextResponse.json({ error: "Data finalisasi historis tidak valid." }, { status: 400 });
  try {
    const result = await finalizeHistoricalEvent(body.eventId, body.revision as number, body.confirmTitle, body.podium);
    if (!result.ok && "invalid" in result) return NextResponse.json({ error: result.invalid }, { status: 422 });
    if (!result.ok) return NextResponse.json({ error: "Data server sudah berubah. Refresh sebelum finalisasi." }, { status: 409 });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    logServerFailure("admin-historical-finalize", error);
    return NextResponse.json({ error: "Gagal memfinalisasi arsip. Data lain tidak diubah." }, { status: 503 });
  }
}

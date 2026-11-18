import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getScoreAudit } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json(
      { error: "Akses panitia diperlukan." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  const eventId = request.nextUrl.searchParams.get("eventId") || "";
  if (!eventId || eventId.length > 128 || /[\u0000-\u001f]/.test(eventId))
    return NextResponse.json(
      { error: "ID turnamen tidak valid." },
      { status: 400 },
    );
  try {
    return NextResponse.json(
      { activity: await getScoreAudit(eventId) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Gagal membaca audit. Pastikan migrasi SQL V2.6 sudah dijalankan.",
      },
      { status: 503 },
    );
  }
}

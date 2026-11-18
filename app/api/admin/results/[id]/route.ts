import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getArenaSnapshot } from "@/lib/db";
import { exportResultsCsv, type ExportKind } from "@/lib/tournament-results";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Login panitia diperlukan." },
      {
        status: 401,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
  const { id } = await params;
  const type = request.nextUrl.searchParams.get("type") || "standings";
  if (
    !id ||
    id.length > 128 ||
    /[\u0000-\u001f]/.test(id) ||
    !["standings", "ledger"].includes(type)
  ) {
    return NextResponse.json(
      { error: "Permintaan ekspor tidak valid." },
      { status: 400 },
    );
  }
  try {
    const { data } = await getArenaSnapshot();
    const event = data.events.find((item) => item.id === id && !item.trashedAt);
    if (!event || event.status !== "finished") {
      return NextResponse.json(
        { error: "Hasil final tidak ditemukan." },
        { status: 404 },
      );
    }
    const body = exportResultsCsv(event, type as ExportKind);
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    return new Response(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="weji-${type}-${safeId}.csv"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Ekspor gagal. Periksa koneksi database." },
      {
        status: 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}

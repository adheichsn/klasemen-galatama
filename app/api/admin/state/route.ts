import { readLimitedText, sameOrigin } from "@/lib/request-security";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getArenaSnapshot, saveArenaSnapshot } from "@/lib/db";
import { validArena } from "@/lib/arena-storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const denied = () =>
  NextResponse.json(
    { error: "Akses panitia diperlukan" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
export async function GET() {
  if (!(await isAdminAuthenticated())) return denied();
  try {
    const snapshot = await getArenaSnapshot();
    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("[WEJI STATE GET ERROR]", error);

    return NextResponse.json(
      { error: "Database belum siap atau tidak terhubung" },
      { status: 503 },
    );
  }
}
export async function PUT(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return denied();
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Permintaan lintas origin ditolak" },
      { status: 403 },
    );
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 6_000_000)
    return NextResponse.json(
      { error: "Maksimum payload 6 MB" },
      { status: 413 },
    );
  let payload: unknown;
  try {
    payload = await readLimitedText(request, 6_000_000);
  } catch {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }
  if (typeof payload !== "string" || payload.length > 6_000_000)
    return NextResponse.json(
      { error: "Maksimum payload 6 MB" },
      { status: 413 },
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "JSON tidak valid" }, { status: 400 });
  }
  const body = parsed as { revision?: unknown; data?: unknown };
  if (
    !body ||
    !Number.isSafeInteger(body.revision) ||
    (body.revision as number) < 0 ||
    !validArena(body.data) ||
    body.data.events.length === 0
  )
    return NextResponse.json(
      { error: "Data turnamen tidak sesuai skema" },
      { status: 400 },
    );
  try {
    const result = await saveArenaSnapshot(body.data, body.revision as number);
    if (!result.ok && "invalid" in result)
      return NextResponse.json(
        { error: result.invalid },
        { status: 422, headers: { "Cache-Control": "no-store" } },
      );
    if (!result.ok)
      return NextResponse.json(
        {
          error:
            "Konflik: data di server sudah berubah. Backup pekerjaanmu, lalu refresh.",
        },
        { status: 409 },
      );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan ke database" },
      { status: 503 },
    );
  }
}

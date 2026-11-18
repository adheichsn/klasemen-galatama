import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { changeEventLifecycle } from "@/lib/db";
import { readLimitedText, sameOrigin } from "@/lib/request-security";
import type { EventLifecycleAction } from "@/lib/event-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return NextResponse.json(
      { error: "Login panitia diperlukan." },
      { status: 401 },
    );
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origin tidak sesuai." },
      { status: 403 },
    );
  let raw: string | null;
  try {
    raw = await readLimitedText(request, 4096);
  } catch {
    return NextResponse.json(
      { error: "Payload tidak valid." },
      { status: 400 },
    );
  }
  if (!raw)
    return NextResponse.json(
      { error: "Payload tidak valid." },
      { status: 400 },
    );
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON tidak valid." }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object")
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const body = parsed as Record<string, unknown>;
  const actions: EventLifecycleAction[] = ["trash", "restore", "delete"];
  if (
    typeof body.id !== "string" ||
    body.id.length < 1 ||
    body.id.length > 128 ||
    /[\u0000-\u001f]/.test(body.id) ||
    !actions.includes(body.action as EventLifecycleAction) ||
    !Number.isSafeInteger(body.revision) ||
    (body.revision as number) < 1 ||
    (body.action === "delete" &&
      (typeof body.confirmTitle !== "string" ||
        body.confirmTitle.length > 1000))
  )
    return NextResponse.json(
      { error: "Permintaan pengelolaan event tidak valid." },
      { status: 400 },
    );
  try {
    const result = await changeEventLifecycle(
      body.id,
      body.action as EventLifecycleAction,
      body.revision as number,
      typeof body.confirmTitle === "string" ? body.confirmTitle : undefined,
    );
    if (!result.ok && "invalid" in result)
      return NextResponse.json({ error: result.invalid }, { status: 422 });
    if (!result.ok)
      return NextResponse.json(
        {
          error:
            "Data server sudah berubah. Refresh halaman sebelum mencoba lagi.",
        },
        { status: 409 },
      );
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Operasi event gagal. Pastikan SQL V2.7.1 sudah dijalankan." },
      { status: 503 },
    );
  }
}

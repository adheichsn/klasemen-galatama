import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
/** Public liveness only, deliberately does not reveal database or environment. */
export function GET() {
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

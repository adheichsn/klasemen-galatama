import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export function GET() {
  // No credentials or private tournament state are exposed.
  return NextResponse.json({ serverTime: Date.now() }, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

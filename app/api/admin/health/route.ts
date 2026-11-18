import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDatabaseHealth } from "@/lib/db";
import { logServerFailure } from "@/lib/server-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json(
      { error: "Login diperlukan" },
      { status: 401, headers },
    );
  }
  try {
    const health = await getDatabaseHealth();
    return NextResponse.json(health, {
      status: health.ready ? 200 : 503,
      headers,
    });
  } catch (error) {
    logServerFailure("database-health", error);
    return NextResponse.json(
      { ready: false, error: "Database tidak tersedia" },
      { status: 503, headers },
    );
  }
}

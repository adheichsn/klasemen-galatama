import { NextResponse } from "next/server";
import { getArenaAsset } from "@/lib/db";
import { WEJI_ASSET_URL } from "@/lib/banner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!WEJI_ASSET_URL.test(`/api/assets/${id}`))
    return new Response(null, { status: 404 });
  try {
    const asset = await getArenaAsset(id);
    if (!asset) return new Response(null, { status: 404 });
    return new NextResponse(new Uint8Array(asset.bytes), {
      headers: {
        "Content-Type": asset.mime_type,
        "Cache-Control": "public, max-age=86400, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Gambar tidak tersedia", { status: 503 });
  }
}

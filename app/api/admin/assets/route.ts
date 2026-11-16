import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { uploadArenaAsset } from "@/lib/db";
import { sameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";
const MAX_FILE = 1_000_000; // 1 MB maximum per banner
const jsonError = (message: string, status: number) =>
  NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );

function imageMime(
  bytes: Buffer,
): "image/png" | "image/jpeg" | "image/webp" | null {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return jsonError("Login panitia diperlukan", 401);
  if (!sameOrigin(request)) return jsonError("Origin tidak valid", 403);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_FILE) return jsonError("Banner maksimal 1 MB", 413);
  if (!request.body) return jsonError("File kosong", 400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE) {
        await reader.cancel();
        return jsonError("Banner maksimal 1 MB", 413);
      }
      chunks.push(value);
    }
  } catch {
    return jsonError("Upload terputus", 400);
  } finally {
    reader.releaseLock();
  }
  if (size < 32) return jsonError("File gambar tidak valid", 400);
  const bytes = Buffer.concat(chunks.map((v) => Buffer.from(v)));
  const mime = imageMime(bytes);
  if (!mime || request.headers.get("content-type")?.split(";")[0] !== mime)
    return jsonError("Gunakan JPG, PNG, atau WebP asli", 415);
  const id = randomUUID();
  try {
    await uploadArenaAsset(id, mime, bytes);
    return NextResponse.json(
      { url: `/api/assets/${id}` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError(
      "Gagal menyimpan banner. Jalankan ulang db/schema.sql di Supabase.",
      503,
    );
  }
}

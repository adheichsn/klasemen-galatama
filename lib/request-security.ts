import type { NextRequest } from "next/server";
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return (
      new URL(origin).host === request.nextUrl.host &&
      new URL(origin).protocol === request.nextUrl.protocol
    );
  } catch {
    return false;
  }
}
/** Stop reading immediately once the request body exceeds our resource budget. */
export async function readLimitedText(
  request: NextRequest,
  limitBytes: number,
): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limitBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

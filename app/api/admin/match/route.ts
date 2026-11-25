import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  committedMatchAction,
  getArenaSnapshot,
  saveArenaSnapshot,
} from "@/lib/db";
import { applyLiveCommand, validCommand } from "@/lib/live-command";
import { validArena } from "@/lib/arena-storage";
import { sameOrigin, readLimitedText } from "@/lib/request-security";
import { logServerFailure } from "@/lib/server-errors";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated()))
    return reply({ error: "Sesi panitia habis. Login ulang." }, 401);
  if (!sameOrigin(request)) return reply({ error: "Origin tidak valid." }, 403);
  let body;
  try {
    body = JSON.parse((await readLimitedText(request, 32_768)) || "null");
  } catch {
    return reply({ error: "Permintaan tidak valid." }, 400);
  }
  if (
    !body ||
    !Number.isSafeInteger(body.revision) ||
    body.revision < 0 ||
    typeof body.eventId !== "string" ||
    typeof body.operationId !== "string" ||
    !/^[a-zA-Z0-9-]{12,128}$/.test(body.operationId) ||
    !validCommand(body.command)
  )
    return reply({ error: "Aksi pertandingan tidak valid." }, 400);
  const { revision, operationId, eventId, command } = body;
  try {
    const recover = async () => {
      // Both the receipt and the write commit in one database transaction.
      const done = await committedMatchAction(
        revision + 1,
        eventId,
        operationId,
      );
      const snapshot = await getArenaSnapshot();
      return reply(
        {
          snapshot,
          ...(done
            ? {}
            : {
              error:
                "Data terbaru sudah dimuat. Periksa kembali lalu kirim ulang.",
            }),
        },
        done ? 200 : 409,
      );
    };
    const current = await getArenaSnapshot();
    if (current.revision !== revision) return await recover();
    const event = current.data.events.find((e) => e.id === eventId);
    const next =
      event && applyLiveCommand(event, command, operationId, Date.now());
    if (!next || next === event)
      return reply(
        { error: "Aksi tidak tersedia pada status pertandingan ini." },
        422,
      );
    const data = {
      ...current.data,
      events: current.data.events.map((e) => (e === event ? next : e)),
    };
    if (!validArena(data))
      return reply(
        { error: "Data pertandingan mencapai batas atau tidak valid." },
        422,
      );
    const result = await saveArenaSnapshot(data, revision, operationId);
    if (!result.ok)
      return "invalid" in result
        ? reply({ error: result.invalid }, 422)
        : await recover();
    const saved = result.data.events.find((e) => e.id === eventId)!;
    return reply({
      revision: result.revision,
      status: saved.status,
      timer: saved.timer,
      startedAt: saved.startedAt,
      finishedAt: saved.finishedAt,
      entry: saved.entries[0]?.id === operationId ? saved.entries[0] : null,
    });
  } catch (error) {
    logServerFailure("match-write", error);
    return reply(
      { error: "Konfirmasi server belum diterima. Coba lagi." },
      503,
    );
  }
}

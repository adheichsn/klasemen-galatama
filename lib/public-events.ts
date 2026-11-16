import "server-only";
import { getPublicEvents } from "@/lib/db";
import type { ArenaEvent } from "@/lib/arena-types";
export async function publicEvents(): Promise<{
  events: ArenaEvent[];
  unavailable: boolean;
}> {
  try {
    return { events: await getPublicEvents(), unavailable: false };
  } catch (err) {
    console.error(
      "WEJI public database unavailable",
      err instanceof Error ? err.message : "error",
    );
    return { events: [], unavailable: true };
  }
}

import "server-only";
import { cache } from "react";
import { logServerFailure } from "./server-errors";
import { getPublicEvents } from "@/lib/db";
import type { ArenaEvent } from "@/lib/arena-types";
export const publicEvents = cache(
  async (): Promise<{
    events: ArenaEvent[];
    unavailable: boolean;
  }> => {
    try {
      return { events: await getPublicEvents(), unavailable: false };
    } catch (err) {
      logServerFailure("public-events", err);
      return { events: [], unavailable: true };
    }
  },
);

import "server-only";
import type { NextRequest } from "next/server";
import { Pool } from "pg";
import {
  loginClientBucket,
  LOGIN_GLOBAL_LIMIT,
  LOGIN_PER_CLIENT_LIMIT,
} from "./login-throttle-core";
import { getDatabasePool } from "./db";

type RateRow = { denied: boolean };
const RATE_SQL = `
INSERT INTO weji_arena_login_limits AS previous
  (bucket, attempts, window_started, blocked_until, updated_at)
VALUES ($1, 1, now(), NULL, now())
ON CONFLICT (bucket) DO UPDATE SET
 attempts = CASE WHEN previous.window_started < now() - interval '15 minutes'
   THEN 1 ELSE previous.attempts + 1 END,
 window_started = CASE WHEN previous.window_started < now() - interval '15 minutes'
   THEN now() ELSE previous.window_started END,
 blocked_until = CASE
   WHEN previous.blocked_until > now() THEN previous.blocked_until
   WHEN previous.window_started < now() - interval '15 minutes' THEN NULL
   WHEN previous.attempts >= $2 THEN now() + interval '15 minutes'
   ELSE NULL END,
 updated_at = now()
RETURNING (blocked_until IS NOT NULL AND blocked_until > now()) AS denied`;

/** Atomically charge the per-client and platform-wide budgets in a single
 * transaction, including concurrent requests across serverless instances. */
export async function chargeLoginAttempt(request: NextRequest, secret: string) {
  const clientBucket = loginClientBucket(
    request.headers,
    secret,
    process.env.VERCEL === "1",
  );
  const pool: Pool = getDatabasePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Fixed lock order on two shared keys avoids deadlocks.
    const globalRow = await client.query<RateRow>(RATE_SQL, [
      "global",
      LOGIN_GLOBAL_LIMIT,
    ]);
    const clientRow = await client.query<RateRow>(RATE_SQL, [
      clientBucket,
      LOGIN_PER_CLIENT_LIMIT,
    ]);
    await client.query("COMMIT");
    return {
      denied: !!(globalRow.rows[0]?.denied || clientRow.rows[0]?.denied),
      clientBucket,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** A successful login clears its own bucket, not the platform-wide ceiling. */
export async function clearSuccessfulLogin(clientBucket: string) {
  await getDatabasePool().query(
    "DELETE FROM weji_arena_login_limits WHERE bucket = $1",
    [clientBucket],
  );
}

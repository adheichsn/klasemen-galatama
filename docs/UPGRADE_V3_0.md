# WEJI ARENA V3.0 — Single-Admin Security & Production Readiness

## Scope / compatibility

- **Exactly one admin**, configured by the existing `.env.local` secrets. No roles, multi-admin or certificates.
- SOLO/SQUAD, all score snapshots, archived events, Trash/Restore/Permanent Delete, SSE and public pages retain their existing storage layout.
- Existing tournament / audit rows are **not modified by this migration**. Do not truncate tables or recreate the Supabase project.
- **One new table:** `weji_arena_login_limits` for persistent login throttling. Login will return **503 until you run the idempotent V3.0 SQL**. Run the SQL **before** deploying the new source.
- Existing admin cookies will be invalidated once on upgrade, because signatures are now linked to the current admin password hash. Log in again; this is intended. Changing admin password hash or session secret invalidates existing sessions.

## Deployment / migration order

1. Backup the current V2.10 source, `.env.local` (privately), and export the saved tournament JSON as well as a Supabase database backup where available. **Never commit secrets to GitHub.**
2. In Supabase SQL Editor, run the complete `db/schema.sql` bundled with V3.0 (idempotent) or only the new `weji_arena_login_limits` section. Verify the new table in Table Editor. No DELETE/TRUNCATE is required.
3. Apply PATCH-ONLY ZIP over the exact V2.10 baseline, keeping your `.env.local` unchanged. If you only have a clean checkout, use the full source instead.
4. Run `npm ci`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`.
5. Local: `node --env-file=.env.local scripts/preflight.cjs` (read-only config check). Then `npm run dev`. In production set environment variables in the hosting dashboard; run preflight using the real environment but do not log secrets.
6. Sign in again via `/admin/login`. Open `/api/admin/health` while signed in. Expect 200 and `ready: true`. Without a session it must return 401. Public `/api/health` intentionally only returns `{ "status": "ok" }` and **does not check the database**.
7. Test event creation, one valid score, a reversal, a finished archive, export, public scoreboard, a banner and the Recycle Bin with a **test event**, not your actual tournament.

## Security changes and limits

- A transactional PostgreSQL upsert meters login attempts by a hashed client identity (8 attempts / 15 minutes), plus a broad platform cap (300 / 15 minutes). After the limit, the server responds `429` with `Retry-After`. Successful login clears only the client bucket. Database outage/missing migration fails closed (`503`).
- On Vercel the client identity uses a platform-terminated `X-Forwarded-For`. On untrusted/self-hosted proxies the server **does not trust arbitrary forwarded headers** and uses a single shared bucket. That is deliberately conservative and can lock out all operators after repeated failures; configure rate limiting at your trusted proxy or WAF.
- Cookies are `HttpOnly`, `Secure` in production and `SameSite=Strict`, tied cryptographically to the admin password hash. Logout removes the browser cookie. **This is not a stateful session revocation list**; if an attacker has a stolen token, it can survive client logout until its 12-hour expiry. Rotate `WEJI_SESSION_SECRET` to invalidate it.
- HTTP security headers include frame/object restrictions and production HSTS. The partial CSP **does not** enforce nonced scripts; review this before a strict CSP rollout.
- Health diagnostics are admin-only and report table readiness without records or DB credentials. Keep application logs free of passwords and connection strings.
- A hashed fingerprint detects `.env.local` changes during development and rebuilds the stale pool. Production API pool size is capped per Node instance; many serverless instances still multiply the total connections.

## Database connections and SSE

For Vercel/other ephemeral workers, the main `DATABASE_URL` can use Supabase's **transaction pooler (port 6543)**. PostgreSQL LISTEN requires a persistent session and **must not** use that port. Set the optional `WEJI_LISTEN_DATABASE_URL` to the **session pooler (port 5432)** to attempt SSE. If it is not set and the main URL uses 6543, the SSE broker stays degraded and 15-second polling continues.

SSE on serverless is best effort: connections close/reconnect and instances may not share LISTEN subscriptions. Test live spectator with two browsers in the actual hosting environment. For reliably low-latency push at scale, consider a dedicated always-on service or managed realtime provider. **Never assume SSE is guaranteed on Vercel.**

## Backup, monitoring, recovery

- Keep a backup copy of a working deployment and exported event JSON. For reliable restoration of **all** metadata, images and audit tables, use a full PostgreSQL backup when your Supabase plan/tools allow it. JSON exports alone are not complete DB backups.
- Restore and verify a backup in a **separate/staging database** first. Do not restore over production or overwrite the `id=1` state without explicit review.
- Monitor `/api/health` for basic process liveness, and `/api/admin/health` for database/schema readiness (authenticated only); also review host logs for API 503/429 and SSE reconnects.
- Configure Vercel firewall/WAF/bot protection and usage alerts. Application rate limiting does not prevent DDoS or guarantee cost protection. WAF options, limits and pricing vary by plan.
- Always run smoke/build and QA before promoting a deployment. Do not claim production readiness solely from these source checks.

## Manual QA checklist

- Wrong password up to eight tries; the next attempt returns `429` and `Retry-After` without a new cookie; use a **test client/time window** and avoid locking out the real operator. Successful login returns normal cookie and clears only that client bucket.
- `/api/admin/state`, `/api/admin/health`, and admin CSV return 401 without a valid session.
- Login/logout and password-hash rotation invalidate sessions as documented; no admin controls appear on public pages.
- Existing scores, SOLO/SQUAD, event results, Trash, archives, banners, analytics, and CSV are unchanged.
- Main PostgreSQL DB connected, optional LISTEN session configured correctly, spectator re-connects and polling fallback works.
- Test responsive UI on mobile/tablet/desktop and `npm run build` on your machine, since network-limited build environments may not install dependencies.

# WEJI ARENA V3.2A — Roblox Player Identity & Database


## Before deploy (production and local)

1. Back up source, Supabase database, and the existing `.env.local`. Database-level backup is important: the regular arena JSON export does **not** include the new registry/link/audit tables.
2. In the existing Supabase project SQL Editor, run **`db/migrations/032a_player_identity.sql`** in full first. It creates three additive tables, enables RLS (no anonymous/authenticated Data API policies), and does not alter the event payload or scores. It is safe to run again. Use the existing server database owner connection; a custom restricted DB role would need explicit database grants. The full `db/schema.sql` also includes the new definitions for fresh installations.
3. Apply PATCH-ONLY to the project root. No new dependencies, secrets, API keys, or environment variables. Do not reset Supabase or change the pooler.
4. Run `npm ci`, `npm run test:smoke`, `npm run test:source`, `npm run typecheck`, `npm run build`, `npm run dev`. Login and check `/api/admin/health`: `players_ready`, `player_links_ready`, `identity_audit_ready` should be true.
5. Test locally before git push; production will redeploy normally from main. The new tables are also required for the permanent-delete cascade; do not deploy before the migration is complete.

## Admin workflow

- Save the event and its participants first, even for historical FINISHED events. Open Admin → Profil Pemain. Choose a saved event and participant (Trash is excluded).
- Search using exact username, `@username`, numeric Roblox User ID, or `https://www.roblox.com/users/123/profile`. For a username composed only of digits, prefix `@` to distinguish it from an ID. Check display name, username, headshot and ID. Open the Roblox profile directly if uncertain. Confirm explicitly. No automatic matching of historical usernames.
- The saved registry is keyed by Roblox User ID. To use an existing account for another event, choose the saved participant then the account in the registry. A cached profile is reused for up to 24 hours; expired profiles are refreshed on linking. A manual lookup always queries Roblox. Linking a fresh lookup to a still-fresh stored profile with identical username may retain the stored avatar until the cache expires. No background refresh or cron in phase A.
- If the old username differs, verify the account manually before confirming; this supports Roblox name changes. This is an admin-confirmed association, **not** proof the participant owns the Roblox account. The original name and username in the event are preserved.
- Unlinking removes the event link, not the player registry or scoring. An account cannot be linked to two participants in one event. An edited roster is flagged stale and must be confirmed again. Conflicts require reload. A temporarily unavailable Roblox thumbnail uses a neutral placeholder. If the user lookup fails, retry; no fabricated profile is saved. Public pages remain unchanged until phase B.
- Permanent event deletion removes its links and link audit rows, preserving reusable player accounts. A trashed event is not linkable and retains links until restored or permanently deleted. A draft participant deleted from a roster can leave an orphan link; it is not displayed, and an orphan is removed with audit if it blocks re-linking that account in the same event. Retention of the standalone registry is intentional; registry-wide delete/UI is outside phase A.

## QA and rollback

- Link a real participant on a QA draft. Confirm correct avatar/name/ID, refresh/reload, reuse in a second QA event, try duplicate within one event, unlink/relink. Test a wrong username and malformed/external URL. Test two tabs changing the same participant.
- Compare existing 18 November archived scores, podium, labels, analytics before/after linking. Linking must not change original event snapshot or ledger. Check public listing and single-admin access; anonymous API GET/POST should return 401. Test permanent delete only on disposable QA event.
- Real Roblox API availability and PostgreSQL integration need live QA. The smoke test uses mocked responses and queries; source parsing is not a full Next.js build.
- Rollback application to previous commit if needed; leave additive tables in place to retain confirmed identities. Do not drop tables or rerun historical scores. Existing event JSON backups do not include identity tables; use a database backup for full recovery.
- Next phase B: integrate linked avatars/identity into public pages with public event visibility, stale-link validation, and efficient bulk reads. Phase C player profile/history, D/E DUO, F general homepage typewriter and FAQ.

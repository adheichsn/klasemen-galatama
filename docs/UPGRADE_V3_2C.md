# WEJI ARENA V3.2C — Player Directory & Player Profile (3.2.2)

## Public routes

- `/pemain`: player directory, search by Roblox username, display name, recorded alias or User ID. Mode filter, alphabetical/champion/final-edition order and 16 per page.
- `/pemain/id/<RobloxUserId>`: stable player profile, current stored avatar, username/display name, external Roblox link, per-mode final stats and history (12 per page). Click names/avatars on public tournament views. Public navigation and footer include Pemain. Automatic profile-link prefetch disabled to avoid fan-out reads.
- `/pemain/<username>`: prior SOLO history route retained. Redirect only when matching history resolves unambiguously to one ID; if the old username is now used by another confirmed player, present choices. Unlinked records remain separately labeled. No inferred link or username-based automatic backfill.
- Hall of Fame all-time SOLO aggregate uses confirmed Roblox IDs rather than username; unresolved legacy usernames remain distinct labeled rows. Per-edition official ranks are unchanged.

## Data rules

Only profiles linked to valid participants of published, non-trashed events appear. Published scheduled events can appear as participation, but only finished events count in totals; no live scores are included in lifetime stats. Stale/replaced roster links are ignored. A duplicate identity within an inconsistent event is excluded from identity aggregation for that event. Unconfirmed names are not silently merged into a Roblox profile. If the identity query fails, directory/profile show an availability message and Hall of Fame suppresses identity aggregation while retaining per-edition results. Account metadata is read from Supabase; no Roblox API calls occur during public rendering. The current admin-confirmed identity is not proof of account ownership.

SOLO rank uses the existing standings (including official historical podium); SQUAD player points reflect the participant's net ledger contributions across their own entries, not the entire team's score. On unusual legacy roster changes, rank/medals follow the final roster squad, once per event; historical contributions remain individual. Cancelled catches are excluded, manual adjustments remain in net points. No inferred catches. Per-mode points are cumulative recorded values, not a cross-event competition rank; different rules make them non-comparable. History uses the event's original date, not the archival recording time.

The existing snapshot storage reads published events and batched identity links for the requested page. New directory/profile projection is computed server-side; only displayed profile identities are passed to the avatar context. No schema, score calculation, event finalization, admin authorization or credential changes. No participant login or extra admin. DUO and homepage/typewriter/FAQ are later phases.

## QA

- Visit `/pemain`, expect the 19 linked players for the published 18 November event (assuming they remain linked/published); test search by username/ID, filter and links.
- Open a player from the final scoreboard, Hall of Fame and spectator, verify the same `/pemain/id/...` address and external Roblox link.
- Confirm original date, final ranks, official points and catches from the event match. Verify a score correction/reversed catch is reflected accurately in individual totals.
- Link the same Roblox ID to a different recorded username on a separate QA event; verify one profile with two editions. Unlinked records must not be merged.
- Verify both members of a QA SQUAD receive their team placement once, but separate individual contribution totals. Check live/draft events do not increase final stats.
- Hide or trash a QA event: players only linked to that event should no longer be discoverable, including direct ID URL. Restore visibility and verify again. Test nonexistent/invalid ID (404) and legacy ambiguous username route.
- Check phone/tablet/desktop navigation, directory card layout, filters, profile history and avatar links. Ensure admin scoring controls and login are unchanged.

## Verification in patch environment

All repository smoke suites plus V3.2C passed, source syntax (111 TS/TSX and 3 CSS) passed, standalone strict TypeScript for pure identity/directory/results modules passed. `npm ci --offline` failed because `xtend@4.0.2` is absent from the local cache; full project typecheck, Next.js build, visual/mobile and real Supabase QA must be done on the user's machine. The tests use fixture events and mocked DB; no production connection or deployment attempted.

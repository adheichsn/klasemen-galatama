# WEJI ARENA — V2.5 Patch Notes / QA Handoff

## Change scope

- Match lifecycle: Draft → Live (clock starts) → Finished (final lock); Pause / Resume within Live. No reopening completed events.
- Match timer: public clock from server-saved absolute timestamp; time-up visibly marked.
- Live leaderboard: podium plus rank-up/rank-down and score-delta markers comparing browser session snapshots; checks on 15 s public refresh.
- Archives: final-locked badge + top-3 podium; Hall of Fame has final status indicators.
- Server-side protection: versioned saves lock row with `FOR UPDATE`, verify old-vs-new final result snapshot before accepting changes; CAS conflict protection retained.
- Score entry: deny **new catches** after match timer expires; manual correction remains available while `status === live`.
- No SQL/schema migrations; same event data format with optional `startedAt`.

## Test matrix (run in local QA browser)

1. Create SOLO: add fish and 2 participants; Start -> countdown, Save -> public timer visible.
2. Pause and Save; public timer stops. Resume and Save; countdown continues from paused value.
3. Record catches; verify live leaderboard updates after refresh (up to ~15 s), and changes ranking / delta markers correctly.
4. Set small duration (min 1 minute) **before start**, let it expire; new catch is blocked, while operator correction can be recorded before finalization.
5. Finish and Save: final podium, Hall of Fame and Archive show scores; editing roster, point rules or scores no longer works. Attempt stale-tab overwrite returns error, not silent mutation.
6. Repeat SQUAD with 2 squads; contributions and final team ranking stay intact.
7. Test publisher-only edits (public visibility, featured and banner) on already finished event; scoring stays frozen.
8. Ensure responsive public leaderboard and timer on 375px mobile, tablet, desktop; verify long names do not overflow and no horizontal page scroll.
9. Test public logout/anon access cannot call admin state mutation endpoints.
10. Confirm V2.3 banner upload and Featured carousel and V2.4 `globals.css` setup remain unaffected.

## Rollback

Revert application source to V2.4 if needed; no database migration to undo. **However do not use a V2.4 admin after finalizing matches under V2.5**, as the old UI includes a reopen action. Keep V2.5 in place for frozen-event protection, or temporarily disable admin edits while rolling back.

Commit: `feat(weji-arena): add match lifecycle and locked final leaderboards`

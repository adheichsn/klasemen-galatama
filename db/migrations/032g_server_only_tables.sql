BEGIN;
-- V3.2G: all WEJI ARENA tables are server-only. No rows are changed.
-- Run as the Supabase database owner. The Next.js app connects as owner postgres.
-- Do not run with a custom app role that depends on anon/authenticated grants.
ALTER TABLE public.weji_arena_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_score_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_event_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_login_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_identity_audit ENABLE ROW LEVEL SECURITY;

DO $weji_security$
DECLARE
  table_name text;
  browser_role text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['weji_arena_state', 'weji_arena_audit', 'weji_arena_assets', 'weji_arena_score_audit', 'weji_arena_event_audit', 'weji_arena_login_limits', 'weji_arena_players', 'weji_arena_player_links', 'weji_arena_identity_audit'] LOOP
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC', table_name);
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', table_name, browser_role);
      END IF;
    END LOOP;
  END LOOP;
END;
$weji_security$;
-- Existing custom policies are not dropped. Verify effective privileges separately.
COMMIT;

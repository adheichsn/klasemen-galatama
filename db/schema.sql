-- Jalankan satu kali pada PostgreSQL/Supabase SQL Editor.
CREATE TABLE IF NOT EXISTS weji_arena_state (
  id integer PRIMARY KEY CHECK (id = 1),
  revision integer NOT NULL CHECK (revision >= 1),
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS weji_arena_audit (
  id bigserial PRIMARY KEY,
  revision integer NOT NULL,
  actor text NOT NULL,
  event_count integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
-- Login rate limits via operator's infrastructure/WAF are still recommended.

-- WEJI ARENA V2.3: gambar banner, terpisah dari JSON turnamen agar skor tetap ringan.
-- Aman dijalankan ulang pada database V2.2, tidak menghapus data lama.
CREATE TABLE IF NOT EXISTS weji_arena_assets (
  id uuid PRIMARY KEY,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  bytes bytea NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- WEJI ARENA V2.6: append-only event activity journal (server writes only).
-- Idempotent. Run again in Supabase SQL Editor BEFORE using V2.6.
CREATE TABLE IF NOT EXISTS weji_arena_score_audit (
  id bigserial PRIMARY KEY,
  revision integer NOT NULL,
  event_id text NOT NULL,
  event_title text NOT NULL,
  actor text NOT NULL,
  action text NOT NULL CHECK (action IN ('catch', 'manual', 'reversal', 'start', 'pause', 'resume', 'finish')),
  entry_id text,
  participant_id text,
  delta integer,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weji_arena_score_audit_event_idx
  ON weji_arena_score_audit (event_id, id DESC);
-- The table is written through the authenticated Next.js server.
-- Do not enable direct anonymous writes via Supabase Data API.

-- WEJI ARENA V2.7.1: Permanent deletion leaves a minimal event-level audit.
-- No entries, scoring details, or deleted event snapshot are retained here.
-- Safe/idempotent migration; existing tournaments are not changed.
CREATE TABLE IF NOT EXISTS weji_arena_event_audit (
  id bigserial PRIMARY KEY,
  revision integer NOT NULL,
  event_id text NOT NULL,
  event_title text NOT NULL,
  actor text NOT NULL,
  action text NOT NULL CHECK (action IN ('trash', 'restore', 'delete')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weji_arena_event_audit_event_idx
  ON weji_arena_event_audit (event_id, id DESC);

-- WEJI ARENA V3.0: durable, per-client + global login throttling.
-- Idempotent migration. No changes to scores, events or existing admin sessions.
CREATE TABLE IF NOT EXISTS weji_arena_login_limits (
  bucket text PRIMARY KEY,
  attempts integer NOT NULL CHECK (attempts >= 0),
  window_started timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weji_arena_login_limits_updated_idx
  ON weji_arena_login_limits (updated_at);
-- Optional maintenance for old, expired entries (schedule separately if needed):
-- DELETE FROM weji_arena_login_limits WHERE updated_at < now() - interval '7 days';

-- V3.2A: additive player identity registry.
-- V3.2A: identity metadata only. Run before deploying the new code.
CREATE TABLE IF NOT EXISTS public.weji_arena_players (
  roblox_id text PRIMARY KEY CHECK (roblox_id ~ '^[1-9][0-9]{0,15}$'),
  username text NOT NULL CHECK (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  avatar_url text,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.weji_arena_player_links (
  event_id text NOT NULL,
  participant_id text NOT NULL,
  roster_key text NOT NULL,
  roblox_id text NOT NULL REFERENCES public.weji_arena_players(roblox_id),
  PRIMARY KEY (event_id, participant_id),
  UNIQUE (event_id, roblox_id)
);
CREATE TABLE IF NOT EXISTS public.weji_arena_identity_audit (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL,
  participant_id text NOT NULL,
  previous_id text,
  next_id text,
  actor text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weji_arena_identity_audit_event_idx ON public.weji_arena_identity_audit(event_id);
ALTER TABLE public.weji_arena_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_player_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weji_arena_identity_audit ENABLE ROW LEVEL SECURITY;
-- No policies for browser roles. Server DATABASE_URL uses the database owner.

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

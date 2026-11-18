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

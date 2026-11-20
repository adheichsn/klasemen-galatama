-- V3.2A: identity metadata only. Run before deploying the new code.
BEGIN;
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
COMMIT;

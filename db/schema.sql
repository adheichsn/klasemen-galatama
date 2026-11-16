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

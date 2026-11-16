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

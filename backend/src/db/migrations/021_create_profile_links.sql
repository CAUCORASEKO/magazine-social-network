-- 021_create_profile_links.sql
-- Structured professional profile links

CREATE TABLE IF NOT EXISTS user_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_profile_links_user_id_idx
  ON user_profile_links (user_id);

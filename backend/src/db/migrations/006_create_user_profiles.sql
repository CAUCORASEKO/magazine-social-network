-- 006_create_user_profiles.sql
-- Optional professional presentation layer for users

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  account_type VARCHAR(32) NOT NULL
    CHECK (account_type IN ('personal', 'organization')),

  headline VARCHAR(255),
  bio TEXT,

  external_links JSONB,
  -- example:
  -- [
  --   { "label": "GitHub", "url": "https://github.com/username" },
  --   { "label": "Website", "url": "https://example.com" }
  -- ]

  visibility VARCHAR(32) NOT NULL
    CHECK (visibility IN ('private', 'public')),

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (user_id)
);
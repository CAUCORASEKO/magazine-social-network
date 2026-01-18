-- 003_create_users.sql
-- Users with real identity (no anonymous accounts)

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  professional_background TEXT NOT NULL,

  ui_language_id UUID NOT NULL
    REFERENCES languages(id),

  status VARCHAR(32) NOT NULL
    CHECK (status IN ('active', 'suspended')),

  created_at TIMESTAMP NOT NULL DEFAULT now()
);
-- 004_create_magazines.sql
-- Editorial channels with strict topic and language scope

CREATE TABLE magazines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  title VARCHAR(255) NOT NULL,
  description TEXT,

  primary_topic_id UUID NOT NULL
    REFERENCES topics(id),

  primary_language_id UUID NOT NULL
    REFERENCES languages(id),

  owner_user_id UUID NOT NULL
    REFERENCES users(id),

  status VARCHAR(32) NOT NULL
    CHECK (status IN ('active', 'archived')),

  created_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (owner_user_id, title)
);
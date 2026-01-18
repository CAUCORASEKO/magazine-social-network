-- 005_create_articles_and_versions.sql
-- Articles with editable version history

CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  magazine_id UUID NOT NULL
    REFERENCES magazines(id)
    ON DELETE CASCADE,

  author_user_id UUID NOT NULL
    REFERENCES users(id),

  language_id UUID NOT NULL
    REFERENCES languages(id),

  topic_id UUID NOT NULL
    REFERENCES topics(id),

  status VARCHAR(32) NOT NULL
    CHECK (status IN ('draft', 'submitted', 'published', 'rejected', 'archived')),

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  published_at TIMESTAMP
);

CREATE TABLE article_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  article_id UUID NOT NULL
    REFERENCES articles(id)
    ON DELETE CASCADE,

  version_number INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (article_id, version_number)
);
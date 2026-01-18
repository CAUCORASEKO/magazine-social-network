-- 001_create_languages_and_topics.sql

CREATE TABLE IF NOT EXISTS languages (
  id UUID PRIMARY KEY,
  code VARCHAR(5) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT
);
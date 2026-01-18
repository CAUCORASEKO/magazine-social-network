-- 002_seed_languages_and_topics.sql

INSERT INTO languages (id, code, name) VALUES
  (gen_random_uuid(), 'en', 'English'),
  (gen_random_uuid(), 'es', 'Spanish'),
  (gen_random_uuid(), 'fr', 'French'),
  (gen_random_uuid(), 'ru', 'Russian'),
  (gen_random_uuid(), 'fi', 'Finnish'),
  (gen_random_uuid(), 'sv', 'Swedish');

INSERT INTO topics (id, name, description) VALUES
  (gen_random_uuid(), 'Geopolitics', 'International relations and global affairs'),
  (gen_random_uuid(), 'Technology', 'Information technology and software'),
  (gen_random_uuid(), 'Science', 'Scientific research and discoveries'),
  (gen_random_uuid(), 'Economics', 'Markets, finance, and economic theory');
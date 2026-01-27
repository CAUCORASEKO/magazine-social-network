-- 020_add_professional_cv_url.sql
-- Add stored CV PDF URL for user profiles

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS professional_cv_url TEXT;

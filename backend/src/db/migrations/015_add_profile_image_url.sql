-- 015_add_profile_image_url.sql
-- Add profile photo URL to user profiles

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS profile_image_url TEXT;

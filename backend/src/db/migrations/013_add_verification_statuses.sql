-- 013_add_verification_statuses.sql
-- Add identity + professional verification metadata (idempotent)

ALTER TABLE users
ADD COLUMN IF NOT EXISTS identity_status TEXT NOT NULL DEFAULT 'unverified';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMP;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS identity_score INTEGER;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS professional_status TEXT NOT NULL DEFAULT 'empty';

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS professional_verified_at TIMESTAMP;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS professional_score INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_identity_status_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_identity_status_check
    CHECK (identity_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_professional_status_check'
  ) THEN
    ALTER TABLE user_profiles
    DROP CONSTRAINT user_profiles_professional_status_check;
  END IF;

  ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_professional_status_check
  CHECK (
    professional_status IN (
      'empty',
      'pending',
      'ai_verified',
      'rejected'
    )
  );
END $$;

-- 017_add_face_verification_status.sql
-- Extend identity status constraint with face verification

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_identity_status_check'
  ) THEN
    ALTER TABLE users
    DROP CONSTRAINT users_identity_status_check;
  END IF;

  ALTER TABLE users
  ADD CONSTRAINT users_identity_status_check
  CHECK (
    identity_status IN (
      'unverified',
      'document_uploaded',
      'face_verification',
      'pending',
      'verified',
      'rejected'
    )
  );
END $$;

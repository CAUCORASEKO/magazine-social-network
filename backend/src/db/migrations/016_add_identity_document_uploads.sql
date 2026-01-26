-- 016_add_identity_document_uploads.sql
-- Store identity document upload metadata

CREATE TABLE IF NOT EXISTS identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_documents_user_id_idx
  ON identity_documents (user_id);

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

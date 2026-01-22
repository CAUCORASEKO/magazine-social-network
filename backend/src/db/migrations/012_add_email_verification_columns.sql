ALTER TABLE auth_credentials
ADD COLUMN IF NOT EXISTS email_verification_token TEXT;

ALTER TABLE auth_credentials
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

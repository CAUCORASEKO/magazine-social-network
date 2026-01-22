-- 009_add_email_verification_fields.sql

ALTER TABLE auth_credentials
ADD COLUMN email_verification_token TEXT,
ADD COLUMN email_verified_at TIMESTAMP;

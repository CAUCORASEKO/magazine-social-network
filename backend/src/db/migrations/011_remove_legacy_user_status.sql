-- Remove legacy user status column (replaced by account_status)

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE users
  DROP COLUMN IF EXISTS status;
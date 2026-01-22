-- 009_add_account_status_to_users.sql

ALTER TABLE users
ADD COLUMN account_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (account_status IN ('pending', 'active'));

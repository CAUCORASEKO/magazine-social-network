-- 024_add_message_soft_delete_columns.sql
-- Add per-user soft delete timestamps for messages

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS deleted_by_sender_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS deleted_by_receiver_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS messages_deleted_sender_idx
  ON messages (deleted_by_sender_at);

CREATE INDEX IF NOT EXISTS messages_deleted_receiver_idx
  ON messages (deleted_by_receiver_at);

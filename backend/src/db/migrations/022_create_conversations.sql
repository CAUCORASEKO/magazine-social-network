-- 022_create_conversations.sql
-- Private user-to-user conversations

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT conversations_order_check CHECK (user_a_id < user_b_id),
  CONSTRAINT conversations_unique_pair UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON conversations (user_a_id);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON conversations (user_b_id);

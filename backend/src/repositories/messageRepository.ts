import { pool } from "../db/pool";

export interface ConversationRecord {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  reply_to: MessageReplyPreview | null;
}

export interface InboxConversation {
  conversation_id: string;
  conversation_created_at: string;
  peer_id: string;
  peer_full_name: string;
  peer_profile_image_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
}

export interface ConversationPeer {
  id: string;
  full_name: string;
  profile_image_url: string | null;
}

export interface MessageReplyPreview {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
}

function normalizeUserPair(userA: string, userB: string): {
  userA: string;
  userB: string;
} {
  return userA < userB ? { userA, userB } : { userA: userB, userB: userA };
}

export async function findConversationByUsers(
  userA: string,
  userB: string
): Promise<ConversationRecord | null> {
  const normalized = normalizeUserPair(userA, userB);
  const result = await pool.query<ConversationRecord>(
    `
    SELECT id, user_a_id, user_b_id, created_at
    FROM conversations
    WHERE user_a_id = $1 AND user_b_id = $2
    `,
    [normalized.userA, normalized.userB]
  );
  return result.rows[0] ?? null;
}

export async function createConversation(
  userA: string,
  userB: string
): Promise<ConversationRecord> {
  const normalized = normalizeUserPair(userA, userB);
  const result = await pool.query<ConversationRecord>(
    `
    INSERT INTO conversations (user_a_id, user_b_id)
    VALUES ($1, $2)
    RETURNING id, user_a_id, user_b_id, created_at
    `,
    [normalized.userA, normalized.userB]
  );
  return result.rows[0];
}

export async function getConversationForUser(
  conversationId: string,
  userId: string
): Promise<ConversationRecord | null> {
  const result = await pool.query<ConversationRecord>(
    `
    SELECT id, user_a_id, user_b_id, created_at
    FROM conversations
    WHERE id = $1
      AND (user_a_id = $2 OR user_b_id = $2)
    `,
    [conversationId, userId]
  );
  return result.rows[0] ?? null;
}

export async function listInboxForUser(userId: string): Promise<InboxConversation[]> {
  const result = await pool.query<InboxConversation>(
    `
    SELECT
      c.id AS conversation_id,
      c.created_at AS conversation_created_at,
      CASE
        WHEN c.user_a_id = $1 THEN c.user_b_id
        ELSE c.user_a_id
      END AS peer_id,
      u.full_name AS peer_full_name,
      up.profile_image_url AS peer_profile_image_url,
      m.body AS last_message_body,
      m.created_at AS last_message_at,
      m.sender_id AS last_message_sender_id
    FROM conversations c
    LEFT JOIN LATERAL (
      SELECT body, created_at, sender_id
      FROM messages
      WHERE conversation_id = c.id
        AND (
          (sender_id = $1 AND deleted_by_sender_at IS NULL)
          OR (sender_id <> $1 AND deleted_by_receiver_at IS NULL)
        )
      ORDER BY created_at DESC
      LIMIT 1
    ) m ON true
    JOIN users u
      ON u.id = CASE
        WHEN c.user_a_id = $1 THEN c.user_b_id
        ELSE c.user_a_id
      END
    LEFT JOIN user_profiles up
      ON up.user_id = u.id
    WHERE c.user_a_id = $1 OR c.user_b_id = $1
    ORDER BY m.created_at DESC NULLS LAST, c.created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function listMessagesByConversation(
  conversationId: string,
  userId: string
): Promise<MessageRecord[]> {
  const result = await pool.query<{
    id: string;
    conversation_id: string;
    sender_id: string;
    body: string;
    created_at: string;
    reply_id: string | null;
    reply_body: string | null;
    reply_sender_id: string | null;
    reply_created_at: string | null;
  }>(
    `
    SELECT
      m.id,
      m.conversation_id,
      m.sender_id,
      m.body,
      m.created_at,
      r.id AS reply_id,
      r.body AS reply_body,
      r.sender_id AS reply_sender_id,
      r.created_at AS reply_created_at
    FROM messages m
    LEFT JOIN messages r
      ON r.id = m.reply_to_message_id
     AND r.conversation_id = m.conversation_id
     AND (
       (r.sender_id = $2 AND r.deleted_by_sender_at IS NULL)
       OR (r.sender_id <> $2 AND r.deleted_by_receiver_at IS NULL)
     )
    WHERE m.conversation_id = $1
      AND (
        (m.sender_id = $2 AND m.deleted_by_sender_at IS NULL)
        OR (m.sender_id <> $2 AND m.deleted_by_receiver_at IS NULL)
      )
    ORDER BY created_at ASC
    `,
    [conversationId, userId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    body: row.body,
    created_at: row.created_at,
    reply_to:
      row.reply_id && row.reply_body && row.reply_sender_id && row.reply_created_at
        ? {
            id: row.reply_id,
            body: row.reply_body,
            sender_id: row.reply_sender_id,
            created_at: row.reply_created_at
          }
        : null
  }));
}

export async function deleteMessageForUser(
  messageId: string,
  userId: string
): Promise<{ message_id: string; conversation_id: string } | null> {
  const result = await pool.query<{ message_id: string; conversation_id: string }>(
    `
    WITH target AS (
      SELECT m.id, m.sender_id, m.conversation_id
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = $1
        AND (c.user_a_id = $2 OR c.user_b_id = $2)
    )
    UPDATE messages m
    SET
      deleted_by_sender_at = CASE
        WHEN target.sender_id = $2 THEN NOW()
        ELSE m.deleted_by_sender_at
      END,
      deleted_by_receiver_at = CASE
        WHEN target.sender_id <> $2 THEN NOW()
        ELSE m.deleted_by_receiver_at
      END
    FROM target
    WHERE m.id = target.id
    RETURNING m.id AS message_id, target.conversation_id
    `,
    [messageId, userId]
  );

  return result.rows[0] ?? null;
}

export async function clearConversationForUser(
  conversationId: string,
  userId: string
): Promise<number> {
  const result = await pool.query<{ id: string }>(
    `
    UPDATE messages m
    SET
      deleted_by_sender_at = CASE
        WHEN m.sender_id = $2 THEN NOW()
        ELSE m.deleted_by_sender_at
      END,
      deleted_by_receiver_at = CASE
        WHEN m.sender_id <> $2 THEN NOW()
        ELSE m.deleted_by_receiver_at
      END
    FROM conversations c
    WHERE m.conversation_id = c.id
      AND c.id = $1
      AND (c.user_a_id = $2 OR c.user_b_id = $2)
    RETURNING m.id
    `,
    [conversationId, userId]
  );

  return result.rowCount;
}

export async function getConversationPeer(
  conversationId: string,
  userId: string
): Promise<ConversationPeer | null> {
  const result = await pool.query<ConversationPeer>(
    `
    SELECT
      u.id,
      u.full_name,
      up.profile_image_url
    FROM conversations c
    JOIN users u
      ON u.id = CASE
        WHEN c.user_a_id = $2 THEN c.user_b_id
        ELSE c.user_a_id
      END
    LEFT JOIN user_profiles up
      ON up.user_id = u.id
    WHERE c.id = $1
      AND (c.user_a_id = $2 OR c.user_b_id = $2)
    `,
    [conversationId, userId]
  );
  return result.rows[0] ?? null;
}

export async function createMessage(
  conversationId: string,
  senderId: string,
  body: string,
  replyToMessageId: string | null
): Promise<MessageRecord> {
  const result = await pool.query<MessageRecord>(
    `
    INSERT INTO messages (conversation_id, sender_id, body, reply_to_message_id)
    VALUES ($1, $2, $3, $4)
    RETURNING id, conversation_id, sender_id, body, created_at
    `,
    [conversationId, senderId, body, replyToMessageId]
  );
  return {
    ...result.rows[0],
    reply_to: null
  };
}

export async function findMessageInConversation(
  messageId: string,
  conversationId: string
): Promise<{ id: string } | null> {
  const result = await pool.query<{ id: string }>(
    `
    SELECT id
    FROM messages
    WHERE id = $1 AND conversation_id = $2
    `,
    [messageId, conversationId]
  );
  return result.rows[0] ?? null;
}

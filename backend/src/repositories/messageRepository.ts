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
}

export interface InboxConversation {
  conversation_id: string;
  conversation_created_at: string;
  peer_id: string;
  peer_full_name: string;
  peer_profile_image_url: string | null;
  last_message_body: string | null;
  last_message_at: string | null;
}

export interface ConversationPeer {
  id: string;
  full_name: string;
  profile_image_url: string | null;
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
      m.created_at AS last_message_at
    FROM conversations c
    LEFT JOIN LATERAL (
      SELECT body, created_at
      FROM messages
      WHERE conversation_id = c.id
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
  conversationId: string
): Promise<MessageRecord[]> {
  const result = await pool.query<MessageRecord>(
    `
    SELECT id, conversation_id, sender_id, body, created_at
    FROM messages
    WHERE conversation_id = $1
    ORDER BY created_at ASC
    `,
    [conversationId]
  );
  return result.rows;
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
  body: string
): Promise<MessageRecord> {
  const result = await pool.query<MessageRecord>(
    `
    INSERT INTO messages (conversation_id, sender_id, body)
    VALUES ($1, $2, $3)
    RETURNING id, conversation_id, sender_id, body, created_at
    `,
    [conversationId, senderId, body]
  );
  return result.rows[0];
}

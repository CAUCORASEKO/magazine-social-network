import { pool } from "../db/pool";
import { Magazine } from "../models/Magazine";

export interface CreateMagazineInput {
  title: string;
  description: string | null;
  primary_topic_id: string;
  primary_language_id: string;
  owner_user_id: string;
}

export interface MagazineLookup {
  id: string;
  owner_user_id: string;
  primary_topic_id: string;
  primary_language_id: string;
}

export async function findMagazineById(
  id: string
): Promise<MagazineLookup | null> {
  const result = await pool.query<MagazineLookup>(
    `
    SELECT
      id,
      owner_user_id,
      primary_topic_id,
      primary_language_id
    FROM magazines
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function createMagazine(
  input: CreateMagazineInput
): Promise<Magazine> {
  const result = await pool.query<Magazine>(
    `
    INSERT INTO magazines (
      title,
      description,
      primary_topic_id,
      primary_language_id,
      owner_user_id,
      status
    )
    VALUES ($1, $2, $3, $4, $5, 'active')
    RETURNING
      id,
      title,
      description,
      primary_topic_id,
      primary_language_id,
      owner_user_id,
      status,
      created_at
    `,
    [
      input.title,
      input.description,
      input.primary_topic_id,
      input.primary_language_id,
      input.owner_user_id
    ]
  );

  return result.rows[0];
}

export async function listMagazinesByOwner(
  ownerUserId: string
): Promise<Magazine[]> {
  const result = await pool.query<Magazine>(
    `
    SELECT
      id,
      title,
      description,
      primary_topic_id,
      primary_language_id,
      owner_user_id,
      status,
      created_at
    FROM magazines
    WHERE owner_user_id = $1
      AND status = 'active'
    ORDER BY created_at DESC
    `,
    [ownerUserId]
  );

  return result.rows;
}

export async function findDefaultMagazineByOwner(
  ownerUserId: string
): Promise<Magazine | null> {
  const result = await pool.query<Magazine>(
    `
    SELECT
      id,
      title,
      description,
      primary_topic_id,
      primary_language_id,
      owner_user_id,
      status,
      created_at
    FROM magazines
    WHERE owner_user_id = $1
      AND status = 'active'
    ORDER BY created_at ASC
    LIMIT 1
    `,
    [ownerUserId]
  );

  return result.rows[0] ?? null;
}

export async function ensureDefaultMagazineForUser(params: {
  owner_user_id: string;
  primary_topic_id: string;
  primary_language_id: string;
  title: string;
  description: string | null;
}): Promise<Magazine> {
  const existing = await findDefaultMagazineByOwner(params.owner_user_id);
  if (existing) {
    return existing;
  }

  return createMagazine({
    title: params.title,
    description: params.description,
    primary_topic_id: params.primary_topic_id,
    primary_language_id: params.primary_language_id,
    owner_user_id: params.owner_user_id
  });
}

export async function listActiveMagazines(): Promise<Magazine[]> {
  const result = await pool.query<Magazine>(
    `
    SELECT
      id,
      title,
      description,
      primary_topic_id,
      primary_language_id,
      owner_user_id,
      status,
      created_at
    FROM magazines
    WHERE status = 'active'
    ORDER BY created_at DESC
    `
  );

  return result.rows;
}

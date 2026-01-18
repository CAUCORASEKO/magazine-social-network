import { pool } from "../db/pool";
import { Magazine } from "../models/Magazine";

export interface CreateMagazineInput {
  title: string;
  description: string | null;
  primary_topic_id: string;
  primary_language_id: string;
  owner_user_id: string;
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

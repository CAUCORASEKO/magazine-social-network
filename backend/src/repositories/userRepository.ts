import { pool } from "../db/pool";
import { User } from "../models/User";

/**
 * Find a user by id.
 * Used by auth stub and later by services.
 */
export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    `
    SELECT
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      status
    FROM users
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}
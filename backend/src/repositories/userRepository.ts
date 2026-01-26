import { pool } from "../db/pool";
import { User } from "../models/User";

export interface CreateUserInput {
  full_name: string;
  email: string;
  professional_background: string;
  ui_language_id: string;
  country: string;
}

/**
 * Find a user by id.
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
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    FROM users
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `
    SELECT
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    FROM users
    WHERE email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const result = await pool.query<User>(
    `
    INSERT INTO users (
      full_name,
      email,
      professional_background,
      ui_language_id,
      country
    )
    VALUES ($1, $2, $3, $4, $5)
    RETURNING
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    `,
    [
      input.full_name,
      input.email,
      input.professional_background,
      input.ui_language_id,
      input.country
    ]
  );

  return result.rows[0];
}

export async function updateAccountStatus(
  userId: string,
  status: User["account_status"]
): Promise<User> {
  const result = await pool.query<User>(
    `
    UPDATE users
    SET account_status = $2
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    `,
    [userId, status]
  );

  return result.rows[0];
}

export async function deleteUserById(userId: string): Promise<boolean> {
  const result = await pool.query(
    `
    DELETE FROM users
    WHERE id = $1
    `,
    [userId]
  );

  return result.rowCount > 0;
}

export async function updateIdentityStatus(
  userId: string,
  status: User["identity_status"]
): Promise<User> {
  const result = await pool.query<User>(
    `
    UPDATE users
    SET identity_status = $2,
        identity_verified_at = NULL,
        identity_score = NULL
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    `,
    [userId, status]
  );

  return result.rows[0];
}

export async function updateIdentityVerificationOutcome(
  userId: string,
  params: {
    status: "verified" | "rejected";
    verifiedAt: string | null;
  }
): Promise<User> {
  const result = await pool.query<User>(
    `
    UPDATE users
    SET identity_status = $2,
        identity_verified_at = $3,
        identity_score = NULL
    WHERE id = $1
    RETURNING
      id,
      full_name,
      email,
      professional_background,
      ui_language_id,
      country,
      account_status,
      identity_status,
      identity_verified_at,
      identity_score
    `,
    [userId, params.status, params.verifiedAt]
  );

  return result.rows[0];
}

import { pool } from "../db/pool";
import { User } from "../models/User";

export interface AuthCredential {
  user_id: string;
  password_hash: string;
  email_verified: boolean;
  email_verification_token?: string | null;
  email_verified_at?: string | null;
}

export async function createUserWithCredentials(params: {
  full_name: string;
  email: string;
  professional_background: string;
  ui_language_id: string;
  country: string;
  password_hash: string;
  email_verification_token: string;
}): Promise<User> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query<User>(
      `
      INSERT INTO users (
        full_name,
        email,
        professional_background,
        ui_language_id,
        country,
        account_status
      )
      VALUES ($1, $2, $3, $4, $5, 'pending')
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
        params.full_name,
        params.email,
        params.professional_background,
        params.ui_language_id,
        params.country
      ]
    );

    const user = userResult.rows[0];

    await client.query(
      `
      INSERT INTO auth_credentials (
        user_id,
        password_hash,
        email_verified,
        email_verification_token
      )
      VALUES ($1, $2, false, $3)
      `,
      [user.id, params.password_hash, params.email_verification_token]
    );

    await client.query("COMMIT");
    return user;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findAuthCredentialByUserId(
  userId: string
): Promise<AuthCredential | null> {
  const result = await pool.query<AuthCredential>(
    `
    SELECT
      user_id,
      password_hash,
      email_verified
    FROM auth_credentials
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function findAuthCredentialByEmail(email: string): Promise<{
  user_id: string;
  password_hash: string;
  email_verified: boolean;
} | null> {
  const result = await pool.query<{
    user_id: string;
    password_hash: string;
    email_verified: boolean;
  }>(
    `
    SELECT ac.user_id, ac.password_hash, ac.email_verified
    FROM auth_credentials ac
    JOIN users u ON u.id = ac.user_id
    WHERE u.email = $1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function verifyEmailByToken(token: string): Promise<string | null> {
  const result = await pool.query<{ user_id: string }>(
    `
    UPDATE auth_credentials
    SET
      email_verified = true,
      email_verification_token = NULL,
      email_verified_at = now(),
      updated_at = now()
    WHERE email_verification_token = $1
    RETURNING user_id
    `,
    [token]
  );

  return result.rows[0]?.user_id ?? null;
}

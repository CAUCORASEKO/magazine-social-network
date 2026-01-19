import { pool } from "../db/pool";

export interface PublicUserProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: unknown | null;
  visibility: "public";
}

export interface UpsertUserProfileInput {
  headline: string | null;
  bio: string | null;
  external_links: string[] | null;
  visibility: "public" | "private";
}

export interface UserProfileRecord {
  user_id: string;
  headline: string | null;
  bio: string | null;
  external_links: unknown | null;
  visibility: "public" | "private";
}

export async function getPublicProfileByUserId(
  userId: string
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `
    SELECT
      u.id AS user_id,
      u.full_name,
      up.headline,
      up.bio,
      up.external_links,
      up.visibility
    FROM users u
    JOIN user_profiles up
      ON up.user_id = u.id
    WHERE u.id = $1
      AND up.visibility = 'public'
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function upsertUserProfileByUserId(
  userId: string,
  input: UpsertUserProfileInput
): Promise<UserProfileRecord> {
  const result = await pool.query<UserProfileRecord>(
    `
    INSERT INTO user_profiles (
      user_id,
      account_type,
      headline,
      bio,
      external_links,
      visibility
    )
    VALUES ($1, 'personal', $2, $3, $4::jsonb, $5)
    ON CONFLICT (user_id)
    DO UPDATE SET
      headline = EXCLUDED.headline,
      bio = EXCLUDED.bio,
      external_links = EXCLUDED.external_links,
      visibility = EXCLUDED.visibility,
      updated_at = now()
    RETURNING
      user_id,
      headline,
      bio,
      external_links,
      visibility
    `,
    [
      userId,
      input.headline,
      input.bio,
      input.external_links
        ? JSON.stringify(input.external_links)
        : null,
      input.visibility
    ]
  );

  return result.rows[0];
}
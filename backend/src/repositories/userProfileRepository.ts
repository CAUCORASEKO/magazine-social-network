import { pool } from "../db/pool";
import {
  PROFESSIONAL_STATUS,
  type IdentityStatus,
  type ProfessionalStatus
} from "../constants/verification";

export interface PublicUserProfile {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: unknown | null;
  visibility: "public";
  identity_status: IdentityStatus;
  professional_status: ProfessionalStatus;
}

export interface ProfileDetail {
  user_id: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  external_links: unknown | null;
  visibility: "public" | "private";
  identity_status: IdentityStatus;
  professional_status: ProfessionalStatus;
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
  professional_status: ProfessionalStatus;
}

export interface ProfessionalVerificationRecord {
  user_id: string;
  professional_status: ProfessionalStatus;
  professional_score: number | null;
  professional_verified_at: string | null;
}

/**
 * Perfil público (para /profiles/:userId)
 */
export async function getPublicProfileByUserId(
  userId: string
): Promise<PublicUserProfile | null> {
  const result = await pool.query<PublicUserProfile>(
    `
    SELECT
      u.id AS user_id,
      u.full_name,
      u.identity_status,
      up.headline,
      up.bio,
      up.external_links,
      up.visibility,
      up.professional_status
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

/**
 * Perfil privado / propio (para /profile)
 */
export async function getProfileByUserId(
  userId: string
): Promise<ProfileDetail | null> {
  const result = await pool.query<ProfileDetail>(
    `
    SELECT
      u.id AS user_id,
      u.full_name,
      u.identity_status,
      up.headline,
      up.bio,
      up.external_links,
      up.visibility,
      up.professional_status
    FROM user_profiles up
    JOIN users u
      ON u.id = up.user_id
    WHERE up.user_id = $1
    `,
    [userId]
  );

  return result.rows[0] ?? null;
}

/**
 * Crear o actualizar perfil
 */
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
      visibility,
      professional_status
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

export async function updateProfessionalVerificationStatus(
  userId: string,
  params: {
    professional_status: ProfessionalStatus;
    professional_score: number | null;
    professional_verified_at: string | null;
  }
): Promise<ProfessionalVerificationRecord> {
  const allowedStatuses: ProfessionalStatus[] = [
    PROFESSIONAL_STATUS.EMPTY,
    PROFESSIONAL_STATUS.PENDING,
    PROFESSIONAL_STATUS.AI_VERIFIED,
    PROFESSIONAL_STATUS.REJECTED
  ];

  if (!allowedStatuses.includes(params.professional_status)) {
    throw new Error("Invalid professional status");
  }

  const result = await pool.query<ProfessionalVerificationRecord>(
    `
    UPDATE user_profiles
    SET professional_status = $2,
        professional_score = $3,
        professional_verified_at = $4,
        updated_at = now()
    WHERE user_id = $1
    RETURNING
      user_id,
      professional_status,
      professional_score,
      professional_verified_at
    `,
    [
      userId,
      params.professional_status,
      params.professional_score,
      params.professional_verified_at
    ]
  );

  return result.rows[0];
}

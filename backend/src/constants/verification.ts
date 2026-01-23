export const IDENTITY_STATUS = {
  UNVERIFIED: "unverified",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected"
} as const;

export const PROFESSIONAL_STATUS = {
  EMPTY: "empty",
  AI_VERIFIED: "ai_verified",
  PENDING: "pending",
  REJECTED: "rejected"
} as const;

export type IdentityStatus = (typeof IDENTITY_STATUS)[keyof typeof IDENTITY_STATUS];
export type ProfessionalStatus =
  (typeof PROFESSIONAL_STATUS)[keyof typeof PROFESSIONAL_STATUS];

export function isIdentityVerified(status: IdentityStatus): boolean {
  return status === IDENTITY_STATUS.VERIFIED;
}

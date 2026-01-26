export const IDENTITY_STATUS = {
  UNVERIFIED: "unverified",
  DOCUMENT_UPLOADED: "document_uploaded",
  FACE_VERIFICATION: "face_verification",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected"
} as const;

export const PROFESSIONAL_STATUS = {
  EMPTY: "empty",
  PENDING: "pending",
  AI_VERIFIED: "ai_verified",
  REJECTED: "rejected"
} as const;

export type IdentityStatus = (typeof IDENTITY_STATUS)[keyof typeof IDENTITY_STATUS];
export type ProfessionalStatus =
  (typeof PROFESSIONAL_STATUS)[keyof typeof PROFESSIONAL_STATUS];

export function isIdentityVerified(status: IdentityStatus): boolean {
  return status === IDENTITY_STATUS.VERIFIED;
}

export function isProfessionalVerified(status: ProfessionalStatus): boolean {
  return status === PROFESSIONAL_STATUS.AI_VERIFIED;
}

import { PROFESSIONAL_STATUS } from "../constants/verification";
import { findUserById } from "../repositories/userRepository";
import {
  getProfileByUserId,
  updateProfessionalVerificationStatus
} from "../repositories/userProfileRepository";

export async function analyzeProfessionalProfile(userId: string): Promise<void> {
  const [user, profile] = await Promise.all([
    findUserById(userId),
    getProfileByUserId(userId)
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  if (profile.professional_status !== PROFESSIONAL_STATUS.PENDING) {
    throw new Error("Professional verification must be pending");
  }

  const headlineLength = profile.headline ? profile.headline.length : 0;
  const bioLength = profile.bio ? profile.bio.length : 0;
  const score = headlineLength + bioLength > 100 ? 80 : 40;

  const status =
    score >= 75
      ? PROFESSIONAL_STATUS.AI_VERIFIED
      : PROFESSIONAL_STATUS.REJECTED;

  await updateProfessionalVerificationStatus(userId, {
    professional_status: status,
    professional_score: score,
    professional_verified_at:
      status === PROFESSIONAL_STATUS.AI_VERIFIED
        ? new Date().toISOString()
        : null
  });
}

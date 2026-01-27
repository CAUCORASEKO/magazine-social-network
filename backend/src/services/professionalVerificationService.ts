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

  await updateProfessionalVerificationStatus(userId, {
    professional_status: PROFESSIONAL_STATUS.AI_VERIFIED,
    professional_score: null,
    professional_verified_at: new Date().toISOString()
  });
}

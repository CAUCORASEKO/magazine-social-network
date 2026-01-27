import { PROFESSIONAL_STATUS } from "../constants/verification";
import { findUserById } from "../repositories/userRepository";
import { getProfileByUserId } from "../repositories/userProfileRepository";
import { getProfileCvByUserId } from "../repositories/profileCvRepository";
import { updateProfessionalVerificationStatus } from "../repositories/userProfileRepository";

type VerificationDecision = "ai_verified";

interface VerificationResult {
  decision: VerificationDecision;
  reasons: string[];
}

export async function analyzeProfessionalProfile(
  userId: string
): Promise<VerificationResult> {
  const [user, profile, cv] = await Promise.all([
    findUserById(userId),
    getProfileByUserId(userId),
    getProfileCvByUserId(userId)
  ]);

  if (!user) {
    throw new Error("User not found");
  }

  if (!profile) {
    throw new Error("Profile not found");
  }

  const reasons: string[] = [];
  if (profile.headline || profile.bio) {
    reasons.push("Profile summary captured.");
  }
  if (cv.education.length || cv.experience.length || cv.skills.length) {
    reasons.push("Structured career history captured.");
  }

  const decision: VerificationDecision = PROFESSIONAL_STATUS.AI_VERIFIED;

  await updateProfessionalVerificationStatus(userId, {
    professional_status: decision,
    professional_score: null,
    professional_verified_at: new Date().toISOString()
  });

  return {
    decision,
    reasons: reasons.length ? reasons : ["Structured professional data captured."]
  };
}

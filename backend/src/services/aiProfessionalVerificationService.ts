import { PROFESSIONAL_STATUS } from "../constants/verification";
import { findUserById } from "../repositories/userRepository";
import { getProfileByUserId } from "../repositories/userProfileRepository";
import { getProfileCvByUserId } from "../repositories/profileCvRepository";
import { updateProfessionalVerificationStatus } from "../repositories/userProfileRepository";

type VerificationDecision = "ai_verified" | "rejected";

interface VerificationResult {
  score: number;
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

  if (profile.professional_status !== PROFESSIONAL_STATUS.PENDING) {
    throw new Error("Professional verification must be pending");
  }

  const reasons: string[] = [];
  let score = 0;
  const bioThreshold = 120;

  const educationCount = cv.education.length;
  if (educationCount > 0) {
    score += 20;
    reasons.push(
      `Includes ${educationCount} education entr${educationCount === 1 ? "y" : "ies"}.`
    );
  } else {
    reasons.push("Add at least one education entry.");
  }

  const experienceCount = cv.experience.length;
  if (experienceCount > 0) {
    score += 20;
    reasons.push(
      `Includes ${experienceCount} experience entr${
        experienceCount === 1 ? "y" : "ies"
      }.`
    );
  } else {
    reasons.push("Add at least one work experience entry.");
  }

  const headlineLength = profile.headline ? profile.headline.trim().length : 0;
  if (headlineLength > 0) {
    score += 20;
    reasons.push("Profile headline is present.");
  } else {
    reasons.push("Add a concise professional headline.");
  }

  const bioLength = profile.bio ? profile.bio.trim().length : 0;
  if (bioLength >= bioThreshold) {
    score += 20;
    reasons.push("Profile bio is detailed enough for review.");
  } else {
    reasons.push("Expand the bio with more professional context.");
  }

  const profileLinks = Array.isArray(profile.external_links)
    ? profile.external_links.length
    : 0;
  const cvLinks = cv.links.length;
  if (profileLinks + cvLinks > 0) {
    score += 20;
    reasons.push("Includes professional links.");
  } else {
    reasons.push("Add at least one professional link.");
  }

  score = Math.min(100, Math.max(0, score));

  const decision: VerificationDecision =
    score >= 70 ? PROFESSIONAL_STATUS.AI_VERIFIED : PROFESSIONAL_STATUS.REJECTED;

  await updateProfessionalVerificationStatus(userId, {
    professional_status: decision,
    professional_score: score,
    professional_verified_at:
      decision === PROFESSIONAL_STATUS.AI_VERIFIED
        ? new Date().toISOString()
        : null
  });

  return {
    score,
    decision,
    reasons
  };
}

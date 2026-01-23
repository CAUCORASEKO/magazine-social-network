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

  const educationCount = cv.education.length;
  if (educationCount > 0) {
    score += 20;
    reasons.push(`Includes ${educationCount} education entr${educationCount === 1 ? "y" : "ies"}.`);
  } else {
    reasons.push("Add at least one education entry.");
  }

  const experienceCount = cv.experience.length;
  if (experienceCount > 0) {
    score += 30;
    reasons.push(`Includes ${experienceCount} experience entr${experienceCount === 1 ? "y" : "ies"}.`);
  } else {
    reasons.push("Add at least one work experience entry.");
  }

  const projectsCount = cv.projects.length;
  if (projectsCount > 0) {
    score += 15;
    reasons.push(`Includes ${projectsCount} project entr${projectsCount === 1 ? "y" : "ies"}.`);
  } else {
    reasons.push("Add at least one project entry.");
  }

  const linksCount = cv.links.length;
  if (linksCount > 0) {
    score += 10;
    reasons.push(`Includes ${linksCount} external link${linksCount === 1 ? "" : "s"}.`);
  } else {
    reasons.push("Add at least one professional link.");
  }

  const headlineLength = profile.headline ? profile.headline.trim().length : 0;
  const bioLength = profile.bio ? profile.bio.trim().length : 0;
  const narrativeLength = headlineLength + bioLength;
  if (narrativeLength >= 120) {
    score += 25;
    reasons.push("Profile summary is detailed and informative.");
  } else {
    reasons.push("Expand your headline and bio for a stronger professional summary.");
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

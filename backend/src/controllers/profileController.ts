import type { Request, Response, NextFunction } from "express";
import { promises as fs, constants as fsConstants } from "node:fs";
import path from "node:path";
import {
  getProfileByUserId,
  updateProfessionalVerificationStatus,
  updateProfileImageUrl,
  upsertUserProfileByUserId
} from "../repositories/userProfileRepository";
import {
  findUserById,
  updateIdentityStatus,
  updateIdentityVerificationOutcome
} from "../repositories/userRepository";
import { IDENTITY_STATUS, PROFESSIONAL_STATUS } from "../constants/verification";
import {
  createIdentityDocument,
  deleteIdentityDocumentsByUserId,
  getIdentityDocumentsByUserId
} from "../repositories/identityDocumentRepository";
import {
  getProfileCvByUserId,
  upsertProfileCvByUserId,
  type ProfileCvPayload
} from "../repositories/profileCvRepository";
import { extractTextFromPdf, parseCvText } from "../services/cvParsingService";

interface UpsertProfileBody {
  headline?: unknown;
  bio?: unknown;
  external_links?: unknown;
  visibility?: unknown;
  profile_image_url?: unknown;
}

export async function getPublicProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId.trim()
        : "";

    if (!userId) {
      res.status(400).json({ error: "User id is required" });
      return;
    }

    const user = await findUserById(userId);
    if (!user || user.account_status !== "active") {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = await getProfileByUserId(userId);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    if (profile.visibility !== "public" && req.session?.userId !== userId) {
      res.status(403).json({ error: "Profile is private" });
      return;
    }

    res.json(profile);
  } catch (error) {
    next(error);
  }
}

export async function upsertMyProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as UpsertProfileBody;

    let headline: string | null = null;
    if (body.headline !== undefined) {
      if (typeof body.headline !== "string") {
        res.status(400).json({ error: "Headline must be a string" });
        return;
      }
      const trimmed = body.headline.trim();
      if (trimmed.length > 255) {
        res.status(400).json({ error: "Headline is too long" });
        return;
      }
      headline = trimmed.length ? trimmed : null;
    }

    let bio: string | null = null;
    if (body.bio !== undefined) {
      if (typeof body.bio !== "string") {
        res.status(400).json({ error: "Bio must be a string" });
        return;
      }
      const trimmed = body.bio.trim();
      bio = trimmed.length ? trimmed : null;
    }

    let externalLinks: string[] | null = null;
    if (body.external_links !== undefined) {
      if (!Array.isArray(body.external_links)) {
        res.status(400).json({ error: "External links must be an array" });
        return;
      }

      externalLinks = body.external_links.map((link) => {
        if (typeof link !== "string") {
          throw new Error("External links must be strings");
        }
        const trimmed = link.trim();
        if (!trimmed) {
          throw new Error("External link is required");
        }
        try {
          const parsed = new URL(trimmed);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            throw new Error("External link must be http or https");
          }
        } catch {
          throw new Error("External link must be a valid URL");
        }
        return trimmed;
      });
    }

    if (externalLinks && externalLinks.length === 0) {
      externalLinks = [];
    }

    if (body.visibility === undefined) {
      res.status(400).json({ error: "Visibility is required" });
      return;
    }

    if (body.visibility !== "public" && body.visibility !== "private") {
      res.status(400).json({ error: "Visibility must be public or private" });
      return;
    }

    let profileImageUrl: string | null | undefined;
    if (body.profile_image_url !== undefined) {
      if (body.profile_image_url === null || body.profile_image_url === "") {
        profileImageUrl = null;
      } else if (typeof body.profile_image_url !== "string") {
        res.status(400).json({ error: "Profile image URL must be a string" });
        return;
      } else {
        const trimmed = body.profile_image_url.trim();
        if (!trimmed) {
          profileImageUrl = null;
        } else if (trimmed.startsWith("/")) {
          profileImageUrl = trimmed;
        } else {
          try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
              throw new Error("Profile image URL must be http or https");
            }
            profileImageUrl = trimmed;
          } catch {
            res.status(400).json({ error: "Profile image URL must be a valid URL" });
            return;
          }
        }
      }
    }

    const profile = await upsertUserProfileByUserId(req.user.id, {
      headline,
      bio,
      external_links: externalLinks,
      visibility: body.visibility,
      ...(body.profile_image_url !== undefined
        ? { profile_image_url: profileImageUrl ?? null }
        : {})
    });

    res.json(profile);
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "External links must be strings" ||
        error.message === "External link is required" ||
        error.message === "External link must be http or https" ||
        error.message === "External link must be a valid URL"
      ) {
        res.status(400).json({ error: error.message });
        return;
      }
    }
    next(error);
  }
}

export async function requestProfessionalVerificationHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profile = await getProfileByUserId(req.user.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const cv = await getProfileCvByUserId(req.user.id);
    const hasData =
      Boolean(profile.headline) || Boolean(profile.bio) || hasCvData(cv);
    if (!hasData) {
      res.status(400).json({
        error: "Add structured professional background before verification."
      });
      return;
    }

    const updated = await markProfessionalVerified(
      req.user.id,
      profile.professional_verified_at
    );

    res.json({
      professional_status: updated.professional_status,
      professional_verified_at: updated.professional_verified_at
    });
  } catch (error) {
    next(error);
  }
}

export async function uploadProfilePhotoHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Photo file is required" });
      return;
    }

    const profile = await getProfileByUserId(req.user.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profileImageUrl = `/uploads/profile-images/${file.filename}`;
    await updateProfileImageUrl(req.user.id, profileImageUrl);

    if (profile.profile_image_url && profile.profile_image_url !== profileImageUrl) {
      await removeLocalProfileImage(profile.profile_image_url);
    }

    res.json({ profile_image_url: profileImageUrl });
  } catch (error) {
    next(error);
  }
}

export async function uploadIdentityDocumentHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Document file is required" });
      return;
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const uploadsRoot = path.join(process.cwd(), "uploads");
    const relativePath = path.relative(uploadsRoot, file.path);
    const normalizedPath = relativePath.split(path.sep).join("/");
    const uploadedAt = new Date().toISOString();

    await createIdentityDocument({
      userId: req.user.id,
      fileName: file.filename,
      fileType: file.mimetype,
      filePath: normalizedPath,
      uploadedAt
    });

    const updated = await updateIdentityStatus(
      req.user.id,
      IDENTITY_STATUS.DOCUMENT_UPLOADED
    );

    res.json({
      identity_status: updated.identity_status
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyFaceHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "Face capture is required" });
      return;
    }

    const user = await findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (
      user.identity_status !== IDENTITY_STATUS.DOCUMENT_UPLOADED &&
      user.identity_status !== IDENTITY_STATUS.FACE_VERIFICATION
    ) {
      res.status(400).json({ error: "Identity verification is not ready yet" });
      return;
    }

    let approved = false;
    try {
      await fs.access(file.path, fsConstants.R_OK);
      approved = true;
    } catch {
      approved = false;
    }

    const verifiedAt = approved ? new Date().toISOString() : null;
    const updated = await updateIdentityVerificationOutcome(user.id, {
      status: approved ? IDENTITY_STATUS.VERIFIED : IDENTITY_STATUS.REJECTED,
      verifiedAt
    });

    await cleanupIdentityArtifacts(user.id, file.path);

    res.json({ identity_status: updated.identity_status });
  } catch (error) {
    next(error);
  }
}

async function removeLocalProfileImage(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) {
    return;
  }
  const relativePath = url.replace(/^\/uploads\//, "");
  const filePath = path.join(process.cwd(), "uploads", relativePath);
  try {
    await fs.unlink(filePath);
  } catch {
    return;
  }
}

async function removeLocalProfileCvFiles(userId: string): Promise<void> {
  const cvDir = path.join(process.cwd(), "uploads", "cv", userId);
  try {
    const entries = await fs.readdir(cvDir);
    await Promise.all(
      entries.map((entry) => fs.unlink(path.join(cvDir, entry)))
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      return;
    }
  }
}

async function cleanupIdentityArtifacts(
  userId: string,
  facePath: string
): Promise<void> {
  const uploadsRoot = path.join(process.cwd(), "uploads");
  try {
    const docs = await getIdentityDocumentsByUserId(userId);
    for (const doc of docs) {
      if (!doc.file_path) {
        continue;
      }
      const normalizedPath = doc.file_path.startsWith("/")
        ? doc.file_path.slice(1)
        : doc.file_path;
      const docPath = path.join(uploadsRoot, normalizedPath);
      await safeUnlink(docPath);
    }
  } catch {
    // ignore cleanup errors
  }

  await safeUnlink(facePath);

  try {
    await deleteIdentityDocumentsByUserId(userId);
  } catch {
    return;
  }
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    return;
  }
}

function normalizeString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label} is required`);
  }
  return trimmed;
}

function normalizeOptionalString(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function coerceOptionalString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeOptionalNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function coerceOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }
  return value;
}

function normalizeOptionalDate(value: unknown, label: string): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function coerceOptionalDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCvPayload(body: unknown): ProfileCvPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const data = body as {
    education?: unknown;
    experience?: unknown;
    projects?: unknown;
    skills?: unknown;
    links?: unknown;
  };

  const educationInput = Array.isArray(data.education) ? data.education : [];
  const experienceInput = Array.isArray(data.experience) ? data.experience : [];
  const projectsInput = Array.isArray(data.projects) ? data.projects : [];
  const skillsInput = Array.isArray(data.skills) ? data.skills : [];
  const linksInput = Array.isArray(data.links) ? data.links : [];

  const education = educationInput.reduce<ProfileCvPayload["education"]>(
    (acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const entry = item as Record<string, unknown>;
      const institution = coerceOptionalString(entry.institution);
      if (!institution) {
        return acc;
      }
      acc.push({
        institution,
        degree: coerceOptionalString(entry.degree),
        field_of_study: coerceOptionalString(entry.field_of_study),
        start_year: coerceOptionalNumber(entry.start_year),
        end_year: coerceOptionalNumber(entry.end_year)
      });
      return acc;
    },
    []
  );

  const experience = experienceInput.reduce<ProfileCvPayload["experience"]>(
    (acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const entry = item as Record<string, unknown>;
      const company = coerceOptionalString(entry.company);
      const role = coerceOptionalString(entry.role);
      if (!company || !role) {
        return acc;
      }
      const isCurrent = Boolean(entry.is_current);
      acc.push({
        company,
        role,
        description: coerceOptionalString(entry.description),
        start_date: coerceOptionalDate(entry.start_date),
        end_date: isCurrent
          ? null
          : coerceOptionalDate(entry.end_date)
      });
      return acc;
    },
    []
  );

  const projects = projectsInput.reduce<ProfileCvPayload["projects"]>(
    (acc, item) => {
      if (!item || typeof item !== "object") {
        return acc;
      }
      const entry = item as Record<string, unknown>;
      const name = coerceOptionalString(entry.name);
      if (!name) {
        return acc;
      }
      acc.push({
        name,
        description: coerceOptionalString(entry.description),
        link: coerceOptionalString(entry.url ?? entry.link)
      });
      return acc;
    },
    []
  );

  const links = linksInput.reduce<ProfileCvPayload["links"]>((acc, item) => {
    if (!item || typeof item !== "object") {
      return acc;
    }
    const entry = item as Record<string, unknown>;
    const url = coerceOptionalString(entry.url);
    if (!url) {
      return acc;
    }
    acc.push({
      label: coerceOptionalString(entry.label),
      url
    });
    return acc;
  }, []);

  const skills = skillsInput.reduce<ProfileCvPayload["skills"]>((acc, item) => {
    if (!item || typeof item !== "object") {
      return acc;
    }
    const entry = item as Record<string, unknown>;
    const name = coerceOptionalString(entry.name);
    if (!name) {
      return acc;
    }
    acc.push({ name });
    return acc;
  }, []);

  return {
    education,
    experience,
    projects,
    links,
    skills
  };
}

function hasCvData(payload: ProfileCvPayload): boolean {
  return (
    payload.education.length > 0 ||
    payload.experience.length > 0 ||
    payload.projects.length > 0 ||
    payload.links.length > 0 ||
    payload.skills.length > 0
  );
}

function toApiCvResponse(payload: ProfileCvPayload): {
  education: Array<{
    institution: string;
    degree: string | null;
    start_year: number | null;
    end_year: number | null;
  }>;
  experience: Array<{
    company: string;
    role: string;
    start_date: string | null;
    end_date: string | null;
    description: string | null;
    is_current: boolean;
  }>;
  projects: Array<{
    name: string;
    description: string | null;
    url: string | null;
  }>;
  links: Array<{ label: string | null; url: string }>;
  skills: Array<{ name: string }>;
} {
  return {
    education: payload.education.map((item) => ({
      institution: item.institution,
      degree: item.degree,
      start_year: item.start_year,
      end_year: item.end_year
    })),
    experience: payload.experience.map((item) => ({
      company: item.company,
      role: item.role,
      start_date: item.start_date,
      end_date: item.end_date,
      description: item.description,
      is_current: !item.end_date
    })),
    projects: payload.projects.map((item) => ({
      name: item.name,
      description: item.description,
      url: item.link
    })),
    links: payload.links.map((item) => ({
      label: item.label,
      url: item.url
    })),
    skills: payload.skills.map((item) => ({ name: item.name }))
  };
}

function coerceExternalLinks(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter((link) => typeof link === "string") as string[];
        }
      } catch {
        return null;
      }
    }
    return null;
  }
  return value.filter((link) => typeof link === "string") as string[];
}

async function markProfessionalVerified(
  userId: string,
  existingVerifiedAt: string | null
) {
  const verifiedAt = existingVerifiedAt ?? new Date().toISOString();
  return updateProfessionalVerificationStatus(userId, {
    professional_status: PROFESSIONAL_STATUS.AI_VERIFIED,
    professional_score: null,
    professional_verified_at: verifiedAt
  });
}

export async function uploadProfileCvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({ error: "CV file is required" });
      return;
    }

    if (file.mimetype !== "application/pdf") {
      res.status(400).json({ error: "Only PDF files are allowed" });
      return;
    }

    const profile = await getProfileByUserId(req.user.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const uploadsRoot = path.join(process.cwd(), "uploads");
    const relativePath = path.relative(uploadsRoot, file.path);
    const normalizedPath = relativePath.split(path.sep).join("/");
    const cvUrl = `/uploads/${normalizedPath}`;

    let savedCv = await getProfileCvByUserId(req.user.id);
    let updatedHeadline = profile.headline;
    let updatedBio = profile.bio;

    try {
      const text = await extractTextFromPdf(file.path);
      const parsed = parseCvText(text);

      const payload: ProfileCvPayload = {
        education: parsed.education.length ? parsed.education : savedCv.education,
        experience: parsed.experience.length ? parsed.experience : savedCv.experience,
        projects: savedCv.projects,
        links: savedCv.links,
        skills: parsed.skills.length ? parsed.skills : savedCv.skills
      };

      savedCv = await upsertProfileCvByUserId(req.user.id, payload);

      if (parsed.headline || parsed.bio) {
        const updatedProfile = await upsertUserProfileByUserId(req.user.id, {
          headline: parsed.headline ?? profile.headline,
          bio: parsed.bio ?? profile.bio,
          external_links: coerceExternalLinks(profile.external_links),
          visibility: profile.visibility
        });
        updatedHeadline = updatedProfile.headline;
        updatedBio = updatedProfile.bio;
      }
    } catch {
      // Best-effort parsing only; ignore failures.
    }

    const verification = await markProfessionalVerified(
      req.user.id,
      profile.professional_verified_at
    );

    res.json({
      profile: {
        headline: updatedHeadline,
        bio: updatedBio
      },
      cv: toApiCvResponse(savedCv),
      professional_status: verification.professional_status,
      professional_verified_at: verification.professional_verified_at
    });
  } catch (error) {
    next(error);
  }
}

export async function removeProfileCvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const profile = await getProfileByUserId(req.user.id);
    if (!profile) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    await removeLocalProfileCvFiles(req.user.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getProfileCvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const payload = await getProfileCvByUserId(req.user.id);
    res.json(toApiCvResponse(payload));
  } catch (error) {
    next(error);
  }
}

export async function getPublicProfileCvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId =
      typeof req.params.userId === "string"
        ? req.params.userId.trim()
        : "";

    if (!userId) {
      res.status(400).json({ error: "User id is required" });
      return;
    }

    const user = await findUserById(userId);
    if (!user || user.account_status !== "active") {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = await getProfileByUserId(userId);
    if (!profile || profile.visibility !== "public") {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const payload = await getProfileCvByUserId(userId);
    res.json(toApiCvResponse(payload));
  } catch (error) {
    next(error);
  }
}

export async function upsertProfileCvHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    let payload: ProfileCvPayload;
    try {
      payload = normalizeCvPayload(req.body);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid payload"
      });
      return;
    }

    const saved = await upsertProfileCvByUserId(req.user.id, payload);
    let verification = null;

    if (hasCvData(payload)) {
      const profile = await getProfileByUserId(req.user.id);
      if (!profile) {
        res.status(404).json({ error: "Profile not found" });
        return;
      }
      verification = await markProfessionalVerified(
        req.user.id,
        profile.professional_verified_at
      );
    }

    res.json({
      ...toApiCvResponse(saved),
      professional_status: verification?.professional_status ?? null,
      professional_verified_at: verification?.professional_verified_at ?? null
    });
  } catch (error) {
    next(error);
  }
}

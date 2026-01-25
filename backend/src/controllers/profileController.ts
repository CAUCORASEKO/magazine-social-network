import type { Request, Response, NextFunction } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getProfileByUserId,
  updateProfessionalVerificationStatus,
  updateProfileImageUrl,
  upsertUserProfileByUserId
} from "../repositories/userProfileRepository";
import { findUserById } from "../repositories/userRepository";
import { PROFESSIONAL_STATUS } from "../constants/verification";
import {
  getProfileCvByUserId,
  upsertProfileCvByUserId,
  type ProfileCvPayload
} from "../repositories/profileCvRepository";

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

    if (profile.professional_status !== PROFESSIONAL_STATUS.EMPTY) {
      res.status(400).json({
        error: "Professional verification can only be requested when status is empty"
      });
      return;
    }

    const updated = await updateProfessionalVerificationStatus(
      req.user.id,
      {
        professional_status: PROFESSIONAL_STATUS.PENDING,
        professional_score: null,
        professional_verified_at: null
      }
    );

    res.json({ professional_status: updated.professional_status });
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

function normalizeOptionalNumber(value: unknown, label: string): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
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

function normalizeCvPayload(body: unknown): ProfileCvPayload {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const data = body as {
    education?: unknown;
    experience?: unknown;
    projects?: unknown;
    links?: unknown;
  };

  const educationInput = Array.isArray(data.education) ? data.education : [];
  const experienceInput = Array.isArray(data.experience) ? data.experience : [];
  const projectsInput = Array.isArray(data.projects) ? data.projects : [];
  const linksInput = Array.isArray(data.links) ? data.links : [];

  const education = educationInput.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Education item ${index + 1} is invalid`);
    }
    const entry = item as Record<string, unknown>;
    return {
      institution: normalizeString(entry.institution, "Education institution"),
      degree: normalizeString(entry.degree, "Education degree"),
      start_year: normalizeOptionalNumber(entry.start_year, "Education start_year"),
      end_year: normalizeOptionalNumber(entry.end_year, "Education end_year"),
      country: normalizeOptionalString(entry.country, "Education country")
    };
  });

  const experience = experienceInput.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Experience item ${index + 1} is invalid`);
    }
    const entry = item as Record<string, unknown>;
    const isCurrent = Boolean(entry.is_current);
    return {
      company: normalizeString(entry.company, "Experience company"),
      role: normalizeString(entry.role, "Experience role"),
      start_date: normalizeString(entry.start_date, "Experience start_date"),
      end_date: normalizeOptionalDate(entry.end_date, "Experience end_date"),
      description: normalizeString(entry.description, "Experience description"),
      is_current: isCurrent
    };
  });

  const projects = projectsInput.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Project item ${index + 1} is invalid`);
    }
    const entry = item as Record<string, unknown>;
    return {
      name: normalizeString(entry.name, "Project name"),
      description: normalizeString(entry.description, "Project description"),
      url: normalizeOptionalString(entry.url, "Project url")
    };
  });

  const links = linksInput.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Link item ${index + 1} is invalid`);
    }
    const entry = item as Record<string, unknown>;
    return {
      label: normalizeOptionalString(entry.label, "Link label"),
      url: normalizeString(entry.url, "Link url")
    };
  });

  return {
    education,
    experience,
    projects,
    links
  };
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
    res.json(payload);
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
    res.json(saved);
  } catch (error) {
    next(error);
  }
}

import type { Request, Response, NextFunction } from "express";

import {
  getProfileByUserId,
  upsertUserProfileByUserId
} from "../repositories/userProfileRepository";
import { findUserById } from "../repositories/userRepository";

interface UpsertProfileBody {
  headline?: unknown;
  bio?: unknown;
  external_links?: unknown;
  visibility?: unknown;
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

    const profile = await upsertUserProfileByUserId(req.user.id, {
      headline,
      bio,
      external_links: externalLinks,
      visibility: body.visibility
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

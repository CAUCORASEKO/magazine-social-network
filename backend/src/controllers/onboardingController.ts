import type { Request, Response, NextFunction } from "express";

import { pool } from "../db/pool";

interface OnboardingBody {
  headline?: unknown;
  bio?: unknown;
  external_links?: unknown;
  visibility?: unknown;
}

export async function completeOnboardingHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as OnboardingBody;
    const headline =
      typeof body.headline === "string" ? body.headline.trim() : "";
    const bio = typeof body.bio === "string" ? body.bio.trim() : "";
    const visibility =
      body.visibility === "public" || body.visibility === "private"
        ? body.visibility
        : "private";

    if (headline.length < 5) {
      res.status(400).json({ error: "Headline must be at least 5 characters" });
      return;
    }

    if (bio.length < 20) {
      res.status(400).json({ error: "Bio must be at least 20 characters" });
      return;
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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `
        INSERT INTO user_profiles (
          user_id,
          account_type,
          headline,
          bio,
          external_links,
          visibility
        )
        VALUES ($1, 'personal', $2, $3, $4::jsonb, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET
          headline = EXCLUDED.headline,
          bio = EXCLUDED.bio,
          external_links = EXCLUDED.external_links,
          visibility = EXCLUDED.visibility,
          updated_at = now()
        `,
        [
          req.user.id,
          headline,
          bio,
          externalLinks ? JSON.stringify(externalLinks) : null,
          visibility
        ]
      );

      const userResult = await client.query(
        `
        UPDATE users
        SET account_status = 'active'
        WHERE id = $1
        RETURNING
          id,
          email,
          account_status
        `,
        [req.user.id]
      );

      await client.query("COMMIT");
      res.json(userResult.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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

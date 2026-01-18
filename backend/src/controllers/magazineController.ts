import type { Request, Response, NextFunction } from "express";

import { findLanguageById } from "../repositories/languageRepository";
import {
  createMagazine,
  listActiveMagazines
} from "../repositories/magazineRepository";
import { findTopicById } from "../repositories/topicRepository";

interface CreateMagazineBody {
  title?: string;
  description?: string;
  primary_topic_id?: string;
  primary_language_id?: string;
}

function isPgUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function createMagazineHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as CreateMagazineBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : null;
    const topicId =
      typeof body.primary_topic_id === "string"
        ? body.primary_topic_id.trim()
        : "";
    const languageId =
      typeof body.primary_language_id === "string"
        ? body.primary_language_id.trim()
        : "";

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (!topicId) {
      res.status(400).json({ error: "Primary topic is required" });
      return;
    }

    if (!languageId) {
      res.status(400).json({ error: "Primary language is required" });
      return;
    }

    const topic = await findTopicById(topicId);
    if (!topic) {
      res.status(400).json({ error: "Topic not found" });
      return;
    }

    const language = await findLanguageById(languageId);
    if (!language) {
      res.status(400).json({ error: "Language not found" });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const magazine = await createMagazine({
      title,
      description,
      primary_topic_id: topicId,
      primary_language_id: languageId,
      owner_user_id: req.user.id
    });

    res.status(201).json(magazine);
  } catch (error) {
    if (isPgUniqueViolation(error) && error.code === "23505") {
      res
        .status(409)
        .json({ error: "Magazine title already exists for this user" });
      return;
    }

    next(error);
  }
}

export async function listMagazinesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const magazines = await listActiveMagazines();
    res.json(magazines);
  } catch (error) {
    next(error);
  }
}

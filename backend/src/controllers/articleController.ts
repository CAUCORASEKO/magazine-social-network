import type { Request, Response, NextFunction } from "express";

import { createDraftArticle } from "../repositories/articleRepository";
import { findMagazineById } from "../repositories/magazineRepository";

interface CreateArticleBody {
  title?: string;
  body?: string;
}

export async function createArticleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const magazineId = typeof req.params.magazineId === "string"
      ? req.params.magazineId.trim()
      : "";

    if (!magazineId) {
      res.status(400).json({ error: "Magazine id is required" });
      return;
    }

    const magazine = await findMagazineById(magazineId);
    if (!magazine) {
      res.status(404).json({ error: "Magazine not found" });
      return;
    }

    if (magazine.owner_user_id !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const body = req.body as CreateArticleBody;
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const content = typeof body.body === "string" ? body.body.trim() : "";

    if (!title) {
      res.status(400).json({ error: "Title is required" });
      return;
    }

    if (!content) {
      res.status(400).json({ error: "Body is required" });
      return;
    }

    const article = await createDraftArticle({
      magazine_id: magazine.id,
      author_user_id: req.user.id,
      language_id: magazine.primary_language_id,
      topic_id: magazine.primary_topic_id,
      title,
      body: content
    });

    res.status(201).json(article);
  } catch (error) {
    next(error);
  }
}

import type { Request, Response, NextFunction } from "express";

import {
  createDraftArticle,
  findArticleById,
  getPublishedArticleById,
  listPublishedArticlesByMagazine,
  updateArticleStatus
} from "../repositories/articleRepository";
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

export async function submitArticleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const articleId =
      typeof req.params.articleId === "string"
        ? req.params.articleId.trim()
        : "";

    if (!articleId) {
      res.status(400).json({ error: "Article id is required" });
      return;
    }

    const article = await findArticleById(articleId);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    if (article.author_user_id !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (article.status !== "draft") {
      res.status(409).json({ error: "Only draft articles can be submitted" });
      return;
    }

    const updated = await updateArticleStatus(article.id, "submitted", null);
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function publishArticleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const articleId =
      typeof req.params.articleId === "string"
        ? req.params.articleId.trim()
        : "";

    if (!articleId) {
      res.status(400).json({ error: "Article id is required" });
      return;
    }

    const article = await findArticleById(articleId);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    if (article.author_user_id !== req.user.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (article.status !== "submitted") {
      res.status(409).json({ error: "Only submitted articles can be published" });
      return;
    }

    const magazine = await findMagazineById(article.magazine_id);
    if (!magazine) {
      res.status(404).json({ error: "Magazine not found" });
      return;
    }

    const matchesScope =
      article.topic_id === magazine.primary_topic_id &&
      article.language_id === magazine.primary_language_id;

    if (!matchesScope) {
      const updated = await updateArticleStatus(article.id, "rejected", null);
      res.status(400).json({
        error: "Article does not match magazine scope",
        article: updated
      });
      return;
    }

    const publishedAt = new Date().toISOString();
    const updated = await updateArticleStatus(
      article.id,
      "published",
      publishedAt
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function listPublishedArticlesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const magazineId =
      typeof req.params.magazineId === "string"
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

    const articles = await listPublishedArticlesByMagazine(magazineId);
    res.json(articles);
  } catch (error) {
    next(error);
  }
}

export async function getPublishedArticleHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const articleId =
      typeof req.params.articleId === "string"
        ? req.params.articleId.trim()
        : "";

    if (!articleId) {
      res.status(400).json({ error: "Article id is required" });
      return;
    }

    const article = await getPublishedArticleById(articleId);
    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    res.json(article);
  } catch (error) {
    next(error);
  }
}

import type { Request, Response, NextFunction } from "express";

import {
  createDraftArticle,
  findArticleById,
  getPublishedArticleById,
  listPublishedArticles,
  listPublishedArticlesByMagazine,
  listPublishedArticlesFeed,
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

export async function listPublishedArticlesByMagazineHandler(
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

export async function listPublishedArticlesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const allowedParams = new Set([
      "languageCode",
      "topicId",
      "limit",
      "offset"
    ]);

    for (const key of Object.keys(req.query)) {
      if (!allowedParams.has(key)) {
        res.status(400).json({ error: `Unknown query parameter: ${key}` });
        return;
      }
    }

    const rawLanguageCode = req.query.languageCode;
    const rawTopicId = req.query.topicId;
    const rawLimit = req.query.limit;
    const rawOffset = req.query.offset;

    if (
      Array.isArray(rawLanguageCode) ||
      Array.isArray(rawTopicId) ||
      Array.isArray(rawLimit) ||
      Array.isArray(rawOffset)
    ) {
      res.status(400).json({ error: "Query parameters must be single values" });
      return;
    }

    const languageCode =
      typeof rawLanguageCode === "string" && rawLanguageCode.trim().length
        ? rawLanguageCode.trim()
        : undefined;
    const topicId =
      typeof rawTopicId === "string" && rawTopicId.trim().length
        ? rawTopicId.trim()
        : undefined;

    if (!languageCode && !topicId && rawLimit === undefined && rawOffset === undefined) {
      const articles = await listPublishedArticles();
      res.json(articles);
      return;
    }

    const limitValue =
      typeof rawLimit === "string" && rawLimit.trim().length
        ? Number.parseInt(rawLimit, 10)
        : 20;
    const offsetValue =
      typeof rawOffset === "string" && rawOffset.trim().length
        ? Number.parseInt(rawOffset, 10)
        : 0;

    if (Number.isNaN(limitValue) || limitValue <= 0 || limitValue > 50) {
      res.status(400).json({ error: "Limit must be between 1 and 50" });
      return;
    }

    if (Number.isNaN(offsetValue) || offsetValue < 0) {
      res.status(400).json({ error: "Offset must be 0 or greater" });
      return;
    }

    const articles = await listPublishedArticlesFeed({
      languageCode,
      topicId,
      limit: limitValue,
      offset: offsetValue
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
}

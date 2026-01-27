import { Router } from "express";

import {
  getPublishedArticleHandler,
  listPublishedArticlesHandler,
  publishArticleHandler,
  submitArticleHandler,
  upsertDraftArticleHandler
} from "../controllers/articleController";
import { requireAuth } from "../middleware/requireAuth";
import { requireActiveAccount } from "../middleware/requireActiveAccount";
import { requireVerifiedIdentity } from "../middleware/requireVerifiedIdentity";

export const articlesRouter = Router();

articlesRouter.post(
  "/articles",
  requireAuth,
  requireActiveAccount,
  upsertDraftArticleHandler
);
articlesRouter.post(
  "/articles/:articleId/submit",
  requireAuth,
  requireActiveAccount,
  submitArticleHandler
);
articlesRouter.post(
  "/articles/:articleId/publish",
  requireAuth,
  requireActiveAccount,
  requireVerifiedIdentity,
  publishArticleHandler
);
articlesRouter.get("/articles/:articleId", getPublishedArticleHandler);
articlesRouter.get("/articles", listPublishedArticlesHandler);

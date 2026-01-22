import { Router } from "express";

import {
  getPublishedArticleHandler,
  listPublishedArticlesHandler,
  publishArticleHandler,
  submitArticleHandler
} from "../controllers/articleController";
import { requireAuth } from "../middleware/requireAuth";
import { requireActiveAccount } from "../middleware/requireActiveAccount";

export const articlesRouter = Router();

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
  publishArticleHandler
);
articlesRouter.get("/articles/:articleId", getPublishedArticleHandler);
articlesRouter.get("/articles", listPublishedArticlesHandler);

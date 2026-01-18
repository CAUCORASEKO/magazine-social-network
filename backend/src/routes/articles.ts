import { Router } from "express";

import {
  getPublishedArticleHandler,
  publishArticleHandler,
  submitArticleHandler
} from "../controllers/articleController";
import { authStub } from "../middleware/authStub";

export const articlesRouter = Router();

articlesRouter.post("/articles/:articleId/submit", authStub, submitArticleHandler);
articlesRouter.post(
  "/articles/:articleId/publish",
  authStub,
  publishArticleHandler
);
articlesRouter.get("/articles/:articleId", getPublishedArticleHandler);

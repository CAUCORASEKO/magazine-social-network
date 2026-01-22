import { Router } from "express";

import {
  createMagazineHandler,
  listMagazinesHandler
} from "../controllers/magazineController";
import {
  createArticleHandler,
  listPublishedArticlesHandler
} from "../controllers/articleController";
import { requireAuth } from "../middleware/requireAuth";
import { requireActiveAccount } from "../middleware/requireActiveAccount";

export const magazinesRouter = Router();

magazinesRouter.post(
  "/magazines",
  requireAuth,
  requireActiveAccount,
  createMagazineHandler
);
magazinesRouter.get("/magazines", requireAuth, listMagazinesHandler);
magazinesRouter.post(
  "/magazines/:magazineId/articles",
  requireAuth,
  requireActiveAccount,
  createArticleHandler
);
magazinesRouter.get(
  "/magazines/:magazineId/articles",
  listPublishedArticlesHandler
);

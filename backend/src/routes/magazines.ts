import { Router } from "express";

import {
  createMagazineHandler,
  listMagazinesHandler
} from "../controllers/magazineController";
import { createArticleHandler } from "../controllers/articleController";
import { authStub } from "../middleware/authStub";

export const magazinesRouter = Router();

magazinesRouter.post("/magazines", authStub, createMagazineHandler);
magazinesRouter.get("/magazines", authStub, listMagazinesHandler);
magazinesRouter.post(
  "/magazines/:magazineId/articles",
  authStub,
  createArticleHandler
);

import { Router } from "express";

import {
  getPublicProfileHandler,
  upsertMyProfileHandler
} from "../controllers/profileController";
import { requireAuth } from "../middleware/requireAuth";

export const profilesRouter = Router();

profilesRouter.get("/profiles/:userId", getPublicProfileHandler);
profilesRouter.put("/profiles/me", requireAuth, upsertMyProfileHandler);

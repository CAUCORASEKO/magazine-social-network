import { Router } from "express";

import {
  getPublicProfileHandler,
  upsertMyProfileHandler
} from "../controllers/profileController";
import { authStub } from "../middleware/authStub";

export const profilesRouter = Router();

profilesRouter.get("/profiles/:userId", getPublicProfileHandler);
profilesRouter.put("/profiles/me", authStub, upsertMyProfileHandler);

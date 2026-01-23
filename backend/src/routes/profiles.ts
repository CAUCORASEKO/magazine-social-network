import { Router } from "express";

import {
  getPublicProfileHandler,
  getProfileCvHandler,
  requestProfessionalVerificationHandler,
  upsertProfileCvHandler,
  upsertMyProfileHandler
} from "../controllers/profileController";
import { requireAuth } from "../middleware/requireAuth";

export const profilesRouter = Router();

profilesRouter.get("/profiles/:userId", getPublicProfileHandler);
profilesRouter.put("/profiles/me", requireAuth, upsertMyProfileHandler);
profilesRouter.get("/profile/cv", requireAuth, getProfileCvHandler);
profilesRouter.put("/profile/cv", requireAuth, upsertProfileCvHandler);
profilesRouter.post(
  "/profile/request-professional-verification",
  requireAuth,
  requestProfessionalVerificationHandler
);

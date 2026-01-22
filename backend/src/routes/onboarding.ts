import { Router } from "express";

import { completeOnboardingHandler } from "../controllers/onboardingController";
import { requireAuth } from "../middleware/requireAuth";

export const onboardingRouter = Router();

onboardingRouter.post(
  "/onboarding/complete",
  requireAuth,
  completeOnboardingHandler
);

import { Router } from "express";

import {
  deleteAccountHandler,
  deleteMeHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  verifyEmailHandler
} from "../controllers/authController";
import { requireAuth } from "../middleware/requireAuth";

export const authRouter = Router();

authRouter.post("/auth/register", registerHandler);
authRouter.post("/auth/login", loginHandler);
authRouter.post("/auth/logout", logoutHandler);
authRouter.post("/auth/delete-account", deleteAccountHandler);
authRouter.delete("/auth/me", requireAuth, deleteMeHandler);
authRouter.get("/auth/me", meHandler);
authRouter.get("/auth/verify", verifyEmailHandler);

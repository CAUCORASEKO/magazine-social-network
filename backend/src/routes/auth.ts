import { Router } from "express";

import {
  deleteAccountHandler,
  loginHandler,
  logoutHandler,
  meHandler,
  registerHandler,
  verifyEmailHandler
} from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/auth/register", registerHandler);
authRouter.post("/auth/login", loginHandler);
authRouter.post("/auth/logout", logoutHandler);
authRouter.post("/auth/delete-account", deleteAccountHandler);
authRouter.get("/auth/me", meHandler);
authRouter.get("/auth/verify", verifyEmailHandler);

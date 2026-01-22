import { Router } from "express";

import {
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
authRouter.get("/auth/me", meHandler);
authRouter.get("/auth/verify", verifyEmailHandler);

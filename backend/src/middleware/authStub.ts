import type { Request, Response, NextFunction } from "express";

import { findUserById } from "../repositories/userRepository";

export async function authStub(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const headerUserId = req.header("x-user-id")?.trim();
    const envUserId = process.env.DEV_USER_ID?.trim();
    const userId = headerUserId || envUserId;

    if (!userId) {
      res.status(401).json({ error: "Missing user id" });
      return;
    }

    const user = await findUserById(userId);

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.status !== "active") {
      res.status(403).json({ error: "User is not active" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

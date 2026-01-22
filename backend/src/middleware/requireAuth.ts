import type { Request, Response, NextFunction } from "express";

import { findUserById } from "../repositories/userRepository";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

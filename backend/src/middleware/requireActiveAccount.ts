import type { Request, Response, NextFunction } from "express";

export function requireActiveAccount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.user.account_status !== "active") {
    return res.status(403).json({ error: "Onboarding required" });
  }

  next();
}

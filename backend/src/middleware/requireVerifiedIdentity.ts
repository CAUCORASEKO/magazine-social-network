import type { Request, Response, NextFunction } from "express";

import { isIdentityVerified } from "../constants/verification";

export function requireVerifiedIdentity(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!isIdentityVerified(req.user.identity_status)) {
    res.status(403).json({ error: "Identity verification required" });
    return;
  }

  next();
}

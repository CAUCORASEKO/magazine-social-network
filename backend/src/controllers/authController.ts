import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import {
  createUserWithCredentials,
  findAuthCredentialByEmail,
  findAuthCredentialByUserId,
  verifyEmailByToken
} from "../repositories/authRepository";
import { findLanguageByCode } from "../repositories/languageRepository";
import { deleteUserById, findUserById } from "../repositories/userRepository";
import { getProfileByUserId } from "../repositories/userProfileRepository";

interface RegisterBody {
  full_name?: string;
  email?: string;
  password?: string;
  professional_background?: string;
  ui_language_code?: string;
  country?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

function isPgUniqueViolation(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error;
}

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as RegisterBody;
    const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const professionalBackground =
      typeof body.professional_background === "string"
        ? body.professional_background.trim()
        : "";
    const uiLanguageCode =
      typeof body.ui_language_code === "string" ? body.ui_language_code.trim() : "";
    const country = typeof body.country === "string" ? body.country.trim() : "";

    if (!fullName) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    if (!professionalBackground) {
      res.status(400).json({ error: "Professional background is required" });
      return;
    }

    if (!uiLanguageCode) {
      res.status(400).json({ error: "UI language is required" });
      return;
    }

    if (!country) {
      res.status(400).json({ error: "Country is required" });
      return;
    }

    const language = await findLanguageByCode(uiLanguageCode);
    if (!language) {
      res.status(400).json({ error: "UI language not found" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const user = await createUserWithCredentials({
      full_name: fullName,
      email,
      professional_background: professionalBackground,
      ui_language_id: language.id,
      country,
      password_hash: passwordHash,
      email_verification_token: emailVerificationToken
    });

    res.status(201).json({
      user,
      verification_url: `/auth/verify?token=${emailVerificationToken}`
    });
  } catch (error) {
    if (isPgUniqueViolation(error) && error.code === "23505") {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }
    next(error);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const body = req.body as LoginBody;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    const credential = await findAuthCredentialByEmail(email);
    if (!credential) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!credential.email_verified) {
      res.status(403).json({ error: "Email is not verified" });
      return;
    }

    const matches = await bcrypt.compare(password, credential.password_hash);
    if (!matches) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user = await findUserById(credential.user_id);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.session.userId = user.id;
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.json({ success: true });
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccountHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = req.body as { password?: string };
    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      res.status(400).json({ error: "Password is required" });
      return;
    }

    const credential = await findAuthCredentialByUserId(userId);
    if (!credential) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const matches = await bcrypt.compare(password, credential.password_hash);
    if (!matches) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const deleted = await deleteUserById(userId);
    if (!deleted) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    req.session.destroy((err) => {
      if (err) {
        next(err);
        return;
      }
      res.json({ success: true });
    });
  } catch (error) {
    next(error);
  }
}

export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.session.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const credential = await findAuthCredentialByUserId(userId);
    if (!credential) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const profile = await getProfileByUserId(userId);

    res.json({
      ...user,
      email_verified: credential.email_verified,
      ...(profile
        ? {
            profile_image_url: profile.profile_image_url,
            professional_status: profile.professional_status,
            professional_score: profile.professional_score,
            professional_verified_at: profile.professional_verified_at
          }
        : {})
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token =
      typeof req.query.token === "string" ? req.query.token.trim() : "";
    if (!token) {
      res.status(400).json({ error: "Verification token is required" });
      return;
    }

    const result = await verifyEmailByToken(token);
    if (!result) {
      res.status(400).json({ error: "Verification link is invalid or expired" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

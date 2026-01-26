import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

import {
  getPublicProfileHandler,
  getProfileCvHandler,
  requestProfessionalVerificationHandler,
  uploadIdentityDocumentHandler,
  uploadProfilePhotoHandler,
  verifyFaceHandler,
  upsertProfileCvHandler,
  upsertMyProfileHandler
} from "../controllers/profileController";
import { requireAuth } from "../middleware/requireAuth";

export const profilesRouter = Router();

const uploadDir = path.join(__dirname, "..", "..", "uploads", "profile-images");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const extension =
        file.mimetype === "image/jpeg"
          ? ".jpg"
          : file.mimetype === "image/png"
          ? ".png"
          : file.mimetype === "image/webp"
          ? ".webp"
          : path.extname(file.originalname) || ".jpg";
      const userId = typeof req.user?.id === "string" ? req.user.id : "user";
      cb(null, `${userId}${extension}`);
    }
  }),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPG, PNG, or WebP images are allowed"));
      return;
    }
    cb(null, true);
  }
});

const identityUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const userId = typeof req.user?.id === "string" ? req.user.id : "user";
      const identityDir = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        "identity",
        userId
      );
      fs.mkdirSync(identityDir, { recursive: true });
      cb(null, identityDir);
    },
    filename: (_req, file, cb) => {
      const extension =
        file.mimetype === "image/jpeg"
          ? ".jpg"
          : file.mimetype === "image/png"
          ? ".png"
          : file.mimetype === "application/pdf"
          ? ".pdf"
          : path.extname(file.originalname) || "";
      const safeExtension = extension || ".pdf";
      cb(null, `${Date.now()}${safeExtension}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPG, PNG, or PDF files are allowed"));
      return;
    }
    cb(null, true);
  }
});

const faceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const userId = typeof req.user?.id === "string" ? req.user.id : "user";
      const faceDir = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        "identity",
        userId,
        "face"
      );
      fs.mkdirSync(faceDir, { recursive: true });
      cb(null, faceDir);
    },
    filename: (_req, _file, cb) => {
      cb(null, `face-${Date.now()}.jpg`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only JPG or PNG images are allowed"));
      return;
    }
    cb(null, true);
  }
});

function handleProfilePhotoUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  upload.single("photo")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Image must be smaller than 2MB" });
        return;
      }
      res.status(400).json({ error: "Invalid upload" });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid upload" });
  });
}

function handleIdentityDocumentUpload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  identityUpload.single("document")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Document must be smaller than 10MB" });
        return;
      }
      res.status(400).json({ error: "Invalid upload" });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid upload" });
  });
}

function handleFaceUpload(req: Request, res: Response, next: NextFunction): void {
  faceUpload.single("face")(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "Image must be smaller than 5MB" });
        return;
      }
      res.status(400).json({ error: "Invalid upload" });
      return;
    }
    res.status(400).json({ error: err.message || "Invalid upload" });
  });
}

profilesRouter.get("/profiles/:userId", getPublicProfileHandler);
profilesRouter.put("/profiles/me", requireAuth, upsertMyProfileHandler);
profilesRouter.get("/profile/cv", requireAuth, getProfileCvHandler);
profilesRouter.put("/profile/cv", requireAuth, upsertProfileCvHandler);
profilesRouter.post(
  "/profile/photo",
  requireAuth,
  handleProfilePhotoUpload,
  uploadProfilePhotoHandler
);
profilesRouter.post(
  "/profile/identity/document",
  requireAuth,
  handleIdentityDocumentUpload,
  uploadIdentityDocumentHandler
);
profilesRouter.post(
  "/profile/verify-face",
  requireAuth,
  handleFaceUpload,
  verifyFaceHandler
);
profilesRouter.post(
  "/profile/request-professional-verification",
  requireAuth,
  requestProfessionalVerificationHandler
);

import { Router, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";

import {
  getPublicProfileHandler,
  getProfileCvHandler,
  requestProfessionalVerificationHandler,
  uploadProfilePhotoHandler,
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
  "/profile/request-professional-verification",
  requireAuth,
  requestProfessionalVerificationHandler
);

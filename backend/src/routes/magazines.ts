import { Router } from "express";

import { createMagazineHandler } from "../controllers/magazineController";
import { authStub } from "../middleware/authStub";

export const magazinesRouter = Router();

magazinesRouter.post("/magazines", authStub, createMagazineHandler);

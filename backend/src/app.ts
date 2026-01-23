import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import session from "express-session";
import cors from "cors";

import { config } from "./config";
import { healthRouter } from "./routes/health";
import { articlesRouter } from "./routes/articles";
import { magazinesRouter } from "./routes/magazines";
import { profilesRouter } from "./routes/profiles";
import { authRouter } from "./routes/auth";
import { onboardingRouter } from "./routes/onboarding";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true
  })
);
app.use(
  session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false
    }
  })
);
app.use(authRouter);
app.use(onboardingRouter);
app.use(healthRouter);
app.use(magazinesRouter);
app.use(articlesRouter);
app.use(profilesRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (res.headersSent) {
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

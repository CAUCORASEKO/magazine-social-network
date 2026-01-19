import express, { type NextFunction, type Request, type Response } from "express";

import { healthRouter } from "./routes/health";
import { articlesRouter } from "./routes/articles";
import { magazinesRouter } from "./routes/magazines";
import { profilesRouter } from "./routes/profiles";

export const app = express();

app.use(express.json({ limit: "1mb" }));
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

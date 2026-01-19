import express from "express";

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

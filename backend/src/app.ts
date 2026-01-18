import express from "express";

import { healthRouter } from "./routes/health";
import { magazinesRouter } from "./routes/magazines";

export const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(healthRouter);
app.use(magazinesRouter);

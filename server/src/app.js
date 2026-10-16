import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { globalLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

import issuesRouter from "./routes/issues.js";
import hotspotsRouter from "./routes/hotspots.js";
import wardsRouter from "./routes/wards.js";
import meRouter from "./routes/me.js";
import adminRouter from "./routes/admin.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json({ limit: "100kb" }));
app.use(globalLimiter);

app.get("/health", (req, res) => {
  res.json({ data: { status: "ok", time: new Date().toISOString() }, error: null });
});

app.use("/api/issues", issuesRouter);
app.use("/api/hotspots", hotspotsRouter);
app.use("/api/wards", wardsRouter);
app.use("/api/me", meRouter);
app.use("/api/admin", adminRouter);

app.use(notFound);
app.use(errorHandler);

export default app;

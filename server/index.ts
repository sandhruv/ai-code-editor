import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { completionsRouter } from "./routes/completions.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 8787;
const isProd = process.env.NODE_ENV === "production";

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false, crossOriginResourcePolicy: false }));
app.use(compression());
app.use(
  cors({
    origin: isProd ? false : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, status: "up" });
});

app.use("/api/completions", completionsRouter);

if (isProd) {
  const dist = path.resolve(__dirname, "../dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"), (err) => {
      if (err) res.status(404).send("Build the client first: npm run build");
    });
  });
}

app.use((err: Error & { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) console.error("[server]", err);
  res.status(status).json({ error: err.message || "Internal error", code: "INTERNAL" });
});

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
  console.log(`[server] model: ${process.env.GROQ_MODEL || "qwen/qwen3.8-27b"}`);
  console.log(`[server] GROQ_API_KEY: ${process.env.GROQ_API_KEY ? "present" : "MISSING (set it in .env)"}`);
});

export default app;

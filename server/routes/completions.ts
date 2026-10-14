import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../src/constants/languages.js";
import type { ApiError, CompletionRequest } from "../../shared/types.js";
import { completeGroq, getModelName } from "../services/groqService.js";

export const completionsRouter = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.COMPLETION_RATE_LIMIT || 30),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many completion requests. Slow down and retry shortly.",
    code: "RATE_LIMITED",
  } satisfies ApiError,
});

const MAX_CODE_LENGTH = 40_000;

function isLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as string[]).includes(value);
}

export function validateCompletionBody(body: unknown):
  | { ok: true; value: CompletionRequest }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!isLanguage(b.language)) {
    return { ok: false, error: "field \"language\" must be one of the supported languages." };
  }
  if (typeof b.code !== "string") {
    return { ok: false, error: "field \"code\" must be a string." };
  }
  if (b.code.length > MAX_CODE_LENGTH) {
    return { ok: false, error: `field \"code\" exceeds ${MAX_CODE_LENGTH} characters.` };
  }

  const code: string = b.code;
  let cursor = typeof b.cursorOffset === "number" ? Math.floor(b.cursorOffset) : code.length;
  if (!Number.isFinite(cursor)) cursor = code.length;
  cursor = Math.max(0, Math.min(cursor, code.length));

  return {
    ok: true,
    value: { language: b.language, code, cursorOffset: cursor },
  };
}

completionsRouter.post("/", limiter, async (req: Request, res: Response) => {
  const parsed = validateCompletionBody(req.body);
  if (!parsed.ok) {
    const err: ApiError = { error: parsed.error, code: "BAD_REQUEST" };
    res.status(400).json(err);
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    const err: ApiError = {
      error:
        "Server is missing GROQ_API_KEY. Copy .env.example to .env, add your key from https://console.groq.com/keys, then restart the server.",
      code: "MISSING_API_KEY",
    };
    res.status(503).json(err);
    return;
  }

  try {
    const result = await completeGroq(parsed.value);
    res.json(result);
  } catch (error) {
    const e = error as Partial<ApiError> & { status?: number; message?: string };
    const status = typeof e.status === "number" ? e.status : 500;
    const code = (e.code as ApiError["code"]) || "INTERNAL";
    const message = e.message || "Unexpected server error.";
    res.status(status).json({ error: message, code } satisfies ApiError);
  }
});

completionsRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    model: getModelName(),
    hasApiKey: Boolean(process.env.GROQ_API_KEY),
  });
});

import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { SUPPORTED_LANGUAGES } from "../../src/constants/languages.js";
import type { ApiError } from "../../shared/types.js";
import {
  executeCode,
  isRunnable,
  unrunnableReason,
  validateRunBody,
} from "../services/executionService.js";

export const runRouter = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RUN_RATE_LIMIT || 15),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many run requests. Please wait a moment.",
    code: "RATE_LIMITED",
  } satisfies ApiError,
});

runRouter.post("/", limiter, async (req: Request, res: Response) => {
  const parsed = validateRunBody(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error, code: "BAD_REQUEST" } satisfies ApiError);
    return;
  }

  if (!(SUPPORTED_LANGUAGES as string[]).includes(parsed.value.language)) {
    res.status(400).json({ error: "Unsupported language.", code: "BAD_REQUEST" } satisfies ApiError);
    return;
  }

  if (!isRunnable(parsed.value.language)) {
    res.status(200).json({
      runnable: false,
      language: parsed.value.language,
      status: "Not runnable",
      stdout: "",
      stderr: unrunnableReason(parsed.value.language),
      compileOutput: "",
      timeMs: 0,
      wallTime: "",
      executor: null,
    });
    return;
  }

  try {
    const result = await executeCode(parsed.value);
    res.json(result);
  } catch (error) {
    const e = error as { status?: number; message?: string; code?: string };
    const status = typeof e.status === "number" ? e.status : 500;
    res.status(status).json({
      error: e.message || "Execution failed.",
      code: (e.code as ApiError["code"]) || "INTERNAL",
    } satisfies ApiError);
  }
});

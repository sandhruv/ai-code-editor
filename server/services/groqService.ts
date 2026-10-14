import Groq from "groq-sdk";

import type { CompletionRequest, CompletionResponse } from "../../shared/types.js";

const MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
const MAX_TOKENS = clampInt(process.env.COMPLETION_MAX_TOKENS, 128, 8, 1024);
const TIMEOUT_MS = clampInt(process.env.COMPLETION_TIMEOUT_MS, 8000, 1000, 30000);
const MAX_CODE_CHARS = 6000;
const MAX_PREFIX_CHARS = 3500;

let client: Groq | null = null;

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw Object.assign(new Error("GROQ_API_KEY is not set on the server."), {
      status: 503,
      code: "MISSING_API_KEY",
    });
  }
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export function getModelName(): string {
  return MODEL;
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function splitCode(req: CompletionRequest): { prefix: string; suffix: string } {
  const offset = Math.max(0, Math.min(req.cursorOffset ?? 0, req.code.length));
  let prefix = req.code.slice(0, offset);
  const suffix = req.code.slice(offset);
  if (prefix.length > MAX_PREFIX_CHARS) prefix = prefix.slice(-MAX_PREFIX_CHARS);
  return { prefix, suffix };
}

export function buildPrompt(language: string, prefix: string, suffix: string): string {
  return [
    "You are a code completion engine. Complete the code for the " + language + " snippet below.",
    "Rules:",
    "- Output ONLY the code that continues from the cursor. No explanations, no prose, no markdown fences.",
    "- Match the existing indentation, style and naming exactly.",
    "- Emit at most a few lines. Stop at a natural boundary (end of statement, block or logical unit).",
    "- If nothing sensible can be added, output nothing.",
    "",
    "<CODE_BEFORE>",
    prefix,
    "</CODE_BEFORE>",
    "<CODE_AFTER>",
    suffix,
    "</CODE_AFTER>",
    "Continue the code:",
  ].join("\n");
}

const FENCE_RE = /```[a-zA-Z0-9+#_-]*\n([\s\S]*?)\n?```/;

export function sanitizeCompletion(raw: string): string {
  let text = raw.replace(/\r\n/g, "\n");
  const fence = text.match(FENCE_RE);
  if (fence) text = fence[1];
  text = text.replace(/^```[a-zA-Z0-9+#_-]*\n?/, "").replace(/```\s*$/, "");
  const nl = text.indexOf("\n");
  if (nl !== -1 && /^\s*(here(?:'s| is)|sure|certainly|below is|output:)/i.test(text)) {
    text = text.slice(nl + 1);
  }
  return text.replace(/^\n+/, "");
}

const cache = new Map<string, { value: string; at: number }>();
const inflight = new Map<string, Promise<string>>();
const CACHE_TTL_MS = 60000;
const CACHE_MAX = 200;

function cacheKey(language: string, prefix: string, suffix: string): string {
  return language + "\u0000" + prefix + "\u0000" + suffix;
}

function cacheGet(key: string): string | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key: string, value: string): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value: value, at: Date.now() });
}

export function resetCaches(): void {
  cache.clear();
  inflight.clear();
}

export async function completeGroq(req: CompletionRequest): Promise<CompletionResponse> {
  const started = Date.now();
  const parts = splitCode(req);
  if (!(req.code || "").trim()) {
    throw Object.assign(new Error("Nothing to complete in an empty editor."), {
      status: 400,
      code: "BAD_REQUEST",
    });
  }

  const key = cacheKey(req.language, parts.prefix, parts.suffix);
  const cachedText = cacheGet(key);
  if (cachedText !== undefined) {
    return {
      completion: cachedText,
      language: req.language,
      model: MODEL,
      cached: true,
      elapsedMs: Date.now() - started,
    };
  }

  const running = inflight.get(key);
  if (running) {
    const text = await running;
    return {
      completion: text,
      language: req.language,
      model: MODEL,
      cached: true,
      elapsedMs: Date.now() - started,
    };
  }

  const task = requestModel(req.language, parts.prefix, parts.suffix);
  inflight.set(key, task);
  try {
    const text = await task;
    cacheSet(key, text);
    return {
      completion: text,
      language: req.language,
      model: MODEL,
      cached: false,
      elapsedMs: Date.now() - started,
    };
  } finally {
    inflight.delete(key);
  }
}

async function requestModel(language: string, prefix: string, suffix: string): Promise<string> {
  const groq = getClient();
  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        "You are a strict inline code completion engine. Return only raw code continuation, never markdown, never comments explaining yourself.",
    },
    { role: "user", content: buildPrompt(language, prefix, suffix) },
  ];

  let response: Groq.Chat.ChatCompletion;
  try {
    response = await groq.chat.completions.create(
      {
        model: MODEL,
        messages: messages,
        temperature: 0.1,
        top_p: 0.9,
        max_tokens: MAX_TOKENS,
        stop: ["</CODE_BEFORE>", "</CODE_AFTER>"],
      },
      { timeout: TIMEOUT_MS, maxRetries: 1 },
    );
  } catch (err) {
    throw translateGroqError(err);
  }

  const raw = response.choices && response.choices[0] && response.choices[0].message
    ? response.choices[0].message.content || ""
    : "";
  const text = sanitizeCompletion(raw).slice(0, MAX_CODE_CHARS);
  if (!text.trim()) {
    throw Object.assign(new Error("Model returned an empty completion."), {
      status: 502,
      code: "EMPTY_COMPLETION",
    });
  }
  return text;
}

function translateGroqError(err: unknown): Error & { status: number; code: string } {
  const e = err as {
    status?: number;
    message?: string;
    name?: string;
    error?: { code?: string; msg?: string };
  };
  const status = typeof e?.status === "number" ? e.status : 500;
  const msg = (e && e.error && e.error.msg) || (e && e.message) || "Groq request failed";

  if (e?.name === "APIConnectionTimeoutError" || /timed? ?out/i.test(msg)) {
    return Object.assign(new Error("The AI provider timed out. Please try again."), {
      status: 504,
      code: "TIMEOUT",
    });
  }
  if (status === 429) {
    return Object.assign(new Error("AI rate limit reached. Please wait a moment and retry."), {
      status: 429,
      code: "RATE_LIMITED",
    });
  }
  if (status === 401 || status === 403) {
    return Object.assign(
      new Error("Groq rejected the API key. Check GROQ_API_KEY on the server."),
      { status: 401, code: "MISSING_API_KEY" },
    );
  }
  if (status === 404) {
    return Object.assign(
      new Error(
        'Groq model "' + MODEL + '" was not found. Set GROQ_MODEL to a model available to your account.',
      ),
      { status: 404, code: "UPSTREAM_ERROR" },
    );
  }
  if (status === 400) {
    return Object.assign(new Error("Groq rejected the request: " + msg), {
      status: 400,
      code: "BAD_REQUEST",
    });
  }
  return Object.assign(new Error(msg), { status: 502, code: "UPSTREAM_ERROR" });
}

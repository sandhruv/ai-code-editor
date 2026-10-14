import type { SupportedLanguage } from "../../src/constants/languages.js";

const JUDGE0_SUBMIT = process.env.JUDGE0_URL
  ? `${process.env.JUDGE0_URL.replace(/\/$/, "")}/submissions`
  : "https://ce.judge0.com/submissions";

const TIMEOUT_MS = 15000;
const MAX_SOURCE_CHARS = 20000;
const MAX_OUTPUT_CHARS = 4000;

/** Judge0 CE language ids for the languages this editor supports. */
const JUDGE0_LANGUAGE: Partial<Record<SupportedLanguage, number>> = {
  c: 50,
  cpp: 54,
  go: 60,
  java: 62,
  javascript: 63,
  php: 68,
  python: 71,
  rust: 73,
  typescript: 74,
  sql: 82,
};

/** Languages that render instead of executing. */
const NOT_RUNNABLE: SupportedLanguage[] = ["html", "css", "json"];

export interface RunRequest {
  language: SupportedLanguage;
  source: string;
  stdin?: string;
}

export interface RunResponse {
  runnable: boolean;
  language: SupportedLanguage;
  status: string;
  stdout: string;
  stderr: string;
  compileOutput: string;
  timeMs: number;
  wallTime: string;
  executor: string | null;
}

export function isRunnable(language: SupportedLanguage): boolean {
  return language in JUDGE0_LANGUAGE;
}

export function unrunnableReason(language: SupportedLanguage): string {
  if (NOT_RUNNABLE.includes(language)) {
    return `${language.toUpperCase()} is a markup/style language — there is nothing to execute. Open it in a browser instead.`;
  }
  return `Execution for ${language} is not supported yet.`;
}

export function validateRunBody(body: unknown):
  | { ok: true; value: RunRequest }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.language !== "string" || !b.language) {
    return { ok: false, error: 'field "language" is required.' };
  }
  if (typeof b.source !== "string") {
    return { ok: false, error: 'field "source" must be a string.' };
  }
  if (b.source.length === 0) {
    return { ok: false, error: "Nothing to run — the editor is empty." };
  }
  if (b.source.length > MAX_SOURCE_CHARS) {
    return { ok: false, error: `Source exceeds ${MAX_SOURCE_CHARS} characters.` };
  }
  const stdin = typeof b.stdin === "string" ? b.stdin : "";
  if (stdin.length > 5000) return { ok: false, error: "stdin exceeds 5000 characters." };

  return { ok: true, value: { language: b.language as SupportedLanguage, source: b.source, stdin } };
}

function b64(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

function unb64(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return Buffer.from(value, "base64").toString("utf8");
  } catch {
    return "";
  }
}

export async function executeCode(req: RunRequest): Promise<RunResponse> {
  const started = Date.now();
  const languageId = JUDGE0_LANGUAGE[req.language];

  if (languageId === undefined) {
    return {
      runnable: false,
      language: req.language,
      status: "Not runnable",
      stdout: "",
      stderr: "",
      compileOutput: "",
      timeMs: 0,
      wallTime: "",
      executor: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(
      `${JUDGE0_SUBMIT}?base64_encoded=true&wait=true`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language_id: languageId,
          source_code: b64(req.source),
          stdin: b64(req.stdin ?? ""),
          cpu_time_limit: 5,
          memory_limit: 128000,
        }),
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401 || /whitelist/i.test(text)) {
        throw Object.assign(
          new Error(
            "The free execution service is rejecting requests (JUDGE0_URL must point at your own instance or a whitelisted API).",
          ),
          { status: 502, code: "UPSTREAM_ERROR" },
        );
      }
      throw Object.assign(new Error(`Execution service returned ${res.status}.`), {
        status: 502,
        code: "UPSTREAM_ERROR",
      });
    }

    const data = (await res.json()) as {
      status?: { description?: string };
      stdout?: string | null;
      stderr?: string | null;
      compile_output?: string | null;
      time?: string | null;
      message?: string | null;
    };

    const stdout = unb64(data.stdout).slice(0, MAX_OUTPUT_CHARS);
    const stderr = unb64(data.stderr).slice(0, MAX_OUTPUT_CHARS);
    const compileOutput = unb64(data.compile_output ?? data.message).slice(0, MAX_OUTPUT_CHARS);

    return {
      runnable: true,
      language: req.language,
      status: data.status?.description || "Unknown",
      stdout,
      stderr,
      compileOutput,
      timeMs: Date.now() - started,
      wallTime: data.time || "",
      executor: "Judge0 CE",
    };
  } catch (err) {
    const e = err as { name?: string; message?: string; status?: number; code?: string };
    if (e?.name === "AbortError") {
      throw Object.assign(new Error("Execution timed out — the code may be waiting for input or looping."), {
        status: 504,
        code: "TIMEOUT",
      });
    }
    if (e?.status) throw err;
    throw Object.assign(new Error(e?.message || "Could not reach the execution service."), {
      status: 502,
      code: "UPSTREAM_ERROR",
    });
  } finally {
    clearTimeout(timer);
  }
}

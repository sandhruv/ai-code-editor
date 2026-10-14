import type { SupportedLanguage } from "../constants/languages";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const TIMEOUT_MS = 20000;

export interface RunResult {
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

export type RunOutcome =
  | { ok: true; data: RunResult }
  | { ok: false; error: string };

export async function runCode(
  language: SupportedLanguage,
  source: string,
  stdin: string,
  signal?: AbortSignal,
): Promise<RunOutcome> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(`${API_BASE}/api/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language, source, stdin }),
      signal: controller.signal,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: (json && json.error) || `Run failed (${res.status}).` };
    }
    if (!json || typeof json.status !== "string") {
      return { ok: false, error: "Malformed response from the run service." };
    }
    return { ok: true, data: json as RunResult };
  } catch (err) {
    const e = err as { name?: string; message?: string };
    if (signal?.aborted) return { ok: false, error: "Run cancelled." };
    if (e?.name === "AbortError") return { ok: false, error: "Execution timed out." };
    return { ok: false, error: e?.message || "Network error — is the backend running?" };
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

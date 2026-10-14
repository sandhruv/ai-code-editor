import type { ApiError, CompletionRequest, CompletionResponse } from "../../shared/types";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";
const TIMEOUT_MS = 10000;

export type CompletionResult =
  | { ok: true; data: CompletionResponse }
  | { ok: false; error: string; code: ApiError["code"] | "NETWORK" | "ABORTED" };

/** Minimum typing interval + debounce used by the editor before calling the API. */
export const MIN_TYPE_INTERVAL_MS = 250;
export const DEBOUNCE_MS = 650;

let lastRequestAt = 0;

export async function fetchCompletion(
  body: CompletionRequest,
  signal?: AbortSignal,
): Promise<CompletionResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    lastRequestAt = Date.now();
    const res = await fetch(`${API_BASE}/api/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const json = (await res.json().catch(() => null)) as (CompletionResponse & ApiError) | null;

    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || `Request failed with status ${res.status}.`,
        code: json?.code || "UPSTREAM_ERROR",
      };
    }
    if (!json || typeof json.completion !== "string") {
      return { ok: false, error: "Malformed response from server.", code: "INTERNAL" };
    }
    return { ok: true, data: json };
  } catch (err) {
    if (signal?.aborted) {
      return { ok: false, error: "aborted", code: "ABORTED" };
    }
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") {
      return { ok: false, error: "The AI request timed out.", code: "TIMEOUT" };
    }
    return {
      ok: false,
      error: e?.message || "Network error — is the backend running?",
      code: "NETWORK",
    };
  } finally {
    window.clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export function msSinceLastRequest(): number {
  return Date.now() - lastRequestAt;
}

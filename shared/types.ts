import type { SupportedLanguage } from "../src/constants/languages";

export interface CompletionRequest {
  language: SupportedLanguage;
  code: string;
  cursorOffset: number;
  /** Optional extra prefix/suffix context already contained in `code`. */
  prefix?: string;
  suffix?: string;
}

export interface CompletionResponse {
  /** Plain continuation text. Never markdown, never explanation. */
  completion: string;
  language: SupportedLanguage;
  model: string;
  cached: boolean;
  elapsedMs: number;
}

export interface ApiError {
  error: string;
  code:
    | "BAD_REQUEST"
    | "MISSING_API_KEY"
    | "RATE_LIMITED"
    | "UPSTREAM_ERROR"
    | "TIMEOUT"
    | "EMPTY_COMPLETION"
    | "INTERNAL";
}

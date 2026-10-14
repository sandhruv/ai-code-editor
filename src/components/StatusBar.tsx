import type { InlineState } from "../hooks/useInlineCompletions";
import { LANGUAGE_LABELS, type SupportedLanguage } from "../constants/languages";

export interface StatusBarProps {
  language: SupportedLanguage;
  state: InlineState;
  theme: "vs-dark" | "light";
  cursor: { line: number; col: number };
}

export default function StatusBar({ language, state, theme, cursor }: StatusBarProps) {
  const dark = theme === "vs-dark";
  const bg = dark ? "bg-[#007acc]" : "bg-indigo-600";
  const dot =
    state.status === "loading"
      ? "animate-pulse bg-amber-300"
      : state.status === "error" || state.status === "unavailable"
        ? "bg-red-300"
        : state.status === "disabled"
          ? "bg-slate-300"
          : "bg-emerald-300";

  const ariaLive =
    state.status === "error" || state.status === "unavailable" ? "assertive" : "polite";

  return (
    <footer
      className={`${bg} flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1 text-[11px] text-white`}
      role="status"
      aria-live={ariaLive}
    >
      <span className="font-medium">{LANGUAGE_LABELS[language]}</span>
      <span className="opacity-80">
        Ln {cursor.line}, Col {cursor.col}
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
        <span>
          AI: {state.status === "loading" ? "generating…" : state.status}
          {state.message ? ` — ${state.message}` : ""}
        </span>
      </span>
      {state.lastModel && (
        <span className="ml-auto hidden opacity-80 sm:inline">model: {state.lastModel}</span>
      )}
    </footer>
  );
}

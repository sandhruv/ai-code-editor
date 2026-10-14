import type { InlineState } from "../hooks/useInlineCompletions";
import { LANG_COLOR, Icons } from "./ui";
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

  const label =
    state.status === "loading"
      ? "generating…"
      : state.status === "ready"
        ? state.message || "ready"
        : state.status === "error" || state.status === "unavailable"
          ? state.message
          : state.status;

  const tone =
    state.status === "error" || state.status === "unavailable"
      ? "text-red-100"
      : state.status === "loading"
        ? "text-amber-100"
        : "text-white";

  const ariaLive =
    state.status === "error" || state.status === "unavailable" ? "assertive" : "polite";

  const seg =
    "flex h-full items-center gap-1.5 px-2.5 transition-colors hover:bg-white/10";

  return (
    <footer
      className={`${bg} flex h-6 shrink-0 items-center justify-between px-1 text-[11px] leading-none text-white`}
      role="status"
      aria-live={ariaLive}
    >
      <div className="flex h-full items-center">
        <span className={`${seg} font-semibold`} title="Active language">
          <span
            className="h-2 w-2 rounded-full ring-1 ring-white/50"
            style={{ backgroundColor: LANG_COLOR[language] }}
            aria-hidden="true"
          />
          {LANGUAGE_LABELS[language]}
        </span>

        <span className={`${seg} tabular-nums`} title="Cursor position">
          Ln {cursor.line}, Col {cursor.col}
        </span>

        <span className={`${seg} tabular-nums sm:hidden`} title="Indentation">
          Spaces: 4
        </span>
      </div>

      <div className="flex h-full items-center min-w-0">
        <span className={`${seg} min-w-0 max-w-[52vw] sm:max-w-[46vw] ${tone}`}>
          <span
            className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
              state.status === "loading"
                ? "animate-pulse bg-amber-300"
                : state.status === "error" || state.status === "unavailable"
                  ? "bg-red-300"
                  : state.status === "disabled"
                    ? "bg-slate-300"
                    : "bg-emerald-300"
            }`}
            aria-hidden="true"
          />
          <span className="shrink-0 text-white/80">AI</span>
          <span className="truncate">
            {state.status === "error" || state.status === "unavailable"
              ? state.message
              : label}
          </span>
        </span>

        <span className={`${seg} hidden md:flex`} title="Tab accepts · Esc dismisses">
          <Icons.keyboard size={12} />
          Tab / Esc
        </span>

        {state.cached && (
          <span className={`${seg} hidden lg:flex`} title="Served from the server-side cache">
            cached
          </span>
        )}

        <span className={`${seg} hidden font-medium lg:flex`} title="Groq model in use">
          {state.lastModel || "Groq"}
        </span>
      </div>
    </footer>
  );
}

import { Icons, LANG_COLOR, ToolButton } from "./ui";
import { LANGUAGE_LABELS, type SupportedLanguage } from "../constants/languages";

export interface ToolbarProps {
  fileName: string;
  onFileNameChange: (v: string) => void;
  language: SupportedLanguage;
  onLanguageChange: (v: SupportedLanguage) => void;
  theme: "vs-dark" | "light";
  onThemeToggle: () => void;
  fontSize: number;
  onFontSizeChange: (v: number) => void;
  minimap: boolean;
  onMinimapToggle: () => void;
  aiEnabled: boolean;
  onAiToggle: () => void;
  onCopy: () => void;
  onReset: () => void;
  onRun: () => void;
  showOutput: boolean;
  copied: boolean;
}

const sep = (dark: boolean) =>
  `my-1 w-px shrink-0 ${dark ? "bg-white/10" : "bg-slate-300/70"}`;

export default function Toolbar(props: ToolbarProps) {
  const {
    fileName,
    onFileNameChange,
    language,
    onLanguageChange,
    theme,
    onThemeToggle,
    fontSize,
    onFontSizeChange,
    minimap,
    onMinimapToggle,
    aiEnabled,
    onAiToggle,
    onCopy,
    onReset,
    onRun,
    showOutput,
    copied,
  } = props;

  const dark = theme === "vs-dark";
  const accent = LANG_COLOR[language];

  const selectCls = dark
    ? "border-white/10 bg-white/[0.05] text-slate-200 hover:bg-white/[0.09]"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <div
      className={`shrink-0 select-none ${
        dark ? "bg-[#141414] text-slate-300" : "bg-[#f3f4f6] text-slate-700"
      }`}
    >
      {/* Row 1 — brand + file tab */}
      <div
        className={`flex h-9 items-center gap-3 border-b px-3 ${
          dark ? "border-white/[0.07]" : "border-slate-200"
        }`}
      >
        <span className="flex items-center gap-2">
          <span className="text-indigo-400">
            <Icons.logo size={17} />
          </span>
          <span className="text-[12.5px] font-semibold tracking-tight text-slate-100 dark:text-slate-100">
            <span className={dark ? "text-white" : "text-slate-900"}>AI Code Editor</span>
          </span>
          <span
            className={`hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline ${
              dark ? "bg-white/[0.06] text-slate-400" : "bg-slate-200 text-slate-500"
            }`}
          >
            powered by Groq
          </span>
        </span>

        {/* File tab */}
        <div
          className={`group flex h-full min-w-0 items-center gap-2 border-x px-3 ${
            dark
              ? "border-white/10 bg-[#1e1e1e] text-slate-100"
              : "border-slate-200 bg-white text-slate-800"
          }`}
          style={{ boxShadow: dark ? "inset 0 -2px 0 0 #4f46e5" : "inset 0 -2px 0 0 #4f46e5" }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <label className="sr-only" htmlFor="file-name">
            File name
          </label>
          <input
            id="file-name"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            spellCheck={false}
            aria-label="File name"
            className={`w-32 min-w-0 border-none bg-transparent text-[12px] outline-none placeholder:opacity-50 focus-visible:ring-0 sm:w-44 ${
              dark ? "text-slate-100" : "text-slate-800"
            }`}
          />
          <span
            className={`hidden shrink-0 text-[11px] md:inline ${
              dark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            {LANGUAGE_LABELS[language]}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2 py-1 text-[11px] md:flex ${
              dark ? "bg-white/[0.05] text-slate-400" : "bg-white text-slate-500"
            }`}
            title="Hold Tab to accept · Esc to dismiss"
          >
            <Icons.keyboard size={13} />
            <span className="hidden lg:inline">Tab accept · Esc dismiss</span>
          </span>

          <ToolButton
            label={dark ? "Switch to light theme" : "Switch to dark theme"}
            dark={dark}
            onClick={onThemeToggle}
            className="w-7 justify-center px-0"
          >
            {dark ? <Icons.sun size={15} /> : <Icons.moon size={15} />}
          </ToolButton>
        </div>
      </div>

      {/* Row 2 — command bar */}
      <div
        className={`flex h-10 flex-wrap items-center gap-1.5 border-b px-3 py-1.5 ${
          dark ? "border-white/[0.07]" : "border-slate-200"
        }`}
      >
        <label className="sr-only" htmlFor="lang-select">
          Programming language
        </label>
        <div className="relative flex items-center">
          <span
            className="pointer-events-none absolute left-2.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
            aria-hidden="true"
          />
          <select
            id="lang-select"
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
            aria-label="Programming language"
            className={`h-7 cursor-pointer appearance-none rounded-md border py-0 pl-7 pr-6 text-[11.5px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${selectCls}`}
          >
            {Object.keys(LANGUAGE_LABELS).map((l) => (
              <option key={l} value={l} className="bg-white text-slate-900">
                {LANGUAGE_LABELS[l as SupportedLanguage]}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2 h-3 w-3 opacity-60"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>

        <span className={sep(dark)} aria-hidden="true" />

        <ToolButton label="Toggle AI autocomplete" dark={dark} active={aiEnabled} onClick={onAiToggle}>
          <Icons.spark size={13} />
          <span className="hidden sm:inline">AI {aiEnabled ? "On" : "Off"}</span>
        </ToolButton>

        <ToolButton label="Toggle minimap" dark={dark} active={minimap} onClick={onMinimapToggle}>
          <Icons.map size={13} />
          <span className="hidden lg:inline">Minimap</span>
        </ToolButton>

        <div
          className={`flex h-7 items-center overflow-hidden rounded-md border ${
            dark ? "border-white/10 bg-white/[0.04]" : "border-slate-300 bg-white"
          }`}
          role="group"
          aria-label="Editor font size"
        >
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
            aria-label="Decrease font size"
            title="Decrease font size"
            className={`h-full px-2 text-[12px] transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500`}
          >
            A−
          </button>
          <span
            className={`min-w-[2.4ch] border-x px-1 text-center text-[11px] tabular-nums ${
              dark ? "border-white/10 text-slate-300" : "border-slate-300 text-slate-600"
            }`}
            aria-live="off"
          >
            {fontSize}
          </span>
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
            aria-label="Increase font size"
            title="Increase font size"
            className={`h-full px-2 text-[12px] transition-colors hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500`}
          >
            A+
          </button>
        </div>

        <span className={sep(dark)} aria-hidden="true" />

        <ToolButton
          label="Reset editor to starter code"
          dark={dark}
          onClick={onReset}
          className="hidden sm:inline-flex"
        >
          <Icons.reset size={13} />
          <span className="hidden md:inline">Reset</span>
        </ToolButton>

        <ToolButton label="Copy all code" dark={dark} onClick={onCopy}>
          {copied ? <Icons.check size={13} /> : <Icons.copy size={13} />}
          <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
        </ToolButton>

        <div className="ml-auto flex items-center gap-2">
          <span
            className={`hidden items-center gap-1 text-[10.5px] lg:flex ${
              dark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <Icons.terminal size={13} />
            Ctrl + Enter to run
          </span>
          <ToolButton label="Run code (Ctrl+Enter)" dark={dark} primary onClick={onRun}>
            <Icons.play size={12} />
            Run
            {showOutput && (
              <span
                className="ml-0.5 h-1.5 w-1.5 rounded-full bg-white/70"
                aria-hidden="true"
              />
            )}
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

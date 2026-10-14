import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "../constants/languages";

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

const btn =
  "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50";

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
  const cls = dark
    ? "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";

  return (
    <header
      className={`flex flex-wrap items-center gap-2 border-b px-3 py-2 ${
        dark ? "border-white/10 bg-[#181818]" : "border-slate-200 bg-slate-50"
      }`}
    >
      <span
        className={`mr-1 select-none text-sm font-semibold tracking-tight ${
          dark ? "text-indigo-400" : "text-indigo-600"
        }`}
        aria-hidden="true"
      >
        &lt;/&gt; AI Code Editor
      </span>

      <label className="sr-only" htmlFor="file-name">
        File name
      </label>
      <input
        id="file-name"
        value={fileName}
        onChange={(e) => onFileNameChange(e.target.value)}
        spellCheck={false}
        aria-label="File name"
        className={`w-40 rounded-md border px-2 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}`}
      />

      <label className="sr-only" htmlFor="lang-select">
        Language
      </label>
      <select
        id="lang-select"
        value={language}
        onChange={(e) => onLanguageChange(e.target.value as SupportedLanguage)}
        aria-label="Programming language"
        className={`rounded-md border px-2 py-1.5 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${cls}`}
      >
        {SUPPORTED_LANGUAGES.map((l) => (
          <option key={l} value={l} className="bg-white text-slate-900">
            {LANGUAGE_LABELS[l]}
          </option>
        ))}
      </select>

      <span className="mx-1 hidden h-5 w-px bg-current opacity-15 sm:block" aria-hidden="true" />

      <button type="button" onClick={onAiToggle} aria-pressed={aiEnabled} className={`${btn} ${aiEnabled ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-500" : cls}`}>
        AI {aiEnabled ? "On" : "Off"}
      </button>

      <button type="button" onClick={onThemeToggle} className={`${btn} ${cls}`} aria-label="Toggle dark or light theme">
        {dark ? "Light" : "Dark"}
      </button>

      <button type="button" onClick={onMinimapToggle} aria-pressed={minimap} className={`${btn} ${cls}`}>
        Minimap {minimap ? "On" : "Off"}
      </button>

      <div className={`flex items-center gap-1 rounded-md border px-1 py-0.5 ${cls}`}>
        <button
          type="button"
          className="px-1.5 py-0.5 text-xs hover:opacity-70"
          onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
          aria-label="Decrease font size"
        >
          A−
        </button>
        <span className="min-w-[2ch] text-center text-xs tabular-nums" aria-live="off">
          {fontSize}
        </span>
        <button
          type="button"
          className="px-1.5 py-0.5 text-xs hover:opacity-70"
          onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
          aria-label="Increase font size"
        >
          A+
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onRun}
          className={`${btn} border-emerald-500/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`}
          aria-pressed={showOutput}
        >
          ▶ Run
        </button>
        <button type="button" onClick={onCopy} className={`${btn} ${cls}`}>
          {copied ? "Copied!" : "Copy code"}
        </button>
        <button type="button" onClick={onReset} className={`${btn} ${cls}`}>
          Reset
        </button>
      </div>
    </header>
  );
}

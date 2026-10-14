import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Toolbar from "./components/Toolbar";
import StatusBar from "./components/StatusBar";
import CodeEditor from "./components/CodeEditor";
import { starterCode } from "./constants/starterCode";
import type { InlineState } from "./hooks/useInlineCompletions";
import { LANGUAGE_LABELS, type SupportedLanguage } from "./constants/languages";

const DEFAULT_LANGUAGE: SupportedLanguage = "javascript";

function detectTheme(): "vs-dark" | "light" {
  const saved = localStorage.getItem("ai-editor-theme");
  if (saved === "light" || saved === "vs-dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "vs-dark";
}

export default function App() {
  const [language, setLanguage] = useState<SupportedLanguage>(DEFAULT_LANGUAGE);
  const [code, setCode] = useState<string>(() => starterCode(DEFAULT_LANGUAGE));
  const [theme, setTheme] = useState<"vs-dark" | "light">(() => detectTheme());
  const [fontSize, setFontSize] = useState(14);
  const [minimap, setMinimap] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [fileName, setFileName] = useState("main.js");
  const [resetKey, setResetKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [aiState, setAiState] = useState<InlineState>({
    status: "idle",
    message: "Ready",
  });
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "vs-dark");
    document.body.style.background = theme === "vs-dark" ? "#1e1e1e" : "#ffffff";
    localStorage.setItem("ai-editor-theme", theme);
  }, [theme]);

  const extFor: Record<SupportedLanguage, string> = useMemo(
    () => ({
      java: "java",
      python: "py",
      c: "c",
      cpp: "cpp",
      javascript: "js",
      typescript: "ts",
      html: "html",
      css: "css",
      sql: "sql",
      go: "go",
      rust: "rs",
      php: "php",
      json: "json",
    }),
    [],
  );

  const handleLanguageChange = useCallback((next: SupportedLanguage) => {
    setLanguage(next);
    setCode(starterCode(next));
    setFileName(`main.${extFor[next]}`);
    setResetKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extFor]);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(code).then(
      () => {
        setCopied(true);
        if (copyTimer.current) window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false),
    );
  }, [code]);

  const handleReset = useCallback(() => {
    if (window.confirm("Reset the editor to the starter code for this language?")) {
      setCode(starterCode(language));
      setResetKey((k) => k + 1);
    }
  }, [language]);

  const handleState = useCallback((next: InlineState) => setAiState(next), []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white text-slate-900 dark:bg-[#1e1e1e] dark:text-slate-100">
      <Toolbar
        fileName={fileName}
        onFileNameChange={setFileName}
        language={language}
        onLanguageChange={handleLanguageChange}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "vs-dark" ? "light" : "vs-dark"))}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        minimap={minimap}
        onMinimapToggle={() => setMinimap((m) => !m)}
        aiEnabled={aiEnabled}
        onAiToggle={() => setAiEnabled((v) => !v)}
        onCopy={handleCopy}
        onReset={handleReset}
        copied={copied}
      />

      <div className="min-h-0 flex-1">
        <CodeEditor
          language={language}
          value={code}
          resetKey={resetKey}
          onChange={setCode}
          theme={theme}
          fontSize={fontSize}
          minimap={minimap}
          aiEnabled={aiEnabled}
          onState={handleState}
          onCursorChange={setCursor}
        />
      </div>

      <StatusBar language={language} state={aiState} theme={theme} cursor={cursor} />

      <p className="sr-only">
        {aiState.status === "ready"
          ? `AI suggestion ready for ${LANGUAGE_LABELS[language]}. Press Tab to accept, Escape to dismiss.`
          : aiState.message}
      </p>
    </div>
  );
}

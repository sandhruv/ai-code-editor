import { useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "../constants/languages";
import { runCode, type RunResult } from "../services/runService";

export interface OutputPanelProps {
  language: SupportedLanguage;
  source: string;
  theme: "vs-dark" | "light";
  onClose: () => void;
}

type Phase = "idle" | "running" | "done" | "failed";

const TABS = ["Output", "Stdin"] as const;

export default function OutputPanel({ language, source, theme, onClose }: OutputPanelProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string>("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Output");
  const [stdin, setStdin] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const dark = theme === "vs-dark";

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleRun = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("running");
    setError("");
    setResult(null);
    setTab("Output");

    const outcome = await runCode(language, source, stdin, controller.signal);
    if (controller.signal.aborted) return;

    if (outcome.ok) {
      setResult(outcome.data);
      setPhase("done");
    } else {
      setError(outcome.error);
      setPhase("failed");
    }
  };

  const panelBg = dark ? "bg-[#181818]" : "bg-slate-50";
  const border = dark ? "border-white/10" : "border-slate-200";
  const muted = dark ? "text-slate-400" : "text-slate-500";
  const mono = dark ? "text-slate-100" : "text-slate-800";

  const ok = result && /accepted|finished/i.test(result.status);
  const statusTone = phase === "failed" || (result && !ok && result.status !== "Not runnable")
    ? "text-red-400"
    : result?.status === "Not runnable"
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className={`flex h-full flex-col border-t ${border} ${panelBg}`}>
      <div className={`flex items-center gap-2 border-b ${border} px-3 py-1.5`}>
        <button
          type="button"
          onClick={handleRun}
          disabled={phase === "running"}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {phase === "running" ? "Running…" : "▶ Run"}
        </button>

        <div className="flex gap-1" role="tablist" aria-label="Run panel tabs">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-2 py-1 text-xs ${
                tab === t
                  ? dark
                    ? "bg-white/10 text-white"
                    : "bg-white text-slate-900 shadow-sm"
                  : muted
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <span className={`ml-auto text-[11px] ${muted}`}>
          {phase === "running" && "executing\u2026"}
          {phase !== "running" && result && (
            <span className={statusTone}>
              {result.status}
              {result.wallTime ? ` \u00b7 ${result.wallTime}s` : ""}
              {result.executor ? ` \u00b7 ${result.executor}` : ""}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close output panel"
          className={`rounded px-2 py-1 text-xs ${muted} hover:opacity-70`}
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === "Stdin" ? (
          <>
            <label className={`mb-1 block text-[11px] ${muted}`} htmlFor="stdin-input">
              Standard input (passed to your program)
            </label>
            <textarea
              id="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={4}
              spellCheck={false}
              className={`w-full resize-y rounded-md border ${border} p-2 font-mono text-xs focus:outline-none ${
                dark ? "bg-black/30 text-slate-100" : "bg-white text-slate-900"
              }`}
              placeholder={"1 2 3\n10"}
            />
          </>
        ) : (
          <pre className={`whitespace-pre-wrap break-words font-mono text-xs leading-relaxed ${mono}`}>
            {phase === "idle" && (
              <span className={muted}>Press Run to execute the code in the editor.</span>
            )}
            {phase === "running" && <span className={muted}>Running…</span>}
            {phase === "failed" && <span className="text-red-400">{error}</span>}
            {phase === "done" && result && (
              <>
                {result.status === "Not runnable" && (
                  <span className="text-amber-400">{result.stderr}</span>
                )}
                {result.compileOutput && (
                  <span className="text-red-400">
                    {result.compileOutput.trim()}
                    {"\n\n"}
                  </span>
                )}
                {result.stdout && <span>{result.stdout}</span>}
                {result.stderr && (
                  <span className="text-red-400">
                    {result.compileOutput || result.stdout ? "\n" : ""}
                    {result.stderr.trim()}
                  </span>
                )}
                {!result.stdout && !result.stderr && !result.compileOutput && (
                  <span className={muted}>(program produced no output)</span>
                )}
              </>
            )}
          </pre>
        )}
      </div>
    </div>
  );
}

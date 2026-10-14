import { useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "../constants/languages";
import { runCode, type RunResult } from "../services/runService";
import { Icons } from "./ui";

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

  const border = dark ? "border-white/[0.08]" : "border-slate-200";
  const panelBg = dark ? "bg-[#141414]" : "bg-[#f8fafc]";
  const muted = dark ? "text-slate-500" : "text-slate-400";
  const mono = dark ? "text-slate-100" : "text-slate-800";

  const accepted = result ? /accepted|finished/i.test(result.status) : false;
  const notRunnable = result?.status === "Not runnable";
  const failed = phase === "failed" || (result !== null && !accepted && !notRunnable);

  const statusTone = notRunnable
    ? "text-amber-400"
    : failed
      ? "text-red-400"
      : "text-emerald-400";

  const tabCls = (on: boolean) =>
    `relative h-full px-3 text-[11.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
      on
        ? dark
          ? "text-white"
          : "text-slate-900"
        : dark
          ? "text-slate-500 hover:text-slate-300"
          : "text-slate-500 hover:text-slate-800"
    }`;

  return (
    <section
      className={`flex h-full flex-col ${panelBg} ${border} border-t`}
      aria-label="Run output"
    >
      {/* Header */}
      <div className={`flex h-9 shrink-0 items-center gap-2 border-b px-2 ${border}`}>
        <button
          type="button"
          onClick={handleRun}
          disabled={phase === "running"}
          className="inline-flex h-6 items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 text-[11.5px] font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-1 disabled:cursor-wait disabled:opacity-60"
        >
          {phase === "running" ? (
            <>
              <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Running
            </>
          ) : (
            <>
              <Icons.play size={11} />
              Run
            </>
          )}
        </button>

        <div className={`flex h-6 items-stretch ${dark ? "bg-white/[0.04]" : "bg-slate-200/60"} rounded-md px-0.5`} role="tablist" aria-label="Run panel tabs">
          {TABS.map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              type="button"
              onClick={() => setTab(t)}
              className={tabCls(tab === t)}
            >
              {t}
              {tab === t && (
                <span
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-indigo-500"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>

        <span className={`ml-auto flex items-center gap-2 text-[11px] ${muted}`}>
          {phase === "running" && <span className="animate-pulse">executing…</span>}
          {phase !== "running" && result && (
            <span className={`flex items-center gap-1.5 ${statusTone}`}>
              <span
                className={`h-1.5 w-1.5 rounded-full ${failed ? "bg-red-400" : notRunnable ? "bg-amber-400" : "bg-emerald-400"}`}
                aria-hidden="true"
              />
              {result.status}
              {result.wallTime ? ` · ${result.wallTime}s` : ""}
              {result.timeMs ? ` · ${result.timeMs}ms` : ""}
            </span>
          )}
          {phase === "failed" && <span className="text-red-400">failed</span>}
        </span>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close output panel"
          title="Close output panel"
          className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            dark ? "text-slate-500 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          }`}
        >
          <Icons.close size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-auto">
        {tab === "Stdin" ? (
          <div className="p-3">
            <label
              className={`mb-1.5 block text-[11px] font-medium ${muted}`}
              htmlFor="stdin-input"
            >
              Standard input — passed to your program
            </label>
            <textarea
              id="stdin-input"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={5}
              spellCheck={false}
              className={`w-full resize-y rounded-lg border p-2.5 font-mono text-xs leading-relaxed transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                dark
                  ? "border-white/10 bg-black/30 text-slate-100 placeholder:text-slate-600"
                  : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
              }`}
              placeholder={"3 4\n10"}
            />
            <p className={`mt-2 text-[11px] ${muted}`}>
              Example: for a program that reads two integers, type{" "}
              <code className={`rounded px-1 ${dark ? "bg-white/10" : "bg-slate-200"}`}>3 4</code>
            </p>
          </div>
        ) : (
          <div className="p-3">
            <pre className={`whitespace-pre-wrap break-words font-mono text-xs leading-[1.65] ${mono}`}>
              {phase === "idle" && (
                <span className={muted}>
                  Press <span className="text-emerald-400">Run</span> to execute the editor
                  contents in a sandbox.
                </span>
              )}
              {phase === "running" && <span className={muted}>Executing…</span>}
              {phase === "failed" && <span className="text-red-400">{error}</span>}
              {phase === "done" && result && (
                <>
                  {notRunnable && <span className="text-amber-400">{result.stderr}</span>}
                  {result.compileOutput && (
                    <span className="text-red-400">
                      {result.compileOutput.trim()}
                      {"\n\n"}
                    </span>
                  )}
                  {result.stdout && <span>{result.stdout}</span>}
                  {result.stderr && !notRunnable && (
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
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={`flex h-6 shrink-0 items-center gap-4 border-t px-3 text-[10.5px] ${border} ${muted}`}
      >
        <span className="flex items-center gap-1.5">
          <Icons.terminal size={12} />
          {result?.executor || "sandboxed executor"}
        </span>
        <span className="hidden sm:inline">Never runs on this server</span>
        <span className="ml-auto hidden md:inline">15 runs / min</span>
      </div>
    </section>
  );
}

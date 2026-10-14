import { useEffect, useRef } from "react";
import type * as monacoNs from "monaco-editor";
import { fetchCompletion, DEBOUNCE_MS, MIN_TYPE_INTERVAL_MS } from "../services/completionService";
import type { SupportedLanguage } from "../constants/languages";
import type { CompletionRequest, CompletionResponse } from "../../shared/types";

export type AiStatus =
  | "idle"
  | "disabled"
  | "typing"
  | "loading"
  | "ready"
  | "error"
  | "unavailable";

export interface InlineState {
  status: AiStatus;
  message: string;
  lastModel?: string;
  cached?: boolean;
}

interface UseInlineOptions {
  monaco: typeof monacoNs | null;
  editor: monacoNs.editor.IStandaloneCodeEditor | null;
  language: SupportedLanguage;
  enabled: boolean;
  onState: (state: InlineState) => void;
}

interface PendingRequest {
  id: number;
  controller: AbortController;
  key: string;
}

/** How many chars before the cursor we send as context. */
const CONTEXT_BEFORE = 3500;
/** How many chars after the cursor we send as context. */
const CONTEXT_AFTER = 800;

export function useInlineCompletions({ monaco, editor, language, enabled, onState }: UseInlineOptions) {
  const stateRef = useRef<InlineState>({ status: "idle", message: "" });
  const emit = (next: Partial<InlineState>) => {
    stateRef.current = { ...stateRef.current, ...next };
    onState(stateRef.current);
  };

  const disposeRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<PendingRequest | null>(null);
  const seqRef = useRef(0);
  const lastSentKeyRef = useRef<string>("");
  const enabledRef = useRef(enabled);
  const langRef = useRef<SupportedLanguage>(language);
  enabledRef.current = enabled;
  langRef.current = language;

  useEffect(() => {
    if (!monaco || !editor) return;

    const provider = monaco.languages.registerInlineCompletionsProvider("*", {
      // Trigger on typing; Monaco also re-queries after each edit.
      async provideInlineCompletions(model, position, _context, token) {
        if (!enabledRef.current) return { items: [] };
        if (token.isCancellationRequested) return { items: [] };

        const lang = langRef.current;
        const fullText = model.getValue();
        if (!fullText.trim()) return { items: [] };

        const offset = model.getOffsetAt(position);
        // Never request while the cursor sits before non-whitespace code.
        const after = fullText.slice(offset, offset + 1);
        if (after && !/[\s\n]/.test(after)) return { items: [] };

        const prefixStart = Math.max(0, offset - CONTEXT_BEFORE);
        const suffixEnd = Math.min(fullText.length, offset + CONTEXT_AFTER);
        const prefix = fullText.slice(prefixStart, offset);
        const suffix = fullText.slice(offset, suffixEnd);

        const key = `${lang}\u0000${prefix}\u0000${suffix}`;
        const composed = composePrefix(prefix);

        // Cancel any in-flight request: the code under the cursor changed.
        cancelPending();
        if (key === lastSentKeyRef.current) return { items: [] };

        // Debounce + minimum typing interval.
        await wait(DEBOUNCE_MS);
        if (token.isCancellationRequested) return { items: [] };
        if (Date.now() - lastSentAt() < MIN_TYPE_INTERVAL_MS) await wait(MIN_TYPE_INTERVAL_MS);
        if (token.isCancellationRequested) return { items: [] };

        const controller = new AbortController();
        const id = ++seqRef.current;
        pendingRef.current = { id, controller, key };

        emit({ status: "loading", message: "AI is thinking\u2026" });

        const body: CompletionRequest = { language: lang, code: prefix + suffix, cursorOffset: prefix.length };
        const result = await fetchCompletion(body, controller.signal);

        const isStale = token.isCancellationRequested || pendingRef.current?.id !== id;
        if (pendingRef.current?.id === id) pendingRef.current = null;
        if (isStale) return { items: [] };
        if (result.ok === false) {
          if (result.code === "ABORTED") return { items: [] };
          emit({
            status: result.code === "MISSING_API_KEY" ? "unavailable" : "error",
            message: result.error,
          });
          return { items: [] };
        }

        lastSentKeyRef.current = key;
        setLastSent(Date.now());

        const insertText = normalizeInsert(composed, result.data);
        if (!insertText) {
          emit({ status: "ready", message: "No suggestion", cached: result.data.cached });
          return { items: [] };
        }

        emit({
          status: "ready",
          message: "Press Tab to accept \u00b7 Esc to dismiss",
          cached: result.data.cached,
          lastModel: result.data.model,
        });

        return {
          items: [
            {
              insertText,
              range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
            },
          ],
        };
      },
      freeInlineCompletions() {},
    });

    disposeRef.current = () => provider.dispose();

    const keyDown = editor.onKeyDown((e) => {
      if (e.keyCode === monaco.KeyCode.Escape) {
        cancelPending();
        emit({ status: enabledRef.current ? "idle" : "disabled", message: "" });
      }
    });
    const modelChange = editor.onDidChangeModel(() => cancelPending());

    emit(enabled ? { status: "idle", message: "Ready" } : { status: "disabled", message: "AI off" });

    return () => {
      cancelPending();
      if (timerRef.current) window.clearTimeout(timerRef.current);
      keyDown.dispose();
      modelChange.dispose();
      provider.dispose();
      disposeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monaco, editor, enabled]);

  useEffect(() => {
    emit(enabled ? { status: "idle", message: "Ready" } : { status: "disabled", message: "AI off" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, language]);

  function cancelPending() {
    const p = pendingRef.current;
    if (p) {
      p.controller.abort();
      pendingRef.current = null;
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }
}

let lastSent = 0;
function lastSentAt(): number {
  return lastSent;
}
function setLastSent(v: number): void {
  lastSent = v;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/**
 * Monaco renders ghost text starting at the cursor, but the model may already
 * contain a partial word the user typed. If the completion repeats it we would
 * duplicate text, so drop the shared leading fragment.
 */
function normalizeInsert(composedPrefix: string, data: CompletionResponse): string {
  let text = data.completion.replace(/\r\n/g, "\n");
  if (!text) return "";

  // Never complete across a hard boundary into existing code.
  const tail = composedPrefix.match(/[\w$]+$/)?.[0] ?? "";
  if (tail) {
    if (text.startsWith(tail)) text = text.slice(tail.length);
    else {
      const m = text.match(/^[A-Za-z_$][\w$]*/);
      if (m && !tail.startsWith(m[0]) && !m[0].startsWith(tail)) {
        // Different identifier than the one being typed — drop the shared prefix overlap.
        const overlap = commonPrefix(tail, m[0]);
        if (overlap > 0) text = text.slice(overlap);
      }
    }
  }
  return text;
}

function commonPrefix(a: string, b: string): number {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function composePrefix(prefix: string): string {
  const m = prefix.match(/[\w$]+$/);
  return m ? m[0] : "";
}

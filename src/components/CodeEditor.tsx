import { useEffect, useRef, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import type * as monacoNs from "monaco-editor";
import {
  useInlineCompletions,
  type AiStatus,
  type InlineState,
} from "../hooks/useInlineCompletions";
import { MONACO_LANGUAGE, type SupportedLanguage } from "../constants/languages";
import { starterCode as starterFor } from "../constants/starterCode";

export interface CodeEditorProps {
  language: SupportedLanguage;
  value: string;
  /** Bump this to force-load `value` (language switch / reset). Never bump while typing. */
  resetKey: number;
  onChange: (next: string) => void;
  theme: "vs-dark" | "light";
  fontSize: number;
  minimap: boolean;
  aiEnabled: boolean;
  onState: (state: InlineState) => void;
  onCursorChange?: (pos: { line: number; col: number }) => void;
}

export default function CodeEditor({
  language,
  value,
  resetKey,
  onChange,
  theme,
  fontSize,
  minimap,
  aiEnabled,
  onState,
  onCursorChange,
}: CodeEditorProps) {
  const [editor, setEditor] = useState<monacoNs.editor.IStandaloneCodeEditor | null>(null);
  const [monaco, setMonaco] = useState<typeof monacoNs | null>(null);

  // Latest value without re-running the load effect on every keystroke.
  const valueRef = useRef(value);
  valueRef.current = value;
  const cursorRef = useRef(onCursorChange);
  cursorRef.current = onCursorChange;

  useInlineCompletions({
    monaco,
    editor,
    language,
    enabled: aiEnabled,
    onState,
  });

  const handleMount: OnMount = (ed, mc) => {
    setEditor(ed);
    setMonaco(mc);
    let frame = 0;
    const emit = () => {
      if (frame) return;
      // Coalesce cursor updates to one per animation frame so typing stays light.
      frame = requestAnimationFrame(() => {
        frame = 0;
        const p = ed.getPosition();
        cursorRef.current?.({ line: p?.lineNumber ?? 1, col: p?.column ?? 1 });
      });
    };
    emit();
    ed.onDidChangeCursorPosition(emit);
    ed.onDidChangeModelContent(emit);
  };

  // Load external content only on mount or an explicit reset — never on typing.
  useEffect(() => {
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (!model) return;
    const next = valueRef.current;
    if (model.getLanguageId() !== MONACO_LANGUAGE[language]) {
      monaco.editor.setModelLanguage(model, MONACO_LANGUAGE[language]);
    }
    if (model.getValue() !== next) {
      model.setValue(next);
      editor.setPosition({ lineNumber: 1, column: 1 });
      editor.revealPosition({ lineNumber: 1, column: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, monaco, resetKey]);

  useEffect(() => {
    if (!editor) return;
    editor.updateOptions({
      fontSize,
      minimap: { enabled: minimap },
      theme,
    });
  }, [editor, fontSize, minimap, theme]);

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        language={MONACO_LANGUAGE[language]}
        defaultValue={value}
        theme={theme}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        loading={
          <div className="flex h-full items-center justify-center text-sm opacity-70">
            Loading editor…
          </div>
        }
        options={{
          fontSize,
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: minimap },
          lineNumbers: "on",
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          wordWrap: "off",
          tabSize: 4,
          insertSpaces: true,
          autoClosingBrackets: "always",
          autoClosingQuotes: "always",
          autoIndent: "full",
          matchBrackets: "always",
          bracketPairColorization: { enabled: true },
          renderLineHighlight: "all",
          padding: { top: 12, bottom: 12 },
          suggestOnTriggerCharacters: true,
          quickSuggestions: true,
          tabCompletion: "on",
          // AI ghost text renders as inline completions; keep Monaco's own
          // suggestion widget available as a fallback.
          inlineSuggest: { enabled: true },
          scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        }}
      />
    </div>
  );
}

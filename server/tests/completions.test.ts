import test from "node:test";
import assert from "node:assert/strict";
import { validateCompletionBody } from "../routes/completions.js";
import { buildPrompt, sanitizeCompletion, splitCode } from "../services/groqService.js";

test("validateCompletionBody accepts a valid payload", () => {
  const code = "def add(a, b):\n    ";
  const r = validateCompletionBody({
    language: "python",
    code,
    cursorOffset: 10,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.language, "python");
    assert.equal(r.value.cursorOffset, 10);
    assert.equal(r.value.code, code);
  }
});

test("validateCompletionBody clamps cursorOffset beyond code length", () => {
  const code = "def add(a, b):\n    ";
  const r = validateCompletionBody({ language: "python", code, cursorOffset: 24 });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.cursorOffset, code.length);
});

test("validateCompletionBody rejects unknown language", () => {
  const r = validateCompletionBody({ language: "cobol", code: "x", cursorOffset: 1 });
  assert.equal(r.ok, false);
});

test("validateCompletionBody rejects missing code", () => {
  const r = validateCompletionBody({ language: "java" });
  assert.equal(r.ok, false);
});

test("validateCompletionBody clamps out-of-range cursor", () => {
  const r = validateCompletionBody({ language: "go", code: "package main", cursorOffset: 999 });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.cursorOffset, 12);
});

test("splitCode splits at cursor", () => {
  const { prefix, suffix } = splitCode({ language: "c", code: "int main(){}", cursorOffset: 4 });
  assert.equal(prefix, "int ");
  assert.equal(suffix, "main(){}");
});

test("buildPrompt includes code before/after and language", () => {
  const p = buildPrompt("typescript", "const a = ", ";");
  assert.match(p, /typescript/);
  assert.match(p, /<CODE_BEFORE>\nconst a = \n<\/CODE_BEFORE>/);
  assert.match(p, /<CODE_AFTER>\n;\n<\/CODE_AFTER>/);
});

test("sanitizeCompletion strips markdown fences", () => {
  assert.equal(sanitizeCompletion("```python\nprint(1)\n```"), "print(1)");
  assert.equal(sanitizeCompletion("print(2)"), "print(2)");
});

test("sanitizeCompletion removes chatty preamble", () => {
  const out = sanitizeCompletion("Here's the completion:\nconsole.log(x);");
  assert.equal(out.trim(), "console.log(x);");
});

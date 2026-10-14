# AI Code Editor

A web-based code editor (VS Code style) with **real AI inline autocomplete** powered by the **Groq API**. Ghost text appears as you type — press **Tab** to accept, **Esc** to dismiss.

## Live demo

**https://ai-code-editor-nr3g.onrender.com**

Runs the React client and the Express API from a single Render service, so no CORS setup is required. The free plan sleeps after ~15 minutes of inactivity — the first request after a cold start takes 30–60 s.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Setup (Windows / VS Code)](#setup-windows--vs-code)
- [Scripts](#scripts)
- [API](#api)
- [Deploying](#deploying)
- [Limitations](#limitations)
- [Tests](#tests)

## Features

- Monaco Editor (`@monaco-editor/react`) with syntax highlighting, bracket matching, auto-indent, line numbers, minimap toggle, font-size controls
- **AI inline autocomplete** via Monaco's `registerInlineCompletionsProvider`
  - ~650 ms debounce + 250 ms minimum typing interval (no request per keystroke)
  - Stale/abort handling — continuing to type cancels the in-flight request
  - Request deduplication + in-memory cache on the server
  - Context-window limits, configurable token cap, request timeout
  - Multiline completions
- 13 languages: Java, Python, C, C++, JavaScript, TypeScript, HTML, CSS, SQL, Go, Rust, PHP, JSON
- Professional two-tier IDE chrome: brand/title bar with a language-coloured file tab, a grouped command bar, and a segmented status bar
- Dark / light themes, AI on/off toggle, minimap toggle, font-size control, copy and reset buttons
- **Run Code panel** — executes Python, Java, C, C++, JavaScript, TypeScript, Go, Rust, PHP and SQL in the Judge0 CE sandbox (never on this server); shows stdout, stderr, compile errors, exit status and runtime, plus a Stdin tab
- Draggable divider between the editor and the output panel
- Built-in Monaco suggestions stay available when AI is off or unavailable
- Server-side rate limiting (30 completions/min, 15 runs/min) plus client-side request throttling

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Editor   | Monaco Editor via `@monaco-editor/react` (bundled locally, not CDN) |
| Backend  | Node.js + Express + TypeScript (`tsx`) |
| AI       | Groq API (`groq-sdk`) |
| Execution| Judge0 CE sandboxed container API |

## Project structure

```
src/
  components/CodeEditor.tsx     Monaco wrapper + uncontrolled value handling
  components/Toolbar.tsx        brand/title bar + command bar controls
  components/StatusBar.tsx      language, cursor, live AI status
  components/OutputPanel.tsx    run output, status, stdin tab
  components/ui.tsx             icons, shared button, language colours
  hooks/useInlineCompletions.ts Monaco inline completions provider
  services/completionService.ts fetch + timeout + debounce constants
  services/runService.ts        run-code client
  constants/languages.ts        13 supported languages
  constants/starterCode.ts      per-language starter snippets
  lib/monacoSetup.ts            local Monaco loader + web workers
  App.tsx / main.tsx / index.css
server/
  index.ts                      Express app (API + static in production)
  routes/completions.ts         POST /api/completions + validation + rate limit
  routes/run.ts                 POST /api/run + validation + rate limit
  services/groqService.ts       prompt, sanitize, cache, dedup, error mapping
  services/executionService.ts  Judge0 CE adapter + limits
  tests/completions.test.ts     node:test unit tests
shared/types.ts                 shared request/response types
render.yaml                     Render deployment blueprint
```

## Setup (Windows / VS Code)

Requires **Node.js 20+**.

```powershell
npm install
copy .env.example .env
npm run dev
```

Then paste your Groq key into `.env`.

Open **http://localhost:5173** (client) — the API runs on **http://localhost:8787**.

### Adding the Groq API key

1. Create a free key at <https://console.groq.com/keys>
2. Open `.env` and set:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```
3. Restart `npm run dev`. The server logs `GROQ_API_KEY: present`.

`.env` is gitignored. **Never** put the key in client code, `VITE_*` variables, or the URL — anything prefixed `VITE_` is bundled into browser JS.

### Choosing a model

```env
GROQ_MODEL=qwen/qwen3.8-27b
```

List the models your account can actually use:

```powershell
curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $env:GROQ_API_KEY"
```

The default (`qwen/qwen3.8-27b`) was picked by testing against a real key. Some Groq models are *reasoning* models (`openai/gpt-oss-*`) that spend all their tokens on hidden reasoning and return an empty completion — avoid those for autocomplete. If you get a 404, your model name is not available to your account.

## Scripts

| Command | What it does |
|---------|--------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Client + server together (via `concurrently`) |
| `npm run build` | Production bundle into `dist/` |
| `npm start` | Production: Express serves API **and** `dist/` |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (`node:test`) |

### Production

```powershell
npm run build
npm start
# http://localhost:8787
```

## API

### `POST /api/completions`

```json
{ "language": "python", "code": "def add(a, b):\n    ", "cursorOffset": 20 }
```

Response:

```json
{ "completion": "return a + b", "language": "python", "model": "qwen/qwen3.8-27b", "cached": false, "elapsedMs": 512 }
```

Errors return `{ "error": "...", "code": "BAD_REQUEST | MISSING_API_KEY | RATE_LIMITED | UPSTREAM_ERROR | TIMEOUT | EMPTY_COMPLETION | INTERNAL" }`.

### `POST /api/run`

```json
{ "language": "python", "source": "print(6 * 7)", "stdin": "" }
```

Response:

```json
{ "runnable": true, "language": "python", "status": "Accepted", "stdout": "42\n", "stderr": "", "compileOutput": "", "timeMs": 1012, "wallTime": "0.004", "executor": "Judge0 CE" }
```

Markup languages return `"runnable": false` with an explanation instead of being executed.

### Health

- `GET /api/completions/health` → `{ ok, model, hasApiKey }`
- `GET /api/health` → liveness probe (used by Render)

## Deploying

### Render (recommended — full app, one service)

Live instance: **https://ai-code-editor-nr3g.onrender.com**

1. Push this repo to GitHub.
2. Render → **New +** → **Blueprint** → select the repo. `render.yaml` is picked up automatically.
3. In the service's **Environment**, set `GROQ_API_KEY` (marked `sync: false` so it is never read from the repo).
4. Deploy. `npm run build` produces `dist/`, and `npm start` serves both the API and the frontend from one origin — so CORS is not involved.

Free-tier web services sleep after inactivity; the first request after a cold start takes ~30–60 s.

### Netlify (frontend only)

Static hosting cannot run Express. Deploy `dist/` and AI autocomplete will 404. For the full app, port `POST /api/completions` to a Netlify Function. Netlify free tier allows 125k invocations/month but functions cold-start ~1–3 s, which is slow next to a 650 ms autocomplete debounce.

## Limitations

- **Groq free tier** has strict per-model requests/minute and tokens/day. This app cannot guarantee unlimited or free usage — heavy typing will hit rate limits (handled with a 429 response and the status-bar message).
- **Advanced IntelliSense is not included.** Monaco provides syntax highlighting, bracket matching and basic word suggestions. True language-aware completion needs a language server (e.g. `monaco-languageclient`). The AI completion uses the selected language only as prompt context.
- **Tab / Esc accept-dismiss** relies on Monaco's built-in inline-completion keybindings. Verified indirectly (typecheck, build, tests, live API calls) — confirm manually in the browser.
- **Code execution runs off-server.** User code is never executed by the Express process — it is sent to Judge0 CE, a sandboxed container API. The public Piston API became whitelist-only on 2026-02-15, so Judge0 CE is the default. Set `JUDGE0_URL` to your own Judge0 or Piston instance if you hit its free-tier limits (public CE is rate-limited and occasionally congested; `RUN_RATE_LIMIT` controls our own cap of 15 runs/min per IP). HTML, CSS and JSON are reported as `Not runnable` rather than executed. Versions on public Judge0 CE are dated (for example Node 12, TypeScript 3.7, Java 13), so very new language syntax may not compile.
- The AI can return wrong or empty completions; empty results are surfaced as `EMPTY_COMPLETION` rather than inserted.

## Tests

```powershell
npm test
```

Covers request validation, cursor clamping, context splitting, prompt construction and markdown/prose sanitization.

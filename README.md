# AI Code Editor

A web-based code editor (VS Code style) with **real AI inline autocomplete** powered by the **Groq API**. Ghost text appears as you type — press **Tab** to accept, **Esc** to dismiss.

## Features

- Monaco Editor (`@monaco-editor/react`) with syntax highlighting, bracket matching, auto-indent, line numbers, minimap toggle, font-size controls
- **AI inline autocomplete** via Monaco's `registerInlineCompletionsProvider`
  - ~650 ms debounce + 250 ms minimum typing interval (no request per keystroke)
  - Stale/abort handling — continuing to type cancels the in-flight request
  - Request deduplication + in-memory cache on the server
  - Context-window limits, configurable token cap, request timeout
  - Multiline completions
- 13 languages: Java, Python, C, C++, JavaScript, TypeScript, HTML, CSS, SQL, Go, Rust, PHP, JSON
- Dark / light themes, AI on/off toggle, copy button, reset button, status bar with AI state
- Built-in Monaco suggestions stay available when AI is off or unavailable
- Server-side rate limiting (30 req/min) + client-side request throttling
- No code execution on the server (see *Roadmap*)

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Editor   | Monaco Editor via `@monaco-editor/react` (bundled locally, not CDN) |
| Backend  | Node.js + Express + TypeScript (`tsx`) |
| AI       | Groq API (`groq-sdk`) |

## Project structure

```
src/
  components/CodeEditor.tsx     Monaco wrapper + uncontrolled value handling
  components/Toolbar.tsx        language/theme/font/minimap/AI controls
  components/StatusBar.tsx      language, cursor, AI status
  hooks/useInlineCompletions.ts Monaco inline completions provider
  services/completionService.ts fetch + timeout + debounce constants
  constants/languages.ts        13 supported languages
  constants/starterCode.ts      per-language starter snippets
  lib/monacoSetup.ts            local Monaco loader + web workers
  App.tsx / main.tsx / index.css
server/
  index.ts                      Express app (API + static in production)
  routes/completions.ts         POST /api/completions + validation + rate limit
  services/groqService.ts       prompt, sanitize, cache, dedup, error mapping
  tests/completions.test.ts     node:test unit tests
shared/types.ts                 shared request/response types
render.yaml                     Render deployment blueprint
```

## Setup (Windows / VS Code)

Requires **Node.js 20+**.

```powershell
npm install
copy .env.example .env      # then paste your Groq key into .env
npm run dev
```

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

- `GET /api/completions/health` → `{ ok, model, hasApiKey }`
- `GET /api/health` → liveness probe (used by Render)

## Deploying

### Render (recommended — full app, one service)

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
- **Code execution is not implemented.** Running arbitrary user code on the Express server is unsafe. Future options: a sandboxed container service (Judge0, Piston) or WebContainers. Both have free-tier limits and would need to be documented before use.
- The AI can return wrong or empty completions; empty results are surfaced as `EMPTY_COMPLETION` rather than inserted.

## Tests

```powershell
npm test
```

Covers request validation, cursor clamping, context splitting, prompt construction and markdown/prose sanitization.

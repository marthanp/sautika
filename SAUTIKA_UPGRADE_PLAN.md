# Sautika Platform Upgrade: Implementation Brief for Claude Code

You are working on **Sautika** (`github.com/marthanp/sautika`, live at `sautika.vercel.app`), a voice-first learning platform for East African learners from Baby Class to Senior 6. The stack is Next.js 16 (App Router, `--webpack`), React 18, TypeScript, Tailwind CSS 4, Zustand, Clerk, MongoDB Atlas, Cloudflare R2, Sunbird AI and a multi-provider LLM engine.

Work through this brief in order. Each task has the files to touch, what to build, and how to check it is done. Commit after each task with a clear message. Do not push or open a pull request until I say so.

---

## Ground rules

- Create a branch first: `git checkout -b feature/platform-upgrade`.
- Run `npm install` once. After every task, run `npm run typecheck` and `npm run lint`, and fix what you broke before moving on. Run `npm run build` at the end of tasks 1, 4, 6 and 10.
- Keep the existing design tokens in `src/app/globals.css` (`navy #001731`, `navy-2 #0a2547`, `sun #ffc400`, `sun-dark`, `ink`, `mist`, `paper`, `line`) and the fonts (Inter, Poppins).
- Never claim a feature works unless it does. If the UI promises something the server does not enforce, fix one or the other.
- Every new animation must use only `transform`/`opacity` and must be switched off under `prefers-reduced-motion: reduce`.
- Touch targets at least 44px, visible focus states, real `aria-*` attributes on interactive elements.
- Do not log or return secrets. Never send API keys to the client.

### Shortcut

If the file `sautika-platform-upgrade.patch` is in the project root, try `git am sautika-platform-upgrade.patch` first. If it applies cleanly, skip to **Task 11 (Verification)**, then fix any build or type errors it turns up. If it does not apply, implement the tasks below.

---

## Task 1: Fix the broken build (merge conflicts)

The last commit contains unresolved conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`), so the project cannot compile.

**Files**
- `src/store/useApp.ts` (3 conflict blocks)
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/Topbar.tsx`
- `src/components/voice/FloatingDialectSelector.tsx`
- `src/components/voice/VoiceCourseSearch.tsx`
- `src/components/VoiceCourseSearch.tsx` (old duplicate, unused)

**Do**
1. In `useApp.ts`, keep the **HEAD** side: a single `dialect: VoiceLang` field defaulting to `'eng'`, with `setDialect`, and `'dialect'` included in the `setPrefs` key list. Remove `activeDialect` and `setActiveDialect`.
2. In `Sidebar.tsx`, the resolved imports are:
   ```ts
   import { useUITranslation } from '@/lib/useUITranslation';
   import { Logo } from '@/components/ui/Logo';
   ```
3. In `Topbar.tsx`, the resolved imports are:
   ```ts
   import { useUITranslation } from '@/lib/useUITranslation';
   import { useLearnerProfile } from '@/components/providers/LearnerDataSync';
   import { Logo } from '@/components/ui/Logo';
   ```
4. In both voice components, read `state.dialect || 'eng'` and call `state.setDialect`.
5. Delete `src/components/VoiceCourseSearch.tsx` (nothing imports it).

**Done when** `grep -rn "^<<<<<<<\|^>>>>>>>" src` returns nothing, `grep -rn "activeDialect\b" src` only finds the `activeDialectName` prop in `VoiceStateOrb.tsx`, and `npm run build` succeeds.

---

## Task 2: Secure the API routes

Right now `/api/notebook`, `/api/ocr`, `/api/stt`, `/api/tts`, `/api/translate` and `/api/sync` have no login check. `clerkMiddleware()` in `src/proxy.ts` does not block anything by default. Anyone can drain the Sunbird, OCR and LLM quotas, and anyone can trigger `/api/sync`, which copies every learner's notes into R2 at predictable paths like `mongodb-sync/notes/latest.json`.

### 2a. Create `src/lib/api-guard.ts`

Export:
- `requireUser(): Promise<{ ok: true; value: string } | { ok: false; response: Response }>` using `auth()` from `@clerk/nextjs/server`. Returns 401 JSON `{ error: 'Please sign in to use this feature.' }` when signed out.
- `rateLimit(key, limit, windowMs): Response | null`: a fixed-window limiter in a module-level `Map`. On overflow return 429 with a `Retry-After` header. Prune expired buckets when the map passes 5000 entries. Add a comment saying this works per instance and should move to Upstash Redis or Vercel KV under heavy traffic.
- `clientIp(req)`: first value of `x-forwarded-for`, else `x-real-ip`, else `'unknown'`.
- `guardUser(scope, limit, windowMs = 60_000)`: `requireUser` plus a per-user `rateLimit` on the key `` `${scope}:${userId}` ``.
- `requireCronSecret(req): Response | null`: accepts `Authorization: Bearer <SYNC_SECRET or CRON_SECRET>` with a constant-time compare. Returns 503 if neither variable is set, and 401 if the token is wrong.

### 2b. Apply the guards

| Route | Guard | Extra |
| --- | --- | --- |
| `api/stt/route.ts` | `guardUser('stt', 20)` | Reject audio over 10 MB with 413 |
| `api/tts/route.ts` | `guardUser('tts', 30)` | |
| `api/ocr/route.ts` | `guardUser('ocr', 10)` | 10 MB file limit (413). Store uploads under `uploads/${userId}/...`. Return 415 for unsupported types instead of decoding binary as UTF-8. Return a generic error message, not `error.message`. |
| `api/notebook/route.ts` | `guardUser('notebook', 15)` | See Task 4 |
| `api/translate/route.ts` | Signed in: 120/min per user. Signed out: 30/min per IP, 600-character cap | The landing page switcher is used by signed-out visitors, so do not require login here |
| `api/sync/route.ts` | `requireCronSecret` on GET and POST | Allow-list collection names on POST: `courses, sources, notes, rewards, course_progress, profiles, coin_transactions` |

### 2c. pdf-parse v2 compatibility (in the OCR route)

The project depends on `pdf-parse@^2`, which exports a `PDFParse` class rather than a function. Replace the `require('pdf-parse')` call with a dynamic import that supports both:
```ts
const mod = (await import('pdf-parse')) as any;
if (mod.PDFParse) { const p = new mod.PDFParse({ data: buffer }); extractedText = (await p.getText()).text; await p.destroy?.(); }
else if (typeof mod.default === 'function') { extractedText = (await mod.default(buffer)).text; }
```

### 2d. Nightly backup via Vercel Cron

- In `api/sync/route.ts` GET: if `?run=true` (after the secret check), run `syncMongoCollectionsToR2([...default five])` and return the result (200, or 207 on partial failure).
- Create `vercel.json`:
  ```json
  { "$schema": "https://openapi.vercel.sh/vercel.json",
    "crons": [{ "path": "/api/sync?run=true", "schedule": "0 23 * * *" }] }
  ```

**Done when**
- A signed-out `curl -X POST /api/notebook` returns 401.
- `curl /api/sync` without the secret returns 401 (or 503 if no secret is set).
- The 31st anonymous translate request in a minute returns 429.

---

## Task 3: Fair coin economy

**Files**: `src/app/api/account/route.ts`, `src/data/catalog.ts`, `src/app/(app)/rewards/page.tsx`

1. In the account route, add `const NOTE_COIN_DAILY_CAP = 5;`. Inside the note-creation transaction, after the note is inserted and before coins are added, count today's (UTC) `coin_transactions` for this user with `type: 'earn'` and `idempotencyKey` starting with `note:`. If the count is at or above the cap, save the note but award no coins.
2. `EARN` in `catalog.ts` currently advertises "Pass a Quiz +15", "Daily Login +10" and "Reach a Milestone +30". No server code awards these. Replace the list with only what the server enforces:
   ```ts
   export const EARN = [['Complete a Lesson', '+10 coins', '#10B981'], ['Add a Note', '+5 coins (up to 5 a day)', '#2F6BFF']] as const;
   ```
3. In `rewards/page.tsx`, set `EARN_ICONS = [BookOpen, FileText]`.

**Done when** creating a 6th note in one day saves the note but leaves the coin balance unchanged.

---

## Task 4: Upgrade the AI engine and connect the AI Study Tutor

The `/api/notebook` endpoint exists, but **no screen calls it**, so the Summarise, Study Guide, Quiz and Ask features in the README cannot be reached.

### 4a. Rewrite `src/lib/llm-providers.ts`

- Keep the failover order: Gemini → Groq → OpenRouter → Mistral → SambaNova → Fireworks → NVIDIA NIM → Kimi → Zhipu → Cohere → built-in fallback.
- Use a table for the OpenAI-compatible providers (name, key env names, URL, default model, model env name), so each model can be overridden: `GROQ_MODEL`, `OPENROUTER_MODEL`, `MISTRAL_MODEL`, `SAMBANOVA_MODEL`, `FIREWORKS_MODEL`, `NVIDIA_MODEL`, `KIMI_MODEL`, `ZHIPU_MODEL`, `COHERE_MODEL`. Keep the current default model strings.
- **Gemini**: the default model is `gemini-3.8-flash` (current GA Flash model; overridable with `GEMINI_MODEL`). `gemini-1.5-flash` is retired. Send the key in the `x-goog-api-key` header, not the URL. **Do not send `temperature`**: Gemini 3.6+ has deprecated the sampling parameters. Send `contents: [{ role: 'user', parts: [...] }]`, and set `responseMimeType: 'application/json'` when `json: true`.
- **Cohere**: use `https://api.cohere.com/v2/chat` with a `messages` array.
- Add `AbortSignal.timeout(timeoutMs)` to every call (default 25 s).
- New options: `json?: boolean`, `allowHeuristic?: boolean` (default true), `heuristicSource?: string`, `timeoutMs?: number`.
- Export `hasAnyLLMProvider()` and `configuredProviders()`.
- **Fix the fallback.** It currently summarises the *instruction text*, producing output like "Key Concept 1: Summarize the sources in 4 to 5...". Replace it with an extractive summary of `heuristicSource`: split into sentences, score each by word frequency, keep the top 4 in their original order as bullet points, and add a study tip.
- If `allowHeuristic` is false and every provider fails, throw `'No AI provider is available right now.'`.

### 4b. Rewrite `src/app/api/notebook/route.ts`

- Guard with `guardUser('notebook', 15)` and `export const maxDuration = 60`.
- Validate the body: `mode` is one of `ask | summary | guide | lesson`; 1 to 8 sources, each `{ name: string, text: string }`; optional `question` up to 1000 characters; `language` must be a Sunbird language code.
- Build the system prompt from numbered sources (`[Source n: name]`, 25,000 characters each). Tutor rules: warm and simple, use ONLY the sources, cite like `[1]`, and say kindly when the notes don't cover something.
- `lesson` mode: ask for a JSON array of `{q, a, d:[wrong1, wrong2], e}` (`e` is a one-sentence explanation with a citation). Call with `json: true, allowHeuristic: false`. Extract the array between the first `[` and the last `]`, keep only valid items, and fail with 502 if fewer than 3 remain. Translate every field into the learner's language with `translateText` (Task 5). Return `{ items, provider }`.
- Other modes: `summary` (4 to 5 bullets plus 3 vocabulary terms), `guide` (key ideas, core terms, practice questions with answers, up to 250 words), `ask` (the question; if it isn't in English, translate it to English first with `polishEnglish: true`). Pass `heuristicSource: sourceText`. Translate the answer back and return JSON `{ answer, provider, mode }`. The old version returned plain text.

### 4c. Create `src/app/(app)/notebook/StudyTutor.tsx` (client component)

Props: `notes: Note[]` and `onSaveAsNote({ title, text })`.
- Header bar: navy gradient with a sun-coloured sparkle icon, "AI Study Tutor", and "Answers use only your notes, in {language}". The language comes from `useApp(s => s.dialect)`.
- Left column:
  1. Note chips: toggle buttons with `aria-pressed`, maximum 8 selected.
  2. Four action cards: Summarise, Study guide, Quiz me, Ask a question.
  3. A textarea when Ask is selected.
  4. A primary button: disabled until at least one note is picked (and a question typed, for Ask). Label "Choose a note to start", then "Ask the tutor", and "Thinking…" while loading.
- Right column (`aria-live="polite"`): empty state, skeleton lines while loading, error box, then the result.
  - Text answers render `[n]` citations as small highlighted superscripts. Buttons: **Listen** (POST `/api/tts` with citations stripped, falling back to `speechSynthesis`) and **Review and save as note**, which calls `onSaveAsNote` so the learner edits before saving.
  - Quizzes render a `QuizPlayer`: progress bar, options shuffled with a stable seed, `role="radiogroup"`/`role="radio"`, green or red feedback, the explanation, Next, and a final score with a "New quiz" button. Call every hook before any early return.

### 4d. Update `src/app/(app)/notebook/NotebookBoard.tsx`

- Render `<StudyTutor notes={notes} onSaveAsNote={...} />` above the notes grid. Saving opens the existing new-note modal prefilled.
- **Review before saving uploads**: after `/api/ocr` returns, open the modal prefilled with the extracted text (up to 50,000 characters), title, `r2Url` and `r2Key`, and `fromUpload: true`. Do not save automatically. In upload mode the modal title is "Check your uploaded notes", with the hint "We read this from your file. Fix any mistakes before saving." and a 10-row textarea. Include `r2Url` and `r2Key` when saving.
- Close the modal with Escape. Widen it to `max-w-[560px]` with `max-h-[90vh] overflow-y-auto`.
- Fix the voice picker. `'ate'` is not a valid code (it should be `'teo'`), and Lugbara (`lgg`) has no Sunbird voice. Use: Luganda `lug`, Acholi `ach`, Ateso `teo`, Runyankole `nyn`, Swahili `swa`, Kinyarwanda `kin`, English `eng`. Add `aria-label="Voice language"`.
- Add `'Life Skills'` to the filter list.
- Limit the file input's `accept` to what the OCR route supports: `.pdf,.docx,.txt,.md,.csv,.json`, images, and the matching MIME types.

**Done when** a signed-in learner can select a note, get a summary with citations, take a 5-question quiz, hear the answer, and save it as a note. Uploading a photo opens the editable review modal.

---

## Task 5: Translation router for better English

### 5a. Create `src/lib/translation.ts`

```ts
export async function translateText(text, sourceLanguage, targetLanguage, options?: { polishEnglish?: boolean; providers?: ('sunbird'|'google'|'llm')[] }): Promise<{ text: string; provider: 'sunbird'|'google'|'llm'|'none'; polished?: boolean }>
export function translationProviders(): Record<'sunbird'|'google'|'llm', boolean>
```

- **Providers**:
  1. **Sunbird AI**: the existing `translateWithSunbird`.
  2. **Google Cloud Translation Basic v2**: POST `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}` with `{ q, source, target, format: 'text' }`, reading `data.translations[0].translatedText`.
  3. **LLM**: translation through `generateAIResponse` with `allowHeuristic: false`.
- **Routing**: if either language is a Sunbird specialist (`lug, ach, teo, lgg, nyn, myx, xog, cgg, koo, ruc, ttj, led, kin, swa, luo, kln, luy`), try Sunbird → Google → LLM. Otherwise try Google → Sunbird → LLM. `TRANSLATION_PROVIDER_ORDER` (for example `google,sunbird,llm`) overrides this.
- **Google code map** (only languages Google lists): `eng:en, swa:sw, lug:lg, ach:ach, kin:rw, amh:am, hau:ha, ibo:ig, yor:yo, zul:zu, xho:xh, sna:sn, som:so, orm:om, lin:ln, nya:ny, mlg:mg, aka:ak, afr:af, ewe:ee, ful:ff, wol:wo, sot:st, tsn:tn, bam:bm, nbl:nr, kik:ki`. Throw for unmapped pairs so the router moves on.
- **English polish**: when the target is `eng` and `polishEnglish` (or `TRANSLATION_ENGLISH_POLISH=true`) is on, run the result through the LLM as an editor: fix grammar and fluency, keep meaning, numbers and `[n]` markers, add nothing. Reject the edit if it is more than 1.6 times longer.
- Keep an in-memory cache of 2000 entries keyed by languages, polish flag and text.
- If every provider fails, log the errors server-side and throw a friendly message.

### 5b. Rewrite `src/app/api/translate/route.ts`

- Rate limits as in Task 2.
- Support `{ texts: string[] }` (up to 60, each within the length cap) and return `{ texts, providers }`. A failed item falls back to the original text.
- Keep `{ text }` and return `{ text, provider, polished }`.
- Only signed-in users may set `polishEnglish: true`.

### 5c. Update `src/lib/useUITranslation.ts`

- Replace the one-request-per-label fetch with a **batcher**: queue strings per language, flush after 30 ms, and POST in chunks of 40 using `texts`.
- Save the cache to `localStorage` under `sautika-ui-translations-v1` (debounced 500 ms) and load it on first use, wrapped in try/catch. A learner's chosen language then still shows offline.
- Keep the hook's public API, `t(english) => string`, unchanged.

**Done when** switching the interface to Luganda sends about one `/api/translate` request per screen instead of dozens, and the notebook uses `translateText` everywhere.

---

## Task 6: New landing hero with motion graphics

**Files**: `src/components/landing/Hero.tsx` (rewrite), `src/app/globals.css` (append), `src/components/landing/Features.tsx` (rewrite), new `src/components/landing/Reveal.tsx`

### 6a. Hero layout (client component)

- `section#home.hero-root`: navy background, with absolute background layers: two blurred, drifting glows (sun/20 and sky-500/15) and a faint masked grid.
- **Header**:
  - The Logo.
  - A pill nav (Home, Features, About, Help) where the current item is filled white.
  - A language button showing the current interface language, with `aria-expanded` and `aria-haspopup="listbox"`. It opens a list of English `eng`, Swahili `swa`, Luganda `lug`, Acholi `ach`, Ateso `teo`, Runyankole `nyn` and Kinyarwanda `kin`. Choosing one calls `setDialect(code)`. **The current version only changes local state, which does nothing.**
  - Close the menu on outside click and on Escape.
- **Two-column grid** (stacks on mobile).
- **Left column**, each child fading up in a stagger (`.hero-stagger`):
  1. Eyebrow pill: "Voice-first AI tutor for East African learners".
  2. A rotating greeting every 2.6 s (not when reduced motion is on), with the language name in small caps beside it: "Oli otya?" (Luganda), "Habari?" (Swahili), "Agandi?" (Runyankole), "Itye nining?" (Acholi), "Yoga!" (Ateso), "Muraho!" (Kinyarwanda), "Hello!" (English). Re-key the element so the `hero-word` animation replays.
  3. H1: "Learn in the language **you think in.**", with a hand-drawn SVG underline under the bold part that draws itself.
  4. Body: "Speak a question, hear the answer. Sautika turns your notes and class lessons into quizzes, summaries and study guides in Luganda, Swahili, Acholi, English and more, from Baby Class to Senior 6."
  5. CTAs: primary sun pill "Start learning free" → `/register`, with an arrow that nudges on hover. Secondary outline pill "I have an account" → `#signin`.
  6. Stats row: **38** courses, **47** languages, **17** voices. These are the real counts from `courses.ts` and `sunbird-languages.ts`; compute them if you prefer.
- Pass every visible string through `useUITranslation`'s `t()`.
- **Right column** (square, up to 520px):
  - A dashed circle that rotates slowly (70 s), with 8 language labels (Luganda, Swahili, Acholi, Ateso, Runyankole, Lusoga, Lugbara, Kinyarwanda). Place labels with trigonometry at a 49% radius and counter-rotate them so the text stays upright.
  - Three sound rings rippling outward with staggered delays.
  - A circular portrait of `/images/hero.jpg` (`next/image`, priority).
  - Floating cards bobbing out of sync:
    - a "Listening" card with a mic icon (its own ripple) and a 14-bar equaliser;
    - a "Quick quiz" card: "Which part of a plant makes food?" with a green "The leaves ✓";
    - a sun "+10 coins" pill;
    - a "Keeps working on low data" pill.
- A gently moving SVG wave at the bottom leads into the `paper`-coloured next section.

### 6b. Motion CSS (append to `globals.css`)

Use the `hero-` prefix:
- `hero-drift` (glows), `hero-rise` (stagger), `hero-word-in` (slide up from 100% plus un-blur), `hero-draw` (stroke-dashoffset), `hero-spin` (orbit, with labels in reverse), `hero-ripple` (scale 0.92 → 1.28 and fade), `hero-bob` (translateY −12px), `hero-eq` (bar height 25% ↔ 100%), `hero-pop` (menu), `hero-wave`.
- Plus `.reveal` / `.reveal.is-visible` for scroll reveals.
- Under `@media (prefers-reduced-motion: reduce)`, turn off every one of these, show rings at a static 0.35 opacity, and show stagger and reveal content immediately.

### 6c. `Reveal.tsx` and `Features.tsx`

- `Reveal`: a client wrapper (`div | li | section`) that adds `is-visible` the first time an IntersectionObserver sees it (rootMargin `0px 0px -10% 0px`). It takes an optional `delay` (ms) and becomes visible immediately if IntersectionObserver isn't available.
- `Features`:
  - Heading "Built for real classrooms, real lives".
  - A 3-step "how it works" row of navy cards with large faded numbers: **Speak or snap** → **Sautika understands** → **Practise and win**.
  - Six feature cards: Voice-first learning, Your own language, AI tutor on your notes, Dyslexia-friendly, Light on data, Earn and grow.
  - The wording must be honest. For example, say "Pages and lessons you open are saved on your phone", not "works fully offline".
  - Staggered reveals; cards lift on hover.

**Done when** the landing page shows the new hero on desktop and mobile, the language switcher translates the hero, and with reduced motion enabled nothing moves.

---

## Task 7: Real offline support (PWA)

The landing page claims offline access, but there is no service worker.

1. **`public/sw.js`** (version `sautika-v2`):
   - Precache `/offline.html`, `/manifest.webmanifest` and `/icons/icon-192.png`.
   - Page navigations: network first, saving successful responses to a pages cache (keep the newest 40), falling back to the cached copy, then `/offline.html`.
   - `/_next/static/`, `/images/` and font/image extensions: cache first (keep 300).
   - **Never cache `/api/*` or `/sso-callback`.**
   - Delete old-version caches on activate.
   - Clear the pages cache when it receives the message `'sautika:clear-pages'`.
2. **`public/offline.html`**: a self-contained navy page with the icon, "No connection right now", a short explanation, tips, and a "Try again" button.
3. **`src/components/providers/ServiceWorkerRegister.tsx`**: in production only, register `/sw.js` after page load. Use Clerk's `useAuth`: when `isSignedIn` changes from true to false, post `'sautika:clear-pages'` so shared phones don't keep the previous learner's pages. Mount it in `src/app/layout.tsx` inside `ClerkProvider`.
4. **Icons**: `Logo_symbol.png` is 1.2 MB, too heavy for low-data users. Generate `public/icons/icon-192.png`, `icon-512.png` and a `maskable-512.png` (logo at 80% on a `#001731` background) with `sharp`.
5. **`public/manifest.webmanifest`**: `id "/"`, `start_url "/home"`, `scope "/"`, `display "standalone"`, `theme_color` and `background_color` `#001731`, `categories ["education","kids"]`, and the three icons.
6. **Layout metadata**: `applicationName`, `icons`, `openGraph`, `appleWebApp`, and a description mentioning Luganda, Swahili, Acholi and English.

**Done when** the Lighthouse PWA installability check passes, and a previously visited page loads in DevTools offline mode.

---

## Task 8: Course search that understands speech

Search does a whole-phrase substring match, so voice queries like "Science P.4" or "I want to learn about fractions" return nothing.

1. Create **`src/lib/course-search.ts`**, exporting `normaliseQuery`, `scoreCourse` and `searchCourses`.
   - Expand `P.4` / `P4` / `primary four` to `primary 4`, and `S.3` / `S3` / `senior three` to `senior 3`, keeping each as one class token.
   - Drop stopwords: a, the, I, want, learn, course, lesson, about, me, class, and similar.
   - Synonyms are kept as `original|mapped`, and either form may match:
     - maths/mathematics/arithmetic/numbers → math
     - english/swahili/kiswahili/luganda/reading → languages
     - biology/chemistry/physics/health → science
     - ict/computer/coding/internet → digital
     - sst/history/geography/civics → social
   - Scoring per token: title +3, category +2, level +2, lesson titles +1.5, description +1.
   - **A class token is a hard filter**: if the course is not that class, it scores 0.
   - Require at least half the tokens to match, and sort by score.
2. In `src/app/(app)/courses/CoursesExplorer.tsx`, remove the old substring search from the filter and apply `searchCourses(filtered, searchQuery)` after the level and subject filters.

**Done when**, run against `COURSES`: "fractions" returns *Primary 4 Mathematics & Fractions*, "Swahili" returns *Kiswahili Basics* first, and "computers for senior three" returns *Senior 3 ICT & Computer Systems* first.

---

## Task 9: Sautika MCP server v2

Replace `scripts/mcp-ocr-server.mjs`, which has one OCR tool and an old protocol, with a shared core and two transports.

### 9a. `src/mcp/core.ts`: no imports at all

Inject everything through a context object:
```ts
interface McpContext {
  courses; languages; ttsLanguages: ReadonlySet<string>;
  searchCourses(courses, query); env; fetch;
  extraTools?: ExtraTool[]; disabledTools?: string[]; serverVersion?: string;
}
export async function handleMcpMessage(ctx, rawMessage): Promise<JsonRpcResponse | null>
export const SUPPORTED_VERSIONS = ['2026-07-28','2025-11-25','2025-06-18','2025-03-26','2024-11-05']
```
Having no imports lets the same file run inside Next.js and directly in Node 22.18+ with native type stripping. Use no enums, namespaces or parameter properties.

**Protocol**
- `server/discover` (2026-07-28): returns `resultType: 'complete'`, `supportedVersions`, `capabilities`, `serverInfo`, `instructions`, `ttlMs: 300000`, `cacheScope: 'public'`.
- `initialize`: negotiate a version from the list, excluding 2026-07-28 and falling back to 2025-11-25. Return `protocolVersion`, `capabilities`, `serverInfo` and `instructions`.
- If a request carries `_meta["io.modelcontextprotocol/protocolVersion"]` that isn't supported, return error `-32022` with `data.supported`.
- Every result includes `resultType: 'complete'` and `_meta["io.modelcontextprotocol/serverInfo"]`.
- List and read results include `ttlMs` and `cacheScope`.
- Return tools sorted by name.
- Unknown method: `-32601`. Unknown tool or resource: `-32602`.
- Input and service errors come back as **tool results** with `isError: true`, not protocol errors, so the model can self-correct.
- Notifications (`notifications/initialized`, `notifications/cancelled`) return null.
- Support `ping`, `tools/list`, `tools/call`, `resources/list`, `resources/templates/list`, `resources/read`, `prompts/list` and `prompts/get`.

**Tools** (each with `title`, `inputSchema` using `additionalProperties: false`, and `annotations` for readOnlyHint, destructiveHint, idempotentHint and openWorldHint)
1. `search_courses`: `{query?, subject?, level?, limit?}`. Uses `ctx.searchCourses`. Has an `outputSchema` and returns `structuredContent: { total, courses }`.
2. `get_course`: `{course_id}`. Every lesson and question with answers.
3. `get_lesson_quiz`: `{course_id, lesson_index, language?}`. Optionally translated.
4. `list_languages`: all 47 languages with a `voice` flag.
5. `translate_text`: `{text, source_language, target_language, polish_english?}`. Same routing as Task 5, implemented with `ctx.fetch` (Sunbird `/tasks/translate`, Google v2, LLM fallback).
6. `text_to_speech`: `{text (600 max), language}`. Calls Sunbird `/tasks/audio/speech` with `response_mode: 'url'` and returns `audio_url`.
7. `generate_quiz`: `{notes, count?, language?}`. A small LLM helper (Gemini `gemini-3.8-flash` via `GEMINI_MODEL`, then Groq, then OpenRouter) returning `{q, a, d, e}` items.
8. `summarize_notes`: `{notes, style: 'summary'|'study_guide', language?}`.
9. `ocr_extract_text`: `{image (https URL or data URI), language?}` via OCR.Space with `OCREngine: '2'`.
10. `platform_status`: counts plus which services are configured (booleans only, never secrets).

**Resources**: `sautika://curriculum`, `sautika://languages`, `sautika://courses/{course_id}` (also listed as a resource template).

**Prompts**
- `lesson_plan(course_id)`: a 40-minute plan with objectives, warm-up, teaching steps, a group activity with Ugandan examples, and an exit check using the course questions.
- `explain_in_language(topic, language, level?)`.
- `revision_session(course_id)`.

### 9b. `scripts/sautika-mcp-server.mjs` (stdio)

- Load `.env.local`, then `.env`, without overriding variables already set.
- Dynamically import `src/data/courses.ts`, `src/lib/sunbird-languages.ts`, `src/lib/course-search.ts` and `src/mcp/core.ts` by file URL. On failure, print "needs Node.js 22.18 or newer" to stderr and exit 1.
- Add an extra local-only tool, `extract_document_text {path, max_chars?}`, for `.txt/.md/.csv/.json`, `.docx` (mammoth) and `.pdf` (pdf-parse v2 or v1).
- Before calling the core, turn a local image path for `ocr_extract_text` into a data URI.
- Newline-delimited JSON-RPC, with batch support. **Track in-flight requests and wait for them before exiting when stdin closes.** Log only to stderr.

### 9c. `src/app/api/mcp/route.ts` (Streamable HTTP, JSON responses)

- POST accepts a single message or a batch (up to 20).
- If the response list is empty (notifications only), return **202** with no body. Otherwise return JSON with `Cache-Control: no-store`.
- GET and DELETE return 405 with `Allow: POST`.
- Validate `Origin`: if present, it must match the host or appear in `MCP_ALLOWED_ORIGINS`.
- Without a valid `Authorization: Bearer ${MCP_API_TOKEN}`, expose only `search_courses`, `get_course`, `get_lesson_quiz`, `list_languages` and `platform_status`. Disable the rest through `disabledTools`.
- Rate limits: 60/min per IP anonymously, 240/min with the token.

### 9d. Configuration

- Point `.agents/mcp_config.json` and `.agents/plugins/ocr-service/mcp_config.json` at `node --no-warnings ./scripts/sautika-mcp-server.mjs` under the server name `sautika`. Update `plugin.json` with the name `sautika` and a description.
- Create `.mcp.json` (Claude Code project config) with:
  - a `sautika` stdio server;
  - a `sautika-live` HTTP server at `https://sautika.vercel.app/api/mcp` with header `Authorization: Bearer ${SAUTIKA_MCP_TOKEN}`.
- In `package.json`, add the scripts `"mcp": "node --no-warnings scripts/sautika-mcp-server.mjs"` and `"mcp:inspect": "npx @modelcontextprotocol/inspector node --no-warnings scripts/sautika-mcp-server.mjs"`, plus `"engines": { "node": ">=22.18.0" }`.
- Delete `scripts/mcp-ocr-server.mjs`.

**Done when** piping these messages into `npm run mcp` returns a response for every id, and `npm run mcp:inspect` lists 11 tools:
```jsonl
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28"}}}
{"jsonrpc":"2.0","id":3,"method":"tools/list"}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_courses","arguments":{"query":"fractions P.4"}}}
{"jsonrpc":"2.0","id":5,"method":"resources/read","params":{"uri":"sautika://courses/baby-numbers"}}
{"jsonrpc":"2.0","id":6,"method":"tools/list","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"1999-01-01"}}}
{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"extract_document_text","arguments":{"path":"README.md","max_chars":120}}}
```
Expected:
- id 1: `protocolVersion` "2025-11-25"
- id 2: `supportedVersions` including "2026-07-28"
- id 4: `p4-math`
- id 6: error `-32022`
- id 7: the README text.

---

## Task 10: Environment and documentation

1. **`.env.example`**: add `GEMINI_MODEL` and `GROQ_MODEL` (blank), then these new sections:
   - **Translation quality**: `GOOGLE_TRANSLATE_API_KEY` (with a note to enable the Cloud Translation API and restrict the key to it), `TRANSLATION_ENGLISH_POLISH=false`, `TRANSLATION_PROVIDER_ORDER=`.
   - **Operations and security**: `SYNC_SECRET=`, `CRON_SECRET=`.
   - **Remote MCP endpoint**: `MCP_API_TOKEN=` (with a one-line Node command to generate one), `MCP_ALLOWED_ORIGINS=`.
2. **`README.md`**: make it match the code.
   - Subjects are Science, Math, Languages, Social Studies and Digital Literacy across 38 courses. It currently says Agriculture, Life Skills and English.
   - Gemini model is `gemini-3.8-flash`, configurable.
   - Describe the offline service worker and the translation router.
   - Replace the MCP sections with: the shared core and two transports, supported protocol versions, `.mcp.json` setup, a tools table (stdio / HTTP public / HTTP token), resources and prompts.
   - Add the new environment variables to the table.
   - Node prerequisite: 22.18+ (the app runs on 20.9+; the MCP server needs 22.18+).
   - Add a **Security** section: auth and rate limits, the anonymous translate allowance, the sync secret, keeping `mongodb-sync/` private in R2, the 10 MB upload cap with per-user prefix, the note coin cap, and the service worker never caching `/api/*`.
   - Usage: the AI Study Tutor panel and review-before-save uploads.
   - Roadmap: tick PWA, and add "Offline lesson packs".

---

## Task 11: Verification (do all of this before reporting back)

1. `npm run typecheck`, `npm run lint` and `npm run build` all pass with no errors.
2. `npm run dev`, then check every route signed out and signed in:
   - `/`, `/register`, `/sign-in`, `/home`, `/courses`, `/learning`, `/notebook`, `/progress`, `/rewards`, `/settings`, `/privacy-policy`, `/terms-and-conditions`, `/cookie-policy`.
   - No console errors. App pages redirect to sign-in when signed out.
3. **Landing**:
   - The hero animates, the greeting rotates, and the orbit spins.
   - The language switcher changes the hero text, using about one translate request.
   - With DevTools "Emulate prefers-reduced-motion: reduce" on, nothing moves.
   - Mobile widths 360px and 768px have no horizontal scroll.
4. **Notebook**: the tutor works in all four modes in English and Luganda (with keys set). Without any LLM key, Summarise returns the notes-based fallback, not the instruction text. Uploading a photo opens the review modal.
5. **Security**: the 401, 429 and sync-secret checks from Task 2 pass.
6. **MCP**: the stdio test from Task 9 passes. `curl -X POST localhost:3000/api/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` lists only the 5 public tools without a token.
7. **Offline**: after a production build (`npm run build && npm start`), visit `/courses`, switch DevTools to Offline, and reload. The page still loads, and an unvisited page shows `offline.html`.

Then report:
- what you changed, file by file, in a short table;
- anything you could not finish and why;
- the environment variables I must add in Vercel: `GOOGLE_TRANSLATE_API_KEY`, `CRON_SECRET`, optionally `MCP_API_TOKEN`, plus the existing keys.

Wait for my go-ahead before pushing `feature/platform-upgrade` or opening a pull request.

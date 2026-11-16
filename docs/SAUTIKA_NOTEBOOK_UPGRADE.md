# Sautika Notebook Upgrade: Build Brief for Claude Code

You are working on **Sautika** (`github.com/marthanp/sautika`, live at `sautika.vercel.app`), a voice-first AI study companion for East African learners from Baby Class to Senior 6. Stack today: Next.js 16 (App Router, `--webpack`), React 18, TypeScript, Tailwind CSS 4, Zustand, Clerk, MongoDB Atlas, Cloudflare R2, Sunbird AI, OCR.Space/Tesseract, and a multi-provider LLM failover engine (`src/lib/llm-providers.ts`).

The goal of this brief is to turn Sautika's "Notebook" into a **source-grounded study workspace that works and feels like Google NotebookLM**, adapted to Sautika's brand, languages and learners. It also adds Anthropic Claude to the LLM engine, AssemblyAI to the speech pipeline, Inngest for background work, a first-run tutorial in the learner's language, and a proper dyslexia mode.

Read the whole brief before you start. Work phase by phase. Commit after each task.

---

## 0. Skills to use

Load these skills before any UI work and follow them for every screen you build or restyle:

1. **ui-ux-pro-max**: layout, information architecture, interaction states, responsive behaviour.
2. **impeccable**: polish pass on every component (spacing rhythm, typography, empty/loading/error states, focus states, micro-interactions).
3. **Claude design skill** (`frontend-design`): visual direction, so the result reads as intentional and not templated.

If a skill name differs on this machine, run `/skills` and pick the matching one. Use them in this order per screen: ui-ux-pro-max to plan, frontend-design to style, impeccable to finish.

---

## 1. Ground rules

- Branch first: `git checkout -b feature/notebook-lm`. Do not push or open a PR until I say so.
- After every task: `npm run typecheck` and `npm run lint`. Run `npm run build` at the end of every phase. Fix what you broke before moving on.
- Keep the brand: tokens in `src/app/globals.css` (`navy #001731`, `navy-2 #0a2547`, `sun #ffc400`, `sun-dark`, `ink`, `mist`, `paper`, `line`) and fonts (Inter, Poppins). Replace stray hex values such as `#2F6BFF`, `#E8F0FE`, `#FEF6DC` in `notebook/page.tsx` with tokens. Do **not** copy Google's logo, name, colours or wordmark. Copy the layout and behaviour, not the brand.
- Never put API keys in client code, logs, responses or this repo. Read them from `process.env` on the server only. Stop returning messages like `SUNBIRD_API_KEY is not set` to the browser; log that server-side and return a generic message.
- Never claim a feature works unless it does end to end.
- Animations use only `transform`/`opacity` and switch off under `prefers-reduced-motion: reduce`.
- Touch targets at least 44px, visible focus rings, real `aria-*` attributes, full keyboard support.
- Every user-facing string goes through `useUITranslation` so it follows the learner's language.
- Mobile first. Most learners are on entry-level Android phones on slow data.

### New environment variables (add to `.env.example` with empty values and comments)

```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL_FAST=claude-haiku-5-5
ANTHROPIC_MODEL_DEEP=claude-sonnet-5-5
ASSEMBLYAI_API_KEY=
ASSEMBLYAI_EN_CONFIDENCE=0.80
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
EMBEDDING_PROVIDER=gemini
LLM_HEDGE_MS=2500
LLM_TOTAL_BUDGET_MS=50000
```

Check current model IDs and request shapes against the official docs before coding (`https://docs.claude.com/en/api/overview`, `https://www.assemblyai.com/docs/llms.txt`, `https://www.inngest.com/docs`). If a default above is out of date, use the current one and note it in the commit.

---

## 2. Audit: what is weak today

This is what the analysis of the repo (commit `2887f11`) and the live site found. Each item maps to a task below.

### Product gaps versus NotebookLM

| NotebookLM has | Sautika today | Fixed in |
| --- | --- | --- |
| Notebooks that each hold their own sources, chat and outputs | No notebook entity. One flat list of notes filtered by subject (`NotebookBoard.tsx`). Notes and sources are the same thing. | Phase 2 |
| Three panes: Sources, Chat, Studio | One note board, a tutor card and a sidebar of "Quick Actions" | Phase 3 |
| Source guide (auto summary and key topics per source) | None | Phase 2 |
| Chat with history and follow-ups | One-shot request per button press, no history | Phase 3 |
| Clickable citations that open the exact passage | `[1]` rendered as a superscript with a tooltip, no link to the passage | Phase 3 |
| Studio: Audio Overview, Video Overview, Mind Map, Reports, Flashcards, Quiz, Infographic, Data table, Slide deck | Summary, study guide, 5-question quiz only | Phase 5 |
| Add sources from web search | None | Phase 5 |
| Notes saved from chat responses | Partly (`onSaveAsNote`) | Phase 3 |
| Featured notebooks | 38 curriculum courses exist but live in a separate Courses area | Phase 3 |

### Engineering weaknesses

1. **No retrieval.** `StudyTutor` sends the full text of up to 8 notes from the browser on every request, and `/api/notebook` pastes up to 25,000 characters per source into the prompt. Anything after 25,000 characters is silently dropped, every call re-sends up to 200,000 characters, and answers get slower and more expensive as notes grow.
2. **No streaming.** Learners wait for the whole answer. In `ask` mode with a non-English language there are three serial calls (translate in, generate, translate out) before anything shows.
3. **Failover can blow the time limit.** `generateAIResponse` tries providers one after another with a 25 s timeout each, but the route has `maxDuration = 60`. Two slow providers and the request dies with a 504 before the fallbacks run.
4. **Quiz translation fan-out.** A translated quiz fires 25 translation calls (5 items x 5 fields) in parallel, which hits Sunbird rate limits.
5. **In-memory state on serverless.** The rate limiter in `api-guard.ts` and the translation cache in `translation.ts` live in module memory, so each Vercel instance has its own counters and cache. The limiter is easy to get around and the cache hit rate is low.
6. **Synchronous ingestion.** OCR, PDF parsing and the summary all run inside one request. Large PDFs or photo batches time out.
7. **Data loss bug in notes.** In `NotebookBoard.add()`, when the save to `/api/account` fails, the note is added to React state only and the error is hidden. It looks saved and vanishes on refresh.
8. **Garbage text fallback.** In `handleFileUpload`, when `/api/ocr` fails the code calls `file.text()`, which turns a PDF or image into binary junk that then becomes a "note".
9. **Speech coverage.** STT is Sunbird only. The browser fallback in `useVoice.ts` covers `eng` and `swa` only. English recognition quality for accented speech can be better.
10. **TTS cap.** `/api/tts` cuts text at 600 characters, so long answers are never read in full.
11. **Accessibility is buried.** The dyslexia options (fonts, spacing, line height, tint) are good but hidden in a 1,189-line `SettingsPanel.tsx`. New learners never find them, and there is no reading ruler, focus mode, word-highlighted read-aloud or simpler-text option.
12. **No onboarding.** A first-time learner lands in the app with no guidance.
13. **No tests at all.**
14. **Coupling through window events.** `notebook/page.tsx` talks to `NotebookBoard` with `window.dispatchEvent('open-new-note')`. Replace with props or a store.
15. **Version check.** `package.json` pairs `next@16.4.3` with `react@18.3.1`. Confirm the Next 16 App Router peer range; if it needs React 19, upgrade React and `@types/react` in Phase 1 and fix the fallout.
16. **Landing page issues** (from the live site): the About section is empty, the language selector lists "English" twice, the map URL is printed as raw text, the sign-in form has no "Forgot password" link, stat labels are inconsistent ("courses" lowercase, voices vs languages unclear), offline support is oversold, and citations are promised but not shown. A crawler also saw page metadata rendered as visible text; check this in a real browser and fix it if it is real.

---

## Phase 1: Foundations

### Task 1.1 Fix the note save and upload bugs
- `NotebookBoard.add()`: on failure keep the modal open, show the real error, and offer "Try again". If offline, queue the note in a persisted Zustand slice (`pendingNotes`) and flush it from `LearnerDataSync` when `navigator.onLine` returns. Show a "Waiting to sync" badge on queued notes.
- `handleFileUpload`: only call `file.text()` for `text/*`, `.md`, `.csv`, `.json`. For other types show "We could not read this file. Try a clearer photo or a PDF with selectable text."

### Task 1.2 Persistent rate limiting and cache
- Create `src/lib/rate-limit.ts` backed by a MongoDB collection `rate_limits` with a TTL index on `expiresAt`. Use an atomic `findOneAndUpdate` with `$inc`. Keep the same `guardUser(scope, limit, windowMs)` signature in `api-guard.ts` so routes do not change.
- Create `src/lib/kv-cache.ts` (Mongo collection `kv_cache`, TTL index) and use it as a second level under the in-memory translation cache.

### Task 1.3 Tests
- Add Vitest with `npm run test`. Cover: `parseQuizItems`, the citation parser, the LLM router budget logic (with mocked fetch), the speech router decision table (Task 4.2), chunker (Task 2.3), and the rate limiter.
- Add Playwright with one smoke test: sign-in page renders, landing page has no console errors.

**Done when** the build passes, tests pass, and a failed note save no longer looks like a success.

---

## Phase 2: Data model and ingestion

### Task 2.1 Collections (`src/lib/notebooks/schema.ts`, with TypeScript types in `src/types/notebook.ts`)

```
notebooks       { _id, userId, title, emoji, coverKey?, language, subject?, courseId?, isFeatured, sourceCount, createdAt, updatedAt }
sources         { _id, notebookId, userId, kind: 'pdf'|'docx'|'image'|'text'|'url'|'audio'|'course',
                  title, r2Key?, url?, status: 'queued'|'processing'|'ready'|'failed', error?,
                  language, charCount, guide?: { summary, keyTopics[], suggestedQuestions[] }, createdAt }
source_chunks   { _id, sourceId, notebookId, userId, ord, text, page?, charStart, charEnd, embedding: number[] }
chat_messages   { _id, notebookId, userId, role: 'user'|'assistant', content, language,
                  citations?: [{ n, sourceId, chunkId, quote }], provider?, createdAt }
notebook_notes  { _id, notebookId, userId, title, body, origin: 'manual'|'saved_reply'|'studio', createdAt, updatedAt }
studio_outputs  { _id, notebookId, userId, type, status, language, payload, r2Key?, createdAt }
```

Indexes: `{ userId, updatedAt: -1 }` on notebooks; `{ notebookId, status }` on sources; `{ notebookId, createdAt }` on chat and notes. Create an **Atlas Vector Search** index on `source_chunks.embedding` with filter fields `userId` and `notebookId`. Write the index definition to `database/vector-index.json` and document the one-time setup in the README.

Every query filters by `userId` from Clerk. Never trust a `notebookId` from the client without checking ownership.

### Task 2.2 Migration
`scripts/migrate-notes-to-notebooks.mjs`: for each user, create one notebook per subject that has notes ("Mathematics notes", etc.) and copy each old note in as a `sources` document of kind `text`, then queue it for chunking. Leave the old `notes` collection untouched. Make the script idempotent and support `--dry-run`.

### Task 2.3 Chunking and embeddings
- `src/lib/notebooks/chunk.ts`: split on headings and paragraphs, target about 800 characters with 120 characters overlap, keep `page` numbers from PDFs.
- `src/lib/notebooks/embed.ts`: provider switch on `EMBEDDING_PROVIDER`, default Gemini embeddings using the existing `GEMINI_API_KEY`. Batch requests. Store the vector dimension in one constant that matches the Atlas index.
- `src/lib/notebooks/retrieve.ts`: `retrieve(userId, notebookId, sourceIds, query, k = 8)` using `$vectorSearch`, plus a keyword fallback (`$text` index) when embeddings are not available.

### Task 2.4 Ingestion moves to Inngest (see Phase 6 for setup)
Upload flow becomes: client uploads to R2 via a short-lived presigned URL from `/api/sources/upload-url` → client calls `POST /api/sources` → route inserts the source as `queued` and sends `source/uploaded` → the Inngest function extracts, chunks, embeds and writes the source guide → status becomes `ready`. The UI shows live progress (Phase 6 realtime).

**Done when** a 60-page PDF uploads without a timeout and appears as ready with a source guide.

---

## Phase 3: The NotebookLM-style interface

Use the skills from section 0 for every screen. Reference layout: the two screenshots of Google's notebook home and notebook view. Rebuild them in Sautika's brand.

### Task 3.1 Notebooks home (`/notebook`)
- Top: "Featured notebooks" carousel. Each of the 38 curriculum courses becomes a featured, read-only notebook (`isFeatured: true`, sources of kind `course` built from `src/data/courses.ts`). Learners can "Make a copy" to study with their own notes added.
- Below: "My notebooks" grid with cards (emoji or cover, title, date, source count, kebab menu: rename, delete, share later). Sort menu (recent, title). Primary button "New notebook".
- Search box filters notebooks by title.
- Empty state for new learners points to "Create your first notebook" and "Try a featured notebook".

### Task 3.2 Notebook view (`/notebook/[id]`)
Three panes on desktop (Sources about 25%, Chat about 50%, Studio about 25%), each pane collapsible. On phones: a bottom tab bar with **Sources | Chat | Studio** and Chat as the default tab.

**Sources pane**
- "Add sources" opens a dialog: upload (PDF, DOCX, image, camera capture, audio recording), paste text, add a website link.
- "Search the web for new sources" field with a Fast / Deep toggle (Phase 5).
- List with a checkbox per source and "Select all". Only checked sources are used in chat and Studio. Show status chips (Processing, Ready, Failed + retry).
- Clicking a source opens a reader panel: source guide (summary, key topics as chips, suggested questions) and the full text with the cited passage highlighted and scrolled into view.

**Chat pane**
- Header: notebook title (editable), source count, date.
- When empty: an auto overview of the selected sources plus 3 suggested questions as chips.
- Message list with streaming replies. Citation markers are buttons; clicking one opens the source reader at that chunk. Hover or long-press shows the quoted passage.
- Under each reply: Save to note, Copy, Read aloud, Simpler, Translate, thumbs up/down.
- Composer: text field, mic button (Phase 4 pipeline), "N sources" indicator, send. Enter sends, Shift+Enter adds a line.
- Persist history in `chat_messages`; send the last 8 turns as context.

**Studio pane**
- Grid of tiles: Audio Overview, Video Overview, Mind Map, Reports, Flashcards, Quiz, Infographic, Data table, Slide deck (Phase 5 builds them).
- Below the grid: saved outputs and notes list ("Create note", notes saved from chat).

### Task 3.3 Delete the old pieces
Remove `NotebookBoard.tsx`, `RecentNotes.tsx` and the window-event wiring once the new views cover them. Fold `StudyTutor.tsx` logic into the chat and Studio code.

**Done when** a learner can create a notebook, add three sources, chat with clickable citations, save a reply as a note, and do all of it on a 360px-wide phone.

---

## Phase 4: AI engine, Anthropic and speech

### Task 4.1 Rewrite the LLM router (`src/lib/llm/`)

Split `llm-providers.ts` into `router.ts`, `providers/anthropic.ts`, `providers/gemini.ts`, `providers/openai-compatible.ts`, `providers/cohere.ts`, keeping `generateAIResponse` as a thin wrapper so other callers keep working.

**Add Anthropic** with the official `@anthropic-ai/sdk`:
- Two tiers. `fast` (chat, quick answers, quiz, flashcards, translation polishing) uses `ANTHROPIC_MODEL_FAST`. `deep` (reports, audio and video scripts, mind maps, slide decks over many sources) uses `ANTHROPIC_MODEL_DEEP`.
- Stream with the SDK's message streaming.
- Use prompt caching on the system prompt and the retrieved-sources block so follow-up questions in the same notebook are faster and cheaper.
- Evaluate the Anthropic Citations feature (sources passed as document blocks with citations enabled). If it works with the chunk format, use it for `ask` mode so citation spans come from the API instead of regex parsing. Keep the `[n]` parser for other providers.

**Speed comes from routing, not just from adding a key.** Adding a provider to the end of a sequential chain changes nothing. So:
- Tier order. `fast`: Anthropic fast → Groq → Gemini → the rest. `deep`: Anthropic deep → Gemini → OpenRouter → the rest. Allow override with `LLM_ORDER_FAST` and `LLM_ORDER_DEEP`.
- **Hedged requests:** start the first provider; if no first token arrives within `LLM_HEDGE_MS`, start the second in parallel; stream whichever produces tokens first and abort the other with `AbortController`.
- **Global budget:** track elapsed time against `LLM_TOTAL_BUDGET_MS` and give each attempt `min(perProviderTimeout, remainingBudget)`, so the route never passes `maxDuration`.
- Skip a provider for 60 s after a 429 or 5xx (simple circuit breaker in `kv-cache`).
- Return `provider` and `latencyMs`, and log them server-side so we can see which provider is fastest from Kampala.
- Keep the extractive fallback for `ask` and `summary` only.

### Task 4.2 Speech pipeline: AssemblyAI first, then Sunbird

Intended flow: **AssemblyAI is the ears for English; Sunbird handles native languages and is the translation and voice layer for every language, English included.**

Create `src/lib/speech/router.ts` and rewrite `/api/stt` to use it:

1. The client records and sends the audio plus the learner's chosen language (`dialect` from the store, or `auto`).
2. **If the chosen language is English or `auto`:** send the audio to AssemblyAI (server-side, raw key in the `authorization` header, no `Bearer`). Use `speech_models` with the current best model and `universal-2` as fallback, and `language_detection: true` with expected languages `en` and `sw`. Pass key terms from the notebook's source guide topics as the prompt or keyterms so subject vocabulary is recognised. For clips under about 60 s, poll until done; longer recordings go to Inngest (Task 6.2).
3. If AssemblyAI returns `language_code` English with `language_confidence >= ASSEMBLYAI_EN_CONFIDENCE`, use that transcript.
4. **Otherwise, or if the chosen language is a Sunbird language** (Luganda, Acholi, Ateso, Runyankole, Lusoga, Rutooro and the rest in `sunbird-languages.ts`), send the same audio to Sunbird STT with that language. If AssemblyAI is down or not configured, go straight to Sunbird.
5. Return `{ text, language, provider, confidence }`.

Text flow after transcription:
- The question is pivoted to English for the LLM (current behaviour), using Sunbird first for Sunbird languages.
- The answer goes back through `translateText` with Sunbird first for the learner's language (Sunbird → Google → LLM, as now). English answers can still pass through the English polish step.
- Read-aloud uses Sunbird TTS for every language it voices, English included, with browser speech synthesis as the last fallback.

Remove the 600-character TTS limit by splitting text into sentence-sized pieces on the server and returning an ordered list of audio URLs; the client plays them in sequence with word or sentence highlighting (also used by dyslexia mode).

Batch quiz and flashcard translation: join all strings with numbered markers into one or two requests, split them back, and fall back to per-item calls only if the split count does not match.

Add the decision table for steps 2 to 4 as unit tests.

### Task 4.3 Grounded chat route
`POST /api/notebooks/[id]/chat`: check ownership → retrieve top chunks from the selected sources → build the prompt (Sautika tutor rules from the current `RULES`, numbered chunks) → stream Server-Sent Events: `token`, `citation`, `done`, `error` → save both messages. The client uses `fetch` with a stream reader, not a library.

**Done when** a typed English question shows its first words in under about 2 s on a warm notebook, a spoken Luganda question transcribes through Sunbird, a spoken English question transcribes through AssemblyAI, and the logs show which provider served each step.

---

## Phase 5: Studio outputs

Every Studio output runs as an Inngest job, writes to `studio_outputs`, shows live progress, is generated in English, then translated into the learner's language, and can be read aloud.

| Tile | What to build |
| --- | --- |
| **Audio Overview** | Deep tier writes a two-voice dialogue script (teacher and student) from the selected sources, about 5 minutes, with citations kept in the transcript. Translate line by line if needed, synthesise each line with Sunbird TTS (two voices where the language has them), store segments in R2, and play them as a playlist with a synced transcript. Options: length (short, standard), focus topic, language. |
| **Video Overview** | Narrated slides: reuse the Slide deck output plus Audio Overview segments, played in the browser as a slideshow synced to audio. No server video rendering. |
| **Mind Map** | JSON tree (`{ label, children, sourceRefs }`), rendered as a pannable, collapsible SVG tree. Clicking a node asks the chat about it. |
| **Reports** | Templates: Study guide, Briefing, Revision sheet, "Explain like I'm in P.5". Markdown output with citations. Export to PDF. |
| **Flashcards** | 10 to 20 cards, flip animation (respect reduced motion), "I knew it / Again" spaced repetition stored per user, coins on completion via the existing coin logic. |
| **Quiz** | Reuse and extend the current quiz player: difficulty, number of questions, explanations with clickable citations. |
| **Infographic** | Structured JSON (title, 3 to 6 key stats or facts, a simple process or comparison) rendered as a branded, printable HTML card. |
| **Data table** | Extract entities, dates or facts into a sortable table; export CSV. |
| **Slide deck** | 6 to 10 slides JSON (title, bullets, speaker notes) rendered in a simple presenter view; export PDF. |

Web sources ("Search the web for new sources"): Fast mode does one search and suggests up to 5 links to add; Deep mode runs as an Inngest job that searches, reads pages and proposes a ranked list. Use a search provider through an env-configured key; if none is set, hide the feature. The learner always confirms before a link becomes a source.

**Done when** each tile produces a result from a real notebook, shows progress while it runs, and handles failure with a clear retry.

---

## Phase 6: Inngest

### Task 6.1 Setup
- `npm install inngest` (SDK v4). Client in `src/inngest/client.ts` with id `sautika`. Serve route `src/app/api/inngest/route.ts` exporting `GET`, `POST`, `PUT` from `serve()`.
- Local dev: `npx inngest-cli@latest dev` alongside `npm run dev` (v4 needs `INNGEST_DEV=1` locally). Document both in the README.
- Put every side effect (DB writes, API calls) inside `step.run()` so retries never double-write.
- Use per-user concurrency keys (`event.data.userId`) so one learner cannot flood the queues, and global throttles that match Sunbird, AssemblyAI and LLM rate limits.

### Task 6.2 Functions (`src/inngest/functions/`)
- `source-ingest`: `source/uploaded` → extract (pdf-parse, mammoth, OCR) → chunk → embed → source guide → mark ready.
- `source-url-ingest`: `source/url.added` → fetch, strip to readable text → same as above.
- `audio-source-transcribe`: `source/audio.uploaded` → submit to AssemblyAI with a webhook URL (`/api/webhooks/assemblyai`, verify a shared secret) → `step.waitForEvent('assemblyai/transcript.completed')` → if low English confidence, fall back to Sunbird → chunk → embed.
- `studio-generate`: `studio/generate.requested` with `type` → the matching generator.
- `translate-batch`: large translation jobs for Studio outputs.
- `nightly-backup`: move the current Vercel cron backup here as a scheduled function, then remove the cron from `vercel.json`.

### Task 6.3 Live progress
Use Inngest realtime: publish `{ stage, percent, message }` from each step, mint a subscription token in a server action scoped to the user, and show progress on source chips and Studio tiles. If realtime is not available on the plan, fall back to polling `GET /api/jobs/[id]` every 2 s.

---

## Phase 7: First-run tutorial in the learner's language

### Task 7.1 Flow
Show on first sign-in (no `onboardingCompletedAt` in `user_settings`), and replayable from Help and Settings.

1. **Pick your language.** Big tappable chips for the languages Sautika supports, pre-selected from the stored `dialect` or the browser language. Each chip shows the language name in that language. Choosing one sets `dialect` and immediately re-renders the tutorial in it.
2. **Make reading comfortable.** A live preview paragraph with toggles for dyslexia mode, font, text size, spacing and tint (Phase 8). Changes apply instantly.
3. **Coach marks** that spotlight the real UI, one at a time: Add sources → Select sources → Ask by typing or voice → Tap a citation → Studio → Your notes. On phones, the coach marks move across the bottom tabs.
4. **Try it.** Offer a sample featured notebook and a suggested question so the learner gets a real answer within the tutorial.

### Task 7.2 Behaviour
- Each step has a "Listen" button that reads it aloud with Sunbird TTS in the chosen language.
- Text is short: one idea per step, at most two sentences, with an icon.
- Controls: Next, Back, Skip, and a step counter. Esc skips. Focus is trapped in the dialog and returns to the trigger after.
- Build it in-house (`src/components/onboarding/`), no tour library, so it respects our tokens, translations and reduced motion.
- Store progress in `user_settings` (`onboardingStep`, `onboardingCompletedAt`) and mirror it in Zustand so it works offline.
- Pre-translate the tutorial strings for the voiced languages and cache them, so the tutorial does not wait on the network.

---

## Phase 8: Dyslexia-friendly mode

Keep everything that exists (OpenDyslexic, Lexend, Atkinson Hyperlegible, Comic Neue, spacing, line height, tints, high contrast) and make it findable and complete.

### Task 8.1 One switch, many settings
Add a **Dyslexia mode** toggle in the top bar (an "Aa" button) and in onboarding. Turning it on applies a sensible preset in one tap: Lexend or OpenDyslexic (learner's choice), 18px base size, relaxed letter and word spacing, line height 1.6 or more, cream tint, left-aligned text. Every value stays adjustable on its own in a "Reading comfort" panel (split this out of `SettingsPanel.tsx` into its own component).

### Task 8.2 New reading aids
- **Read aloud with highlighting:** every reply, source reader and Studio text can be played, with the current sentence highlighted (word level if the TTS returns timings) and adjustable speed (0.75x to 1.5x).
- **Reading ruler / line focus:** a horizontal band that follows the pointer or keyboard and dims the rest of the text.
- **Focus mode:** hides side panes and shows one reply or source at a time.
- **Simpler text:** a "Simpler" button on replies asks the fast tier to rewrite at a lower reading level, keeping citations.
- **Chunked layout:** max line length about 65 characters, short paragraphs, bullet points for lists, no justified text, no italics or all caps for emphasis (use bold), icons next to key actions.
- **Voice everywhere:** the mic is available in every text field, including search and note editing.
- **Forgiving search:** fuzzy matching for notebook and source search so misspellings still find results.
- **Optional bold word starts:** off by default and labelled as optional, since it helps some readers and not others.

### Task 8.3 Rules for all new UI
Follow the British Dyslexia Association style guide principles: plain sans-serif fonts, generous spacing, off-white backgrounds, good contrast without pure black on pure white, consistent layouts, clear headings. Run an axe check on the home, notebook and settings screens and fix every serious issue.

---

## Phase 9: Landing page fixes

- Fill the About section with real content about the team and mission.
- Remove the duplicate "English" in the language selector.
- Replace the raw map URL text with a labelled embed and a "Get directions" link.
- Add "Forgot password?" to sign-in (Clerk supports password reset).
- Make stat labels consistent and clear ("38 courses", "47 interface languages", "17 spoken languages").
- Reword offline claims to "Pages you have opened keep working offline".
- Show a real citation example in the hero or features section.
- Check in a real browser that no meta tag text is visible; fix the head if it is.
- Add a short "How it works like a notebook" section with a screenshot of the new three-pane view.

---

## Phase 10: Verification (do all of this before reporting back)

1. `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
2. Grep for leaked keys: no `sk-`, `AIza`, or env values in client bundles (`.next/static`).
3. Manual run with the dev server and the Inngest dev server:
   - New account → tutorial in Luganda → dyslexia preset applied → create notebook → upload a PDF, a photo and a pasted note → all three reach Ready with guides.
   - Ask a typed English question, a spoken English question (check AssemblyAI in logs) and a spoken Luganda question (check Sunbird in logs). Citations open the right passage.
   - Generate an Audio Overview, Flashcards, a Mind Map and a Quiz. Each shows progress and finishes.
   - Kill the Anthropic key and confirm the router falls back without the request failing.
4. Phone check at 360px width and with `prefers-reduced-motion` on.
5. Write `docs/notebook-upgrade.md` covering the architecture, env vars, Atlas vector index setup, Inngest setup, and what is not done yet.
6. Report back with: what was built, what was skipped and why, measured first-token latency per provider, and any decisions I need to make.

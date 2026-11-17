# The Notebook upgrade

What was built, how it fits together, what it needs to run, and what is not
done yet. Written for whoever picks this up next, including me in six months.

The brief this implements is [`SAUTIKA_NOTEBOOK_UPGRADE.md`](./SAUTIKA_NOTEBOOK_UPGRADE.md).

---

## What changed, in one paragraph

Sautika's Notebook was a flat list of notes with a tutor panel above it. It is
now a workspace: a **notebook** holds its own **sources**, those sources are
chunked and embedded, and every answer is grounded in the ones the learner
ticked and cites the passage it came from. Around that sit nine **Studio**
generators, background jobs, a streaming LLM router with Anthropic in front, a
speech pipeline that routes English to AssemblyAI and Ugandan languages to
Sunbird, a first-run tutorial in the learner's own language, and reading
comfort controls that are one tap from every screen.

---

## Architecture

### The data model

Six collections, all filtered by `userId` from Clerk on every query. Schema,
validators and indexes live in
[`database/sautika.mongodb.js`](../database/sautika.mongodb.js); the TypeScript
shapes are in [`src/types/notebook.ts`](../src/types/notebook.ts).

| Collection | Holds |
| --- | --- |
| `notebooks` | One per subject or topic. `isFeatured` marks the curriculum ones. |
| `notebook_sources` | A PDF, photo, web page, recording, pasted text or course. |
| `source_chunks` | ~800-character spans with their embeddings. |
| `chat_messages` | The conversation, with the citations each reply used. |
| `notebook_notes` | Notes kept from a reply, from Studio, or written by hand. |
| `studio_outputs` | A generated output, its status and its payload. |

**Why `notebook_sources` and not `sources`.** The brief names it `sources`, but
a `sources` collection already existed for the old note board with a strict
validator requiring `name`, `text` and `enabled`. Reusing it would have
rejected either the old documents or the new ones. The old collection is left
alone and the migration reads from it.

**Ownership.** `assertNotebookAccess(userId, notebookId, { write })` is the one
gate. A featured notebook is readable by anyone and writable by nobody. No
route trusts a `notebookId` from the client without it, and an upload key is
only trusted when it sits under the learner's own R2 prefix.

### Retrieval

```
source → extract → chunk → embed → source_chunks
question → embed → $vectorSearch (or $text) → numbered passages → model
```

The chunker's invariant is the important part:
`fullText.slice(chunk.charStart, chunk.charEnd) === chunk.text`, always. That is
what lets a citation scroll the reader to the exact passage, and it is covered
by tests. Headings open a chunk with no overlap in front; an over-long
paragraph is cut at a sentence end; a chunk's page number comes from its own
content, not from the overlap repeated in front of it.

`retrieve()` has two live paths. With embeddings and an Atlas Vector Search
index it uses `$vectorSearch`. Without either it falls back to a MongoDB
`$text` keyword search, and finally to the opening chunks of the selected
sources. **The notebook therefore works before anyone touches Atlas**, and
gets better grounded when the index exists.

### The LLM router

`src/lib/llm/` — `router.ts` plus one adapter per provider.

Adding a key to the end of a sequential chain changes nothing, so the speed
comes from four things:

- **Tier order.** `fast` leads with Claude Haiku 5.5, then Groq, then Gemini.
  `deep` leads with Claude Sonnet 5.5, then Gemini, then OpenRouter.
  `LLM_ORDER_FAST` and `LLM_ORDER_DEEP` override both; a provider the list does
  not name still gets a turn after the ones that are named.
- **Hedging.** If the leader has not produced a *token* within `LLM_HEDGE_MS`,
  the next provider starts alongside it and the first to speak wins; the loser
  is aborted. "It answered" means a token arrived, not that a socket opened.
- **A global budget.** Each attempt gets `min(25s, budget remaining)` from
  `LLM_TOTAL_BUDGET_MS`, so a route cannot overrun its `maxDuration`. This
  fixed a real bug: two providers at 25s each against a 60s route died before
  the fallbacks ran.
- **A circuit breaker.** A 429 or 5xx parks a provider for 60 seconds in the
  shared `kv_cache`, so every serverless instance agrees.

Anthropic brings two things the others cannot: **prompt caching** (the system
prompt and the sources block are marked `ephemeral`, with the learner's
question after the last breakpoint, so a follow-up in the same notebook
re-reads the sources from cache) and **native citations** (passages go as
`document` blocks with citations enabled, so the quote is the text the model
actually used rather than the start of the chunk). A citation the `[n]` parser
missed but the API reported is still kept.

Two API facts the code depends on, checked against the current docs:
`temperature` is **never** sent to Claude Haiku 5.5 or Sonnet 5.5 because a
non-default value returns a 400, and a safety decline arrives as HTTP 200 with
`stop_reason: 'refusal'`, which is treated as a failed attempt so the router
moves on.

### Speech

`src/lib/speech/router.ts` holds the decision table, as two pure functions so
it is testable without a network call:

| Chosen language | Goes to | If that result is weak |
| --- | --- | --- |
| English or `auto` | AssemblyAI | Sunbird, when it has a key |
| Luganda, Acholi, Ateso, Runyankole, Lusoga, Rutooro, Swahili, … | Sunbird | — |
| English, no AssemblyAI key | Sunbird | — |
| A Sunbird language, no Sunbird key | refused | — |

A Sunbird language with no Sunbird key is **refused rather than guessed at**:
transcribing Luganda with an English model is worse than saying it is
unavailable.

One deliberate deviation from the brief: it asks for AssemblyAI's
`language_confidence_threshold`, but that parameter makes the API *fail* the
request below the threshold, and we want to fall back to Sunbird. So the
threshold is applied here to the returned `language_confidence` and never sent.

Read-aloud no longer stops at 600 characters. `src/lib/speech/tts.ts` splits
text at sentence ends into spans of the original, synthesises a few at a time
to stay inside Sunbird's rate limit, and returns an ordered playlist. The
spans are what the sentence highlighting follows, so the highlight and the
audio cannot drift apart.

### Background jobs

`src/inngest/` — six functions behind `/api/inngest`.

| Function | Trigger | Does |
| --- | --- | --- |
| `source-ingest` | `source/uploaded` | extract → chunk → embed → guide → ready |
| `source-url-ingest` | `source/url.added` | fetch and strip a page, then the same |
| `audio-source-transcribe` | `source/audio.uploaded` | AssemblyAI (webhook) → Sunbird fallback → chunk |
| `studio-generate` | `studio/generate.requested` | generate → translate → voice |
| `translate-batch` | `translate/batch.requested` | re-translate an existing output |
| `nightly-backup` | cron `0 23 * * *` | copy collections to R2 |

Every side effect is inside its own `step.run`, so a retry re-runs only the
step that failed. Concurrency is keyed per learner so one person uploading a
folder cannot starve everybody else, and the throttles match the OCR, Sunbird
and LLM quotas rather than our own appetite.

**`src/lib/notebooks/events.ts` is the seam.** With both Inngest keys present
the work goes to Inngest. Without them the same pipelines run **inline**, so a
bare checkout works — but inline is bounded by the route's `maxDuration`, which
is exactly why a 60-page PDF needs Inngest.

Two things the Inngest v4 API forced, worth knowing before editing:
`createFunction` takes its trigger **inside** the options object, not as a
third argument, and `step.run` serialises whatever it returns, so a step hands
back plain fields rather than a document whose `Date`s would arrive as strings.

**Progress** uses polling, not realtime: `publish` is not on the v4 function
context and Inngest realtime is not on every plan. Each job writes
`{ stage, percent, message }` onto the row it is building, and
`GET /api/jobs/[id]` reads it back. The panes poll only while something is
unfinished.

### Studio

`src/lib/studio/generate.ts` has all nine generators. Each one retrieves from
the ticked sources, asks in **English** with the passages numbered, and parses
the reply into a typed payload. `finish.ts` then translates and voices it.

English first is deliberate: grounding and citation behaviour are most
reliable there, and a translated output is only as good as the English it came
from. Generation, translation and voicing are separate steps so a failed
translation does not discard the generation, and a failed voice does not
discard the text.

---

## Environment variables

Everything new is in [`.env.example`](../.env.example) with a comment. The
short version:

| Variable | Without it |
| --- | --- |
| `ANTHROPIC_API_KEY` | Router falls back to Gemini/Groq; no prompt caching, no native citations |
| `ANTHROPIC_MODEL_FAST` / `_DEEP` | Defaults to `claude-haiku-5-5` / `claude-sonnet-5-5` |
| `LLM_HEDGE_MS`, `LLM_TOTAL_BUDGET_MS` | Defaults 2500 / 50000 |
| `LLM_ORDER_FAST`, `LLM_ORDER_DEEP` | The built-in tier order |
| `ASSEMBLYAI_API_KEY` | All speech goes to Sunbird |
| `ASSEMBLYAI_EN_CONFIDENCE` | Defaults to 0.80 |
| `ASSEMBLYAI_WEBHOOK_SECRET` + `NEXT_PUBLIC_APP_URL` | Long recordings poll instead of using a webhook |
| `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` | Jobs run inline, bounded by `maxDuration` |
| `EMBEDDING_PROVIDER` | Defaults to `gemini`; `none` disables vectors |
| `BRAVE_SEARCH_API_KEY` or `TAVILY_API_KEY` | "Search the web for new sources" is hidden |

---

## One-time setup

### 1. Collections and indexes

```bash
mongosh "$MONGODB_URI" --file database/sautika.mongodb.js
```

Safe to re-run: it updates validators and recreates indexes.

### 2. Atlas Vector Search index

This is an Atlas-level resource, so neither the script nor the app can create
it. The definition and the steps are in
[`database/vector-index.json`](../database/vector-index.json).

**Atlas UI:** Database → Browse Collections → `sautika.source_chunks` → Search
Indexes → Create Search Index → JSON Editor → Atlas Vector Search, paste the
object (everything except `_comment`), name it `source_chunks_vector`.

**Atlas CLI:**

```bash
atlas clusters search indexes create --file database/vector-index.json
```

`numDimensions` must stay equal to `EMBEDDING_DIMENSIONS` in
`src/lib/notebooks/embed.ts` (768). Change one and you must change the other,
then re-embed every chunk.

Until the index exists, retrieval uses the keyword path and the notebook still
works.

### 3. Featured notebooks

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     http://localhost:3000/api/notebooks/seed-featured

# Then chunk and embed what that queued; repeat until it reports 0 processed.
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     "http://localhost:3000/api/sources/process?limit=5"
```

### 4. Inngest, locally

```bash
npx inngest-cli@latest dev        # in one terminal
INNGEST_DEV=1 npm run dev          # in another
```

The dev server discovers `/api/inngest` on its own.

### 5. Migrating existing learners

```bash
node scripts/migrate-notes-to-notebooks.mjs --dry-run
node scripts/migrate-notes-to-notebooks.mjs
```

One notebook per subject that has notes, each old note as a text source.
Idempotent via derived ids, so re-running after more notes arrive is safe.
`--user <id>` limits it to one learner. **Nothing is deleted** and the old
`notes` and `sources` collections are untouched. The old `sources` documents
are migrated too, into an "Imported sources" notebook, because Phase 3 removed
the UI that used to read them.

---

## Testing

```bash
npm run test       # Vitest, 115 tests
npm run test:e2e   # Playwright smoke tests
```

Unit tests need nothing running; MongoDB is mocked where a module touches it.
The Playwright suite starts its own dev server on port 3100, and needs a
browser binary once (`npx playwright install chromium`; on a machine short of
space on the system drive, set `PLAYWRIGHT_BROWSERS_PATH` first).

What the tests cover, and why those things:

- **The chunker's exact-slice invariant** — the whole citation feature rests on
  it. Writing these found four real bugs in the first implementation.
- **The SSE parser**, including an event split across two network chunks and a
  stream that ends without `done` (which used to leave a spinner forever).
- **The LLM budget arithmetic**, including the two-slow-providers case the
  budget exists to prevent.
- **The speech decision table**, every row of it.
- **The TTS splitter**, including that a long answer is read in full.
- **The rate limiter** against a fake collection, including fail-open.
- **The quiz and citation parsers**, and the forgiving notebook search.

---

## Not done, and why

- **End-to-end verification with real providers.** No `ANTHROPIC_API_KEY`,
  `ASSEMBLYAI_API_KEY` or Inngest keys were available while this was written,
  so those paths are built and unit-tested with mocked transport but have not
  answered a real request. The brief's "never claim a feature works unless it
  does end to end" applies: treat them as unverified until you have run them.
- **Phase 2's acceptance test** ("a 60-page PDF uploads without a timeout")
  cannot be met without Inngest keys, because the inline fallback is bounded by
  the route's 60-second limit. The code path is written and waiting.
- **The three-pane UI has not been exercised with real data.** It sits behind
  Clerk and no test account was available. The API boundary is verified
  (signed-out callers get 401 and are redirected away from `/notebook`), and
  the build, types and lint are clean, but nobody has yet watched a citation
  open a passage in a browser.
- **Component tests.** An attempt to mount the workspace in jsdom with a
  mocked API deadlocked during module collection; jsdom, RTL and the component
  tree each import fine alone. Rather than leave a dead test and four unused
  dev dependencies, both were removed. Worth another look with a test account,
  where Playwright would prove more anyway.
- **An axe accessibility sweep** (Phase 8.3). The BDA principles are
  implemented and the markup uses real roles, labels and 44px targets, but no
  automated audit has been run against the three screens.
- **React 19.** Next 16.4.3 accepts React 18.3.1, so no upgrade was forced,
  but the dev server warns that React 18 support is removed in Next 17.

---

## Where things live

```
src/
├── inngest/
│   ├── client.ts              # typed events (v4 eventType/staticSchema)
│   └── functions/             # the six background functions
├── lib/
│   ├── llm/
│   │   ├── router.ts          # tiers, hedging, budget, breaker
│   │   └── providers/         # anthropic, gemini, openai-compatible
│   ├── notebooks/
│   │   ├── schema.ts          # collections, indexes, the ownership gate
│   │   ├── chunk.ts           # the exact-slice chunker
│   │   ├── embed.ts           # Gemini embeddings, 768 dims
│   │   ├── retrieve.ts        # $vectorSearch with a keyword fallback
│   │   ├── extract.ts         # PDF/DOCX/text/OCR, shared with /api/ocr
│   │   ├── ingest.ts          # queued → processing → ready, as steps
│   │   ├── events.ts          # Inngest or inline, one seam
│   │   ├── fetch-url.ts       # web pages, with the private-address guard
│   │   ├── web-search.ts      # Brave or Tavily, hidden without a key
│   │   └── client.ts          # the browser's typed calls, incl. the SSE reader
│   ├── speech/
│   │   ├── router.ts          # the decision table
│   │   └── tts.ts             # sentence splitting and the playlist
│   └── studio/
│       ├── generate.ts        # the nine generators
│       └── finish.ts          # translate, then voice
└── app/
    ├── (app)/notebook/        # the home and the three-pane workspace
    └── api/                   # notebooks, sources, studio, jobs, inngest, webhooks
```

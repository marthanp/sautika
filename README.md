<p align="center">
  <img src="./public/Logo.png" alt="Sautika — Speak, Learn, Grow" width="460">
</p>

<h1 align="center">Sautika</h1>

<p align="center">
  <strong>Speak • Learn • Grow</strong><br>
  A voice-first learning platform designed for learners in East Africa.
</p>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#features">Features</a> ·
  <a href="#technology">Technology</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#maintainers">Maintainers</a>
</p>

---

## Overview

Sautika is an AI-assisted learning experience for primary and secondary school learners. It brings lessons, study tools, and voice interactions together in a responsive web application, with a focus on making learning more accessible in East African languages.

Learners can explore courses, work through interactive lessons, ask questions about their own study materials, and keep track of their learning activity. The interface is designed for phones, tablets, and desktop computers.

## Features

- **Explore and practise:** Browse subject areas and work through interactive multiple-choice and word-building exercises.
- **Learn with voice:** Record spoken questions for transcription and listen to text using connected speech services or supported browser voices.
- **Study with your own materials:** Add or upload text sources to a notebook, then request answers, summaries, study guides, or practice questions based on those sources.
- **Keep learning progress:** Track course activity, experience points, streaks, preferences, and other learner state in the browser.
- **Stay organized:** Notebook sources are stored locally in IndexedDB and remain available on that device between visits.
- **Learn in a responsive interface:** Use the application on mobile, tablet, or desktop screen sizes.

> **Current implementation:** The application includes working UI and core learning interactions, but some dashboard figures and content are sample data. Sign-in is a local demo flow rather than production OAuth. Speech integrations are present, but their request and response fields should be verified against the current Sunbird AI API documentation before production use. Offline notebook storage is available; a complete offline application is still planned.

## Technology

### Used today

| Area | Technology | Role |
| --- | --- | --- |
| Web framework and routing | Next.js 16 App Router | Pages, layouts, static assets, and server API routes |
| UI | React 18 and TypeScript | Reusable components and typed application logic |
| Styling | Tailwind CSS 4 | Responsive layouts and visual styling |
| Icons | Lucide React | Interface iconography |
| Local learner state | Zustand with persistence | Course activity, progress, preferences, and session state in the browser |
| Local notebook storage | Dexie and IndexedDB | Learner-created notebook sources stored on the device |
| Notebook AI | Anthropic SDK / Claude Messages API | Source-grounded answers, summaries, study guides, and generated practice lessons |
| Speech services | Sunbird AI API routes | Speech-to-text and text-to-speech integration |
| Speech fallback | Web Speech API | Browser text-to-speech fallback where a suitable voice is available |

### Planned additions

These are roadmap items, not dependencies or features that are already active in the application:

- **Supabase and PostgreSQL** for accounts and secure cloud synchronization between devices.
- **pgvector-powered curriculum search** for retrieval from approved learning materials.
- **A service worker and full offline PWA support** for installability and broader offline access.
- **An optional local model (such as Ollama)** to explore AI assistance without a network connection.
- **PDF import and text extraction** for adding more types of study material.

## Architecture

The current application uses the browser for its interactive UI and device-local learner data. Requests that require API credentials go through Next.js route handlers, keeping provider keys on the server.

```mermaid
flowchart LR
    Learner[Learner on phone, tablet, or desktop]
    UI[Next.js and React application]
    State[Zustand persisted browser state]
    Notebook[(Dexie and IndexedDB notebook)]
    API[Next.js API routes]
    Claude[Anthropic Claude API]
    Speech[Sunbird AI speech services]
    BrowserVoice[Browser speech synthesis fallback]

    Learner --> UI
    UI <--> State
    UI <--> Notebook
    UI --> API
    API --> Claude
    API --> Speech
    UI -. fallback .-> BrowserVoice

    subgraph Planned[Planned, not connected yet]
        Sync[Supabase cloud sync]
        Search[PostgreSQL and pgvector curriculum search]
        Offline[Service worker and optional local AI]
    end

    UI -. future .-> Sync
    API -. future .-> Search
    UI -. future .-> Offline
```

### Request and data flow

1. The browser renders the learning interface and manages interactive state.
2. Zustand persists learner progress and preferences in browser storage; Dexie stores notebook sources in IndexedDB.
3. For notebook AI tasks, the browser sends the selected sources and task to `/api/notebook`. The server calls Claude using `ANTHROPIC_API_KEY`.
4. Voice requests go through `/api/stt` or `/api/tts`. These server routes use `SUNBIRD_API_KEY`; text-to-speech can fall back to browser speech synthesis where supported.
5. Supabase sync, curriculum retrieval, and a full offline runtime are not connected in the current code.

## Who Sautika is for

- **Learners** who want short, interactive practice and a simple way to review study notes.
- **Learners studying in East African contexts** who benefit from local examples and language-aware learning tools.
- **Teachers and learning-program teams** who want to explore voice-enabled, AI-assisted learning workflows and build on the existing course and notebook foundations.
- **Developers and contributors** interested in accessible education technology, local-language support, and offline-capable web applications.

## Installation

### Requirements

- Node.js **20.9.0 or later**
- npm
- API credentials for the services you intend to use (see [Environment variables](#environment-variables))

### Get started

```bash
git clone <repository-url> sautika-next
cd sautika-next
npm install
```

Create a local environment file from the example:

```bash
# macOS / Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Add the credentials for the integrations you want to run, then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Required for | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Notebook AI | Server-side key used by `/api/notebook`. |
| `ANTHROPIC_MODEL` | Notebook AI | Optional model override; defaults to `claude-sonnet-5-5` in the current route. |
| `SUNBIRD_API_KEY` | Speech-to-text and text-to-speech | Server-side key used by `/api/stt` and `/api/tts`. |
| `SUNBIRD_API_URL` | Sunbird AI | Optional base URL; defaults to `https://api.sunbird.ai`. Verify the route contracts against current provider documentation. |
| `NEXT_PUBLIC_SUPABASE_URL` | Future cloud sync | Reserved; not read by the current application. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Future cloud sync | Reserved; not read by the current application. |
| `SUPABASE_SERVICE_ROLE_KEY` | Future server-side sync | Reserved; not read by the current application. Never expose a service-role key to the browser. |

The Supabase values in `.env.example` are placeholders for planned work; they are not needed to run the current app. Keep real credentials in `.env.local`, which is ignored by Git. Do not add secrets to `NEXT_PUBLIC_*` variables.

### Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run typecheck` | Run the TypeScript compiler without emitting files. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server after building. |

For a production run:

```bash
npm run build
npm run start
```

## Project structure

```text
public/                  Logo, icons, and learning artwork
src/
  app/
    (app)/               Learner dashboard routes: home, courses, learning,
                         notebook, progress, rewards, and settings
    api/
      notebook/          Claude-backed notebook tasks
      stt/                Speech-to-text route
      tts/                Text-to-speech route
    globals.css           Global styles and Tailwind theme
    layout.tsx            Root document layout and metadata
    page.tsx              Public landing page
  components/             Shared UI and learning components
  data/courses.ts         Interactive course and lesson content
  lib/
    auth.ts               Demo sign-in flow
    data.ts               Dashboard display data
    db.ts                 IndexedDB / Dexie database
    useVoice.ts           Browser voice and speech API helpers
  store/useApp.ts         Persisted learner application state
  types/                  Shared TypeScript types
.env.example              Environment variable template
```

## Maintainers

Sautika is made and maintained by:

- **NATOZO PATIENCE MARTHA**
- **EGABO AARON**
- **ONYANGO JOHN STEVEN**

## License

This project is licensed under the [MIT License](./LICENSE).

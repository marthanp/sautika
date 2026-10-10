# Sautika · Speak • Learn • Grow

Voice-first learning app for East Africa. Next.js 14 (App Router), TypeScript, Tailwind CSS, Zustand, Dexie (IndexedDB), Claude, Sunbird AI.

## Run
```bash
npm install
cp .env.example .env.local   # then fill in the keys
npm run dev                  # http://localhost:3000
npm run typecheck
```

## Keys (`.env.local`)
| Variable | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | `/api/notebook` (answers, summaries, study guides, practice lessons) |
| `SUNBIRD_API_KEY`, `SUNBIRD_API_URL` | `/api/stt`, `/api/tts` (verify paths and fields against Sunbird's docs) |
| `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` | Not used yet. Reserved for cloud sync and pgvector search |

Keys stay on the server. The browser only calls `/api/*`.

## Structure
- `src/data/courses.ts`: courses and lessons (add yours here)
- `src/store/useApp.ts`: XP, streak, progress, accessibility (persisted)
- `src/lib/db.ts`: notebook sources in IndexedDB (works offline)
- `src/components/`: Courses, Path, LessonPlayer, Notebook, Settings
- `src/app/api/`: Claude and Sunbird server routes

## Not built yet
Service worker / full offline PWA, Supabase sync, curriculum RAG with pgvector, Ollama offline model, PDF upload.

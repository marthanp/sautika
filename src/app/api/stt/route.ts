import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { assemblyConfigured, sunbirdConfigured, transcribe } from '@/lib/speech/router';
import { assertNotebookAccess, sourcesCollection } from '@/lib/notebooks/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
/** Key terms sent to the recogniser, from the notebook's source guides. */
const MAX_KEYTERMS = 60;

/**
 * Speech to text.
 *
 * AssemblyAI is the ears for English and for `auto`; Sunbird handles the
 * Ugandan and East African languages and is the fallback when AssemblyAI is
 * unsure or unavailable. The routing itself lives in `src/lib/speech/router.ts`.
 *
 * When a notebook is given, its source-guide topics are passed as key terms so
 * subject vocabulary is recognised instead of guessed.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('stt', 20);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  if (!assemblyConfigured() && !sunbirdConfigured()) {
    // The missing variable's name is for the server log, not the browser.
    console.error('Speech to text is unconfigured: set ASSEMBLYAI_API_KEY or SUNBIRD_API_KEY.');
    return Response.json(
      { error: 'Voice input is unavailable right now. Please type your question.' },
      { status: 503 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'A recording is required.' }, { status: 400 });
  }

  const audio = form.get('audio');
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: 'A non-empty audio file is required.' }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return Response.json(
      { error: 'That recording is too long. Keep it under 10 MB.' },
      { status: 413 },
    );
  }

  const requested = form.get('language');
  const language = typeof requested === 'string' && requested.trim() ? requested.trim() : 'auto';

  // Subject vocabulary from the notebook the learner is speaking into.
  let keyterms: string[] = [];
  const notebookId = form.get('notebookId');
  if (typeof notebookId === 'string' && notebookId) {
    try {
      const notebook = await assertNotebookAccess(userId, notebookId);
      if (notebook) {
        const sources = await sourcesCollection();
        const list = await sources
          .find({ notebookId }, { projection: { guide: 1 } })
          .limit(50)
          .toArray();
        keyterms = Array.from(
          new Set(list.flatMap((source) => source.guide?.keyTopics ?? [])),
        ).slice(0, MAX_KEYTERMS);
      }
    } catch (error) {
      // Key terms only improve accuracy; never fail the request over them.
      console.warn('Could not load key terms for transcription:', error);
    }
  }

  try {
    const result = await transcribe({ audio, language, keyterms });
    if (!result.text) {
      return Response.json(
        { error: 'We could not make out that recording. Try again in a quiet place.' },
        { status: 422 },
      );
    }
    return Response.json(result);
  } catch (error) {
    // The provider detail stays server-side.
    console.error('Speech to text failed:', error);
    return Response.json(
      {
        error:
          error instanceof Error && /not available for that language/.test(error.message)
            ? error.message
            : 'Speech transcription is temporarily unavailable.',
      },
      { status: 502 },
    );
  }
}

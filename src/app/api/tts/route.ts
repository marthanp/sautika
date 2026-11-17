import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { speak } from '@/lib/speech/tts';
import { hasSunbirdTts, isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

export const runtime = 'nodejs';
export const maxDuration = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Text to speech.
 *
 * Returns an ordered playlist of segments rather than one clip, so a long
 * answer is read in full: the old route cut the text at 600 characters. Each
 * segment carries the character span it covers, which is what drives sentence
 * highlighting while it plays.
 *
 * `audioUrl` is kept in the response for the first segment so older callers
 * keep working.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('tts', 30);
  if (!guard.ok) return guard.response;

  if (!process.env.SUNBIRD_API_KEY) {
    // The variable name belongs in the log, not in the browser.
    console.error('Text to speech is unconfigured: set SUNBIRD_API_KEY.');
    return Response.json(
      { error: 'Read-aloud is unavailable right now.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.text !== 'string' || !body.text.trim()) {
    return Response.json({ error: 'Text to read aloud is required.' }, { status: 400 });
  }

  const language = typeof body.language === 'string'
    ? normalizeSunbirdLanguage(body.language.trim())
    : '';
  if (!isSunbirdLanguage(language) || !hasSunbirdTts(language)) {
    return Response.json(
      { error: 'Read-aloud is not available in this language yet.' },
      { status: 400 },
    );
  }

  try {
    const segments = await speak(body.text, language);
    const spoken = segments.filter((segment) => segment.audioUrl);

    if (spoken.length === 0) {
      return Response.json(
        { error: 'Read-aloud is temporarily unavailable.' },
        { status: 502 },
      );
    }

    return Response.json({
      segments,
      language,
      // Kept so a caller written against the old single-clip response works.
      audioUrl: spoken[0].audioUrl,
    });
  } catch (error) {
    console.error('Text to speech failed:', error);
    return Response.json(
      { error: 'Read-aloud is temporarily unavailable.' },
      { status: 502 },
    );
  }
}

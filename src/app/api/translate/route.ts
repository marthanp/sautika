import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clientIp, rateLimit } from '@/lib/api-guard';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateText } from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * The landing-page language switcher runs for signed-out visitors, so this route
 * stays open. Anonymous callers get a smaller allowance and a tighter length cap.
 */
const SIGNED_IN_LIMIT = 120;
const ANONYMOUS_LIMIT = 30;
const SIGNED_IN_MAX_CHARS = 5000;
const ANONYMOUS_MAX_CHARS = 600;
const MAX_BATCH = 60;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest): Promise<Response> {
  const { userId } = await auth();

  const limited = userId
    ? rateLimit(`translate:${userId}`, SIGNED_IN_LIMIT, 60_000)
    : rateLimit(`translate-ip:${clientIp(req)}`, ANONYMOUS_LIMIT, 60_000);
  if (limited) return limited;

  const maxChars = userId ? SIGNED_IN_MAX_CHARS : ANONYMOUS_MAX_CHARS;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const sourceLanguage = normalizeSunbirdLanguage(String(body.sourceLanguage ?? ''));
  const targetLanguage = normalizeSunbirdLanguage(String(body.targetLanguage ?? ''));
  if (!isSunbirdLanguage(sourceLanguage) || !isSunbirdLanguage(targetLanguage)) {
    return Response.json(
      { error: 'Supported source and target languages are required.' },
      { status: 400 },
    );
  }

  // Only signed-in learners may spend LLM tokens on the English polish pass.
  const polishEnglish = body.polishEnglish === true && Boolean(userId);

  if (Array.isArray(body.texts)) {
    const texts = body.texts;
    if (texts.length === 0 || texts.length > MAX_BATCH) {
      return Response.json(
        { error: `Send between 1 and ${MAX_BATCH} strings.` },
        { status: 400 },
      );
    }
    if (texts.some((item) => typeof item !== 'string' || item.length > maxChars)) {
      return Response.json(
        { error: `Each string must be text of at most ${maxChars} characters.` },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      (texts as string[]).map(async (text) => {
        if (!text.trim()) return { text, provider: 'none' as const };
        try {
          const result = await translateText(text, sourceLanguage, targetLanguage, {
            polishEnglish,
          });
          return { text: result.text, provider: result.provider };
        } catch {
          // One bad string must not fail the whole screen: keep the original.
          return { text, provider: 'none' as const };
        }
      }),
    );

    return Response.json({
      texts: results.map((result) => result.text),
      providers: results.map((result) => result.provider),
    });
  }

  if (typeof body.text !== 'string' || !body.text.trim()) {
    return Response.json({ error: 'Text to translate is required.' }, { status: 400 });
  }
  if (body.text.length > maxChars) {
    return Response.json(
      { error: `Keep the text under ${maxChars} characters.` },
      { status: 400 },
    );
  }

  try {
    const result = await translateText(body.text, sourceLanguage, targetLanguage, {
      polishEnglish,
    });
    return Response.json({
      text: result.text,
      provider: result.provider,
      polished: result.polished ?? false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Translation failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}

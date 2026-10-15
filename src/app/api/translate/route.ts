import type { NextRequest } from 'next/server';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateWithSunbird } from '@/lib/sunbird-translation';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (
    !isRecord(body) ||
    typeof body.text !== 'string' ||
    !body.text.trim() ||
    body.text.length > 5000 ||
    !isSunbirdLanguage(normalizeSunbirdLanguage(String(body.sourceLanguage ?? ''))) ||
    !isSunbirdLanguage(normalizeSunbirdLanguage(String(body.targetLanguage ?? '')))
  ) {
    return Response.json({ error: 'Text and supported source and target languages are required.' }, { status: 400 });
  }

  try {
    const text = await translateWithSunbird(
      body.text.trim(),
      normalizeSunbirdLanguage(String(body.sourceLanguage)),
      normalizeSunbirdLanguage(String(body.targetLanguage)),
    );
    return Response.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sunbird translation failed.';
    return Response.json({ error: message }, { status: 502 });
  }
}

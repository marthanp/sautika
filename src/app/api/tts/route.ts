import type { NextRequest } from 'next/server';
import { hasSunbirdTts, isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest): Promise<Response> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) return Response.json({ error: 'SUNBIRD_API_KEY is not set' }, { status: 500 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body) || typeof body.text !== 'string' || !body.text.trim()) {
    return Response.json({ error: 'Text to synthesize is required.' }, { status: 400 });
  }
  const language = typeof body.language === 'string' ? normalizeSunbirdLanguage(body.language.trim()) : '';
  if (!isSunbirdLanguage(language) || !hasSunbirdTts(language)) {
    return Response.json({ error: 'Sunbird voice playback is not available for this language.' }, { status: 400 });
  }

  const baseUrl = (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/tasks/audio/speech`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ text: body.text.slice(0, 600), language, response_mode: 'url' }),
  });
  if (!res.ok) {
    console.error('Sunbird text-to-speech request failed:', res.status);
    return Response.json({ error: 'Speech synthesis is temporarily unavailable.' }, { status: 502 });
  }

  const result: unknown = await res.json();
  if (!isRecord(result) || typeof result.audio_url !== 'string') {
    console.error('Sunbird text-to-speech returned an invalid response.');
    return Response.json({ error: 'Speech synthesis returned an invalid response.' }, { status: 502 });
  }

  return Response.json({ audioUrl: result.audio_url });
}

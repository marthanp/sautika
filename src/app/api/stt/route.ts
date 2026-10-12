import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<Response> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) return Response.json({ error: 'SUNBIRD_API_KEY is not set' }, { status: 500 });
  const form = await req.formData();
  const audio = form.get('audio');
  const requestedLanguage = form.get('language');
  const language = typeof requestedLanguage === 'string' ? requestedLanguage.trim() : 'lug';
  if (!(audio instanceof Blob) || audio.size === 0) {
    return Response.json({ error: 'A non-empty audio file is required.' }, { status: 400 });
  }
  if (!language || language.length > 20) {
    return Response.json({ error: 'A valid language code is required.' }, { status: 400 });
  }
  const out = new FormData();
  out.append('audio', audio, audio instanceof File ? audio.name : 'speech.webm');
  out.append('language', language);
  const baseUrl = (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
  const res = await fetch(`${baseUrl}/tasks/audio/transcriptions`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, accept: 'application/json' }, body: out,
  });
  if (!res.ok) {
    console.error('Sunbird speech-to-text request failed:', res.status);
    return Response.json({ error: 'Speech transcription is temporarily unavailable.' }, { status: 502 });
  }

  const result: unknown = await res.json();
  if (
    typeof result !== 'object' ||
    result === null ||
    !('audio_transcription' in result) ||
    typeof result.audio_transcription !== 'string'
  ) {
    console.error('Sunbird speech-to-text returned an invalid response.');
    return Response.json({ error: 'Speech transcription returned an invalid response.' }, { status: 502 });
  }

  return Response.json({ text: result.audio_transcription });
}

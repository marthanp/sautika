import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// TODO: confirm the endpoint path and field names against the current Sunbird AI API docs.
export async function POST(req: NextRequest): Promise<Response> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) return Response.json({ error: 'SUNBIRD_API_KEY is not set' }, { status: 500 });
  const form = await req.formData();
  const audio = form.get('audio');
  const language = String(form.get('language') ?? 'lug');
  if (!(audio instanceof Blob)) return Response.json({ error: 'audio missing' }, { status: 400 });
  const out = new FormData();
  out.append('audio', audio, 'speech.webm');
  out.append('language', language);
  const res = await fetch(`${process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai'}/tasks/stt`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: out,
  });
  if (!res.ok) return Response.json({ error: 'stt failed' }, { status: 502 });
  const j = (await res.json()) as { audio_transcription?: string };
  return Response.json({ text: j.audio_transcription ?? '' });
}

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

// TODO: confirm the endpoint path, speaker ids and response shape against the current Sunbird AI API docs.
export async function POST(req: NextRequest): Promise<Response> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) return Response.json({ error: 'SUNBIRD_API_KEY is not set' }, { status: 500 });
  const { text, language } = (await req.json()) as { text: string; language: string };
  const res = await fetch(`${process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai'}/tasks/modal/tts`, {
    method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 600), language }),
  });
  if (!res.ok) return Response.json({ error: 'tts failed' }, { status: 502 });
  const j = (await res.json()) as { output?: { audio_url?: string }; audio_url?: string };
  return Response.json({ audioUrl: j.output?.audio_url ?? j.audio_url ?? null });
}

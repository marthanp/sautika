import Anthropic from '@anthropic-ai/sdk';
import type { NextRequest } from 'next/server';
import type { Item } from '@/types';

export const runtime = 'nodejs';

interface Body {
  mode: 'ask' | 'summary' | 'guide' | 'lesson';
  question?: string;
  language: string; // "Same as sources" | "English" | "Kiswahili" | "Luganda"
  sources: { name: string; text: string }[];
}

const RULES = 'You are Sautika, a warm tutor for East African students. Use ONLY the sources provided. Cite like [1]. If the answer is not in the sources, say so kindly. Use short sentences and simple words. Under 150 words unless a study guide is requested.';

export async function POST(req: NextRequest): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY is not set' }, { status: 500 });
  const body = (await req.json()) as Body;
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5';
  const lang = body.language === 'Same as sources' ? 'Reply in the language of the sources.' : `Reply in ${body.language}.`;
  const context = body.sources.map((s, i) => `[Source ${i + 1}: ${s.name}]\n${s.text.slice(0, 30000)}`).join('\n\n');
  const system = `${RULES} ${lang}\n\nSOURCES:\n${context}`;

  if (body.mode === 'lesson') {
    const r = await client.messages.create({
      model, max_tokens: 1200, system,
      messages: [{ role: 'user', content: 'Return ONLY a JSON array of 5 objects {"q": question, "a": correct answer (max 6 words), "d": [wrong1, wrong2]} that test the sources.' }],
    });
    const text = r.content.map((c) => (c.type === 'text' ? c.text : '')).join('').replace(/```json|```/g, '').trim();
    try {
      const raw = JSON.parse(text) as { q: string; a: string; d: [string, string] }[];
      const items: Item[] = raw.map((x) => ({ k: 'm', q: x.q, a: x.a, d: x.d }));
      return Response.json({ items });
    } catch { return Response.json({ error: 'Could not build lesson' }, { status: 502 }); }
  }

  const task = body.mode === 'summary' ? 'Summarize the sources in 5 short bullet points, then list 3 key terms with simple meanings.'
    : body.mode === 'guide' ? 'Make a study guide: 4 key ideas, 4 key terms with meanings, and 2 questions to think about. Up to 220 words.'
    : body.question ?? '';
  const stream = client.messages.stream({ model, max_tokens: 900, system, messages: [{ role: 'user', content: task }] });
  const enc = new TextEncoder();
  return new Response(new ReadableStream<Uint8Array>({
    async start(c) {
      stream.on('text', (t) => c.enqueue(enc.encode(t)));
      try { await stream.finalMessage(); } catch { /* client shows fallback if empty */ }
      c.close();
    },
  }), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

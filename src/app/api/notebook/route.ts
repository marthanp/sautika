import type { NextRequest } from 'next/server';
import type { Item } from '@/types';
import { generateAIResponse } from '@/lib/llmProviders';

export const runtime = 'nodejs';

interface Body {
  mode: 'ask' | 'summary' | 'guide' | 'lesson';
  question?: string;
  language: string; // "Same as sources" | "English" | "Kiswahili" | "Luganda"
  sources: { name: string; text: string }[];
}

const RULES =
  'You are Sautika, a warm, encouraging tutor for East African students. Use ONLY the sources provided. Cite like [1]. If the answer is not in the sources, say so kindly. Use short sentences and simple words. Keep it clear, concise, and focused.';

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as Body;
  const lang =
    body.language === 'Same as sources'
      ? 'Reply in the language of the sources.'
      : `Reply in ${body.language}.`;
  const context = body.sources
    .map((s, i) => `[Source ${i + 1}: ${s.name}]\n${s.text.slice(0, 25000)}`)
    .join('\n\n');
  const systemPrompt = `${RULES} ${lang}\n\nSOURCES:\n${context}`;

  if (body.mode === 'lesson') {
    const prompt =
      'Return ONLY a JSON array of 5 objects {"q": question, "a": correct answer (max 6 words), "d": [wrong1, wrong2]} that test the sources.';
    const aiRes = await generateAIResponse({ prompt, systemPrompt, maxTokens: 1200 });
    const text = aiRes.text.replace(/```json|```/g, '').trim();
    try {
      const raw = JSON.parse(text) as { q: string; a: string; d: [string, string] }[];
      const items: Item[] = raw.map((x) => ({ k: 'm', q: x.q, a: x.a, d: x.d }));
      return Response.json({ items, provider: aiRes.provider });
    } catch {
      return Response.json({ error: 'Could not build lesson' }, { status: 502 });
    }
  }

  const prompt =
    body.mode === 'summary'
      ? 'Summarize the sources in 4 to 5 concise, easy-to-understand bullet points for a student, followed by 3 key vocabulary terms with simple definitions.'
      : body.mode === 'guide'
      ? 'Create a study guide: 4 key ideas, 4 core terms with explanations, and 2 test questions to practice. Up to 220 words.'
      : body.question ?? 'Please explain the main idea of these notes.';

  const aiRes = await generateAIResponse({ prompt, systemPrompt, maxTokens: 900 });

  return new Response(aiRes.text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-AI-Provider': aiRes.provider,
    },
  });
}

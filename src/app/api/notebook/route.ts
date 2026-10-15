import type { NextRequest } from 'next/server';
import type { Item } from '@/types';
import { generateAIResponse } from '@/lib/llmProviders';
import { isSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateWithSunbird } from '@/lib/sunbird-translation';

export const runtime = 'nodejs';

interface Body {
  mode: 'ask' | 'summary' | 'guide' | 'lesson';
  question?: string;
  language: string;
  sources: { name: string; text: string }[];
}

const RULES =
  'You are Sautika, a warm, encouraging tutor for East African students. Use ONLY the sources provided. Cite like [1]. If the answer is not in the sources, say so kindly. Use short sentences and simple words. Keep it clear, concise, and focused.';

export async function POST(req: NextRequest): Promise<Response> {
  const body = (await req.json()) as Body;
  if (!isSunbirdLanguage(body.language)) {
    return Response.json({ error: 'Choose a language supported by Sunbird translation.' }, { status: 400 });
  }
  const context = body.sources
    .map((s, i) => `[Source ${i + 1}: ${s.name}]\n${s.text.slice(0, 25000)}`)
    .join('\n\n');
  const systemPrompt = `${RULES} Reply in English; the response will be translated for the learner.\n\nSOURCES:\n${context}`;

  if (body.mode === 'lesson') {
    const prompt =
      'Return ONLY a JSON array of 5 objects {"q": question, "a": correct answer (max 6 words), "d": [wrong1, wrong2]} that test the sources.';
    const aiRes = await generateAIResponse({ prompt, systemPrompt, maxTokens: 1200 });
    const text = aiRes.text.replace(/```json|```/g, '').trim();
    try {
      const raw = JSON.parse(text) as { q: string; a: string; d: [string, string] }[];
      if (!Array.isArray(raw) || raw.some((x) =>
        typeof x?.q !== 'string' ||
        typeof x?.a !== 'string' ||
        !Array.isArray(x?.d) ||
        x.d.length !== 2 ||
        x.d.some((d) => typeof d !== 'string')
      )) {
        return Response.json({ error: 'Could not build lesson' }, { status: 502 });
      }
      let items: Item[] = raw.map((x) => ({ k: 'm', q: x.q, a: x.a, d: x.d }));
      if (body.language !== 'eng') {
        try {
          items = await Promise.all(items.map(async (item): Promise<Item> => {
            if (item.k !== 'm') return item;
            const q = await translateWithSunbird(item.q, 'eng', body.language);
            const a = await translateWithSunbird(item.a, 'eng', body.language);
            const firstDistractor = await translateWithSunbird(item.d[0], 'eng', body.language);
            const secondDistractor = await translateWithSunbird(item.d[1], 'eng', body.language);
            return { k: 'm', q, a, d: [firstDistractor, secondDistractor] };
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sunbird translation failed.';
          return Response.json({ error: message }, { status: 502 });
        }
      }
      return Response.json({ items, provider: aiRes.provider });
    } catch {
      return Response.json({ error: 'Could not build lesson' }, { status: 502 });
    }
  }

  let prompt =
    body.mode === 'summary'
      ? 'Summarize the sources in 4 to 5 concise, easy-to-understand bullet points for a student, followed by 3 key vocabulary terms with simple definitions.'
      : body.mode === 'guide'
      ? 'Create a study guide: 4 key ideas, 4 core terms with explanations, and 2 test questions to practice. Up to 220 words.'
      : body.question ?? 'Please explain the main idea of these notes.';

  if (body.mode === 'ask' && body.language !== 'eng') {
    try {
      prompt = await translateWithSunbird(prompt, body.language, 'eng');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sunbird translation failed.';
      return Response.json({ error: message }, { status: 502 });
    }
  }

  const aiRes = await generateAIResponse({ prompt, systemPrompt, maxTokens: 900 });
  let answer = aiRes.text;
  if (body.language !== 'eng') {
    try {
      answer = await translateWithSunbird(answer, 'eng', body.language);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sunbird translation failed.';
      return Response.json({ error: message }, { status: 502 });
    }
  }

  return new Response(answer, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-AI-Provider': aiRes.provider,
    },
  });
}

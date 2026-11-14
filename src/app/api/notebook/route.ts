import type { NextRequest } from 'next/server';
import type { Item } from '@/types';
import { guardUser } from '@/lib/api-guard';
import { generateAIResponse } from '@/lib/llm-providers';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateText } from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MODES = ['ask', 'summary', 'guide', 'lesson'] as const;
type Mode = (typeof MODES)[number];

const MAX_SOURCES = 8;
const MAX_SOURCE_CHARS = 25_000;
const MAX_QUESTION_CHARS = 1000;
const MIN_QUIZ_ITEMS = 3;

const RULES = [
  'You are Sautika, a warm and encouraging tutor for learners in East Africa.',
  'Use ONLY the sources provided below. Never add facts from outside them.',
  'Cite the source you used like [1] right after the point it supports.',
  'If the notes do not cover something, say so kindly and suggest what to add to the notes.',
  'Write short sentences and simple words. No preamble, no sign-off.',
].join(' ');

interface QuizItem {
  q: string;
  a: string;
  d: [string, string];
  e: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('notebook', 15);
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const mode = body.mode;
  if (typeof mode !== 'string' || !MODES.includes(mode as Mode)) {
    return Response.json(
      { error: `Mode must be one of: ${MODES.join(', ')}.` },
      { status: 400 },
    );
  }

  const language = normalizeSunbirdLanguage(String(body.language ?? ''));
  if (!isSunbirdLanguage(language)) {
    return Response.json(
      { error: 'Choose a language Sautika can translate into.' },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.sources) || body.sources.length === 0 || body.sources.length > MAX_SOURCES) {
    return Response.json(
      { error: `Choose between 1 and ${MAX_SOURCES} notes.` },
      { status: 400 },
    );
  }
  const sources: { name: string; text: string }[] = [];
  for (const source of body.sources) {
    if (!isRecord(source) || typeof source.name !== 'string' || typeof source.text !== 'string') {
      return Response.json({ error: 'Each note needs a name and some text.' }, { status: 400 });
    }
    sources.push({ name: source.name.slice(0, 200), text: source.text });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length > MAX_QUESTION_CHARS) {
    return Response.json(
      { error: `Keep your question under ${MAX_QUESTION_CHARS} characters.` },
      { status: 400 },
    );
  }
  if (mode === 'ask' && !question) {
    return Response.json({ error: 'Type a question to ask the tutor.' }, { status: 400 });
  }

  const sourceText = sources
    .map((source, index) => `[Source ${index + 1}: ${source.name}]\n${source.text.slice(0, MAX_SOURCE_CHARS)}`)
    .join('\n\n');
  const systemPrompt = `${RULES} Reply in English; Sautika translates it for the learner.\n\nSOURCES:\n${sourceText}`;

  if (mode === 'lesson') {
    return buildQuiz(systemPrompt, language);
  }

  let prompt: string;
  if (mode === 'summary') {
    prompt =
      'Summarise the sources in 4 to 5 short bullet points a learner can revise from, each with a citation. ' +
      'Then add a line "Words to know:" followed by 3 key terms from the sources with a one-line definition each.';
  } else if (mode === 'guide') {
    prompt =
      'Write a study guide from the sources, in at most 250 words: the key ideas as bullets with citations, ' +
      'the core terms with short explanations, and 3 practice questions each followed by its answer.';
  } else {
    prompt = question;
    if (language !== 'eng') {
      // Ask the model in English so the citations and reasoning stay reliable.
      try {
        const asked = await translateText(question, language, 'eng', { polishEnglish: true });
        prompt = asked.text;
      } catch (error) {
        console.warn('Could not translate the learner question to English:', error);
      }
    }
  }

  let aiRes;
  try {
    aiRes = await generateAIResponse({
      prompt,
      systemPrompt,
      maxTokens: 900,
      heuristicSource: sourceText,
    });
  } catch (error) {
    console.error('Notebook generation failed:', error);
    return Response.json(
      { error: 'The tutor is busy right now. Please try again in a moment.' },
      { status: 502 },
    );
  }

  let answer = aiRes.text;
  if (language !== 'eng') {
    try {
      const translated = await translateText(answer, 'eng', language);
      answer = translated.text;
    } catch (error) {
      console.warn('Could not translate the tutor answer:', error);
    }
  }

  return Response.json({ answer, provider: aiRes.provider, mode });
}

async function buildQuiz(systemPrompt: string, language: string): Promise<Response> {
  const prompt =
    'Return ONLY a JSON array of 5 objects shaped ' +
    '{"q": question, "a": the correct answer in at most 6 words, "d": [wrong answer, another wrong answer], ' +
    '"e": a one-sentence explanation ending with a citation like [1]}. ' +
    'Test understanding of the sources, not word recall. No text outside the array.';

  let aiRes;
  try {
    aiRes = await generateAIResponse({
      prompt,
      systemPrompt,
      maxTokens: 1400,
      json: true,
      allowHeuristic: false,
    });
  } catch (error) {
    console.error('Quiz generation failed:', error);
    return Response.json(
      { error: 'Quizzes need an AI provider. Ask your administrator to add an API key.' },
      { status: 502 },
    );
  }

  const parsed = parseQuizItems(aiRes.text);
  if (parsed.length < MIN_QUIZ_ITEMS) {
    return Response.json(
      { error: 'The tutor could not build a quiz from these notes. Try adding more detail.' },
      { status: 502 },
    );
  }

  let items: Item[] = parsed.map((item) => ({ k: 'm', q: item.q, a: item.a, d: item.d }));
  let explanations = parsed.map((item) => item.e);

  if (language !== 'eng') {
    try {
      const translated = await Promise.all(
        parsed.map(async (item) => {
          const [q, a, d0, d1, e] = await Promise.all([
            translateText(item.q, 'eng', language),
            translateText(item.a, 'eng', language),
            translateText(item.d[0], 'eng', language),
            translateText(item.d[1], 'eng', language),
            translateText(item.e, 'eng', language),
          ]);
          return {
            item: { k: 'm', q: q.text, a: a.text, d: [d0.text, d1.text] } as Item,
            e: e.text,
          };
        }),
      );
      items = translated.map((entry) => entry.item);
      explanations = translated.map((entry) => entry.e);
    } catch (error) {
      console.warn('Quiz translation failed, serving the English quiz:', error);
    }
  }

  return Response.json({
    items: items.map((item, index) => ({ ...item, e: explanations[index] })),
    provider: aiRes.provider,
  });
}

/** Pulls the array out of whatever wrapping the model added, then keeps valid items only. */
function parseQuizItems(raw: string): QuizItem[] {
  const text = raw.replace(/```json|```/g, '');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: QuizItem[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const { q, a, d, e } = entry;
    if (typeof q !== 'string' || !q.trim()) continue;
    if (typeof a !== 'string' || !a.trim()) continue;
    if (!Array.isArray(d) || d.length < 2) continue;
    const wrong = d.filter((option): option is string => typeof option === 'string' && option.trim().length > 0);
    if (wrong.length < 2) continue;
    items.push({
      q: q.trim(),
      a: a.trim(),
      d: [wrong[0].trim(), wrong[1].trim()],
      e: typeof e === 'string' && e.trim() ? e.trim() : '',
    });
  }
  return items;
}

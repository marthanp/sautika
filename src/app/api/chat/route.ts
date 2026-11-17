import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { openTextStream } from '@/lib/llm/stream';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateText } from '@/lib/translation';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_MESSAGE_CHARS = 1000;

/**
 * System prompt for the general-purpose Sautika AI chatbot.
 * Unlike the notebook chat, this one does NOT ground on uploaded sources.
 * It is a friendly learning assistant for East African students.
 */
const SYSTEM_PROMPT = [
  'You are Sautika, a warm and encouraging AI learning assistant for students in East Africa.',
  'You help learners with their studies across all subjects: Science, Math, Languages, Social Studies, and Digital Literacy.',
  'Write short, clear sentences using simple words appropriate for primary and secondary school students.',
  'When answering questions, give helpful explanations with examples where possible.',
  'Be encouraging and supportive. If you are unsure about something, say so honestly.',
  'Keep your answers concise — no more than 3-4 short paragraphs.',
  'Do not use any preamble or sign-off. Just answer directly.',
].join(' ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * General-purpose AI chat endpoint for the Sautika chatbot widget.
 * Streams responses via SSE. Supports translation to the learner's dialect.
 *
 * POST body: { message: string, language?: string, history?: { role: string, content: string }[] }
 * SSE events: status, token, done, error
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('ai-chat', 30);
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

  const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_CHARS) : '';
  if (!message) {
    return Response.json({ error: 'Please type a message first.' }, { status: 400 });
  }

  const language =
    typeof body.language === 'string' && isSunbirdLanguage(body.language)
      ? normalizeSunbirdLanguage(body.language)
      : 'eng';
  const needsTranslation = language !== 'eng';

  // Optional conversation history (last few turns for context)
  const rawHistory = Array.isArray(body.history) ? body.history : [];
  const history = rawHistory
    .filter(
      (entry): entry is { role: string; content: string } =>
        isRecord(entry) &&
        typeof entry.role === 'string' &&
        typeof entry.content === 'string',
    )
    .slice(-8)
    .map((entry) => `${entry.role === 'user' ? 'Learner' : 'Sautika'}: ${entry.content}`)
    .join('\n');

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      try {
        // Translate the question to English for best LLM performance
        let englishMessage = message;
        if (needsTranslation) {
          try {
            const translated = await translateText(message, language, 'eng');
            englishMessage = translated.text;
          } catch (error) {
            console.warn('Question translation failed, asking as typed:', error);
          }
        }

        const prompt = [
          history ? `Earlier in this conversation:\n${history}\n` : '',
          `Learner's question: ${englishMessage}`,
        ].join('\n');

        send('status', { stage: 'thinking' });

        const textStream = await openTextStream({
          prompt,
          systemPrompt: SYSTEM_PROMPT,
          maxTokens: 1200,
          tier: 'fast',
          temperature: 0.4,
        });

        send('status', { stage: 'answering', provider: textStream.provider });

        let answer = '';
        for await (const token of textStream.tokens) {
          answer += token;
          if (!needsTranslation) send('token', { text: token });
        }

        answer = answer.trim();
        if (!answer) throw new Error('The assistant returned an empty answer.');

        // Translate back into the learner's language
        let finalAnswer = answer;
        let translated = false;
        if (needsTranslation) {
          try {
            const result = await translateText(answer, 'eng', language);
            finalAnswer = result.text;
            translated = true;
          } catch (error) {
            console.warn('Answer translation failed, sending the English answer:', error);
          }
        }

        send('done', {
          answer: finalAnswer,
          provider: textStream.provider,
          translated,
          buffered: textStream.buffered,
        });
      } catch (error) {
        console.error('AI chat failed:', error);
        send('error', { error: 'I could not answer just now. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

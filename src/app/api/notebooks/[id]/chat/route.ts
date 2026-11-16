import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import { citedNumbers } from '@/lib/notebooks/citations';
import { numberSources, retrieve, type RetrievedChunk } from '@/lib/notebooks/retrieve';
import { assertNotebookAccess, chatCollection } from '@/lib/notebooks/schema';
import { openTextStream } from '@/lib/llm/stream';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import { translateText } from '@/lib/translation';
import type { Citation } from '@/types/notebook';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_QUESTION_CHARS = 1000;
const HISTORY_TURNS = 8;
const RETRIEVE_K = 8;
/** The quote kept with a citation, for the hover card. */
const QUOTE_CHARS = 240;

/** The tutor's rules. Grounding is the whole point of a notebook. */
const RULES = [
  'You are Sautika, a warm and encouraging tutor for learners in East Africa.',
  'Use ONLY the sources provided below. Never add facts from outside them.',
  'Cite the source you used like [1] right after the point it supports.',
  'If the sources do not cover something, say so kindly and suggest what to add to the notebook.',
  'Write short sentences and simple words. No preamble, no sign-off.',
].join(' ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Turns the `[n]` markers a reply used into citations the UI can open. */
function buildCitations(answer: string, map: Record<number, RetrievedChunk>): Citation[] {
  return citedNumbers(answer, Object.keys(map).length).map((n) => {
    const chunk = map[n];
    return {
      n,
      sourceId: chunk.sourceId,
      chunkId: chunk.chunkId,
      quote: chunk.text.slice(0, QUOTE_CHARS),
    };
  });
}

/**
 * Grounded chat, streamed.
 *
 * Checks ownership, retrieves the passages that answer the question from the
 * sources the learner has ticked, streams the reply as Server-Sent Events
 * (`token`, `citation`, `done`, `error`) and saves both messages.
 *
 * Non-English notebooks pivot through English: the question is translated in
 * and the answer translated back, which is where the existing Sunbird-first
 * router earns its keep. A translated answer cannot stream token by token, so
 * it arrives on `done` and the client is told the reply was translated.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-chat', 30);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim().slice(0, MAX_QUESTION_CHARS) : '';
  if (!question) {
    return Response.json({ error: 'Type a question first.' }, { status: 400 });
  }

  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((value): value is string => typeof value === 'string').slice(0, 100)
    : [];

  const language = typeof body.language === 'string' && isSunbirdLanguage(body.language)
    ? normalizeSunbirdLanguage(body.language)
    : normalizeSunbirdLanguage(notebook.language);
  const needsTranslation = language !== 'eng';

  const chat = await chatCollection();
  const now = new Date();

  // Save the learner's question before answering, so a failed answer still
  // leaves the conversation intact.
  await chat.insertOne({
    _id: randomUUID(),
    notebookId,
    userId,
    role: 'user',
    content: question,
    language,
    createdAt: now,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown): void => {
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      try {
        // 1. The question goes to the model in English, where grounding and
        //    citation behaviour are most reliable.
        let englishQuestion = question;
        if (needsTranslation) {
          try {
            const translated = await translateText(question, language, 'eng');
            englishQuestion = translated.text;
          } catch (error) {
            console.warn('Question translation failed, asking as typed:', error);
          }
        }

        // 2. Retrieve.
        send('status', { stage: 'retrieving' });
        const { chunks, mode } = await retrieve(userId, notebookId, sourceIds, englishQuestion, RETRIEVE_K);

        if (chunks.length === 0) {
          const message = sourceIds.length === 0
            ? 'Tick at least one source, then ask again.'
            : 'I could not find anything about that in these sources. Try another question, or add a source that covers it.';
          send('done', { answer: message, citations: [], provider: 'none', retrieval: mode });
          controller.close();
          return;
        }

        const { block, map } = numberSources(chunks);

        // 3. Recent turns, oldest first, so follow-up questions make sense.
        const history = await chat
          .find({ notebookId, userId }, { projection: { role: 1, content: 1 } })
          .sort({ createdAt: -1 })
          .limit(HISTORY_TURNS * 2)
          .toArray();
        const recent = history
          .reverse()
          .slice(0, -1)
          .map((message) => `${message.role === 'user' ? 'Learner' : 'Sautika'}: ${message.content}`)
          .join('\n');

        const prompt = [
          recent ? `Earlier in this conversation:\n${recent}\n` : '',
          `Sources:\n${block}`,
          `\nLearner's question: ${englishQuestion}`,
        ].join('\n');

        // 4. Stream.
        send('status', { stage: 'thinking', retrieval: mode });
        const textStream = await openTextStream({
          prompt,
          systemPrompt: RULES,
          maxTokens: 1200,
          temperature: 0.3,
          timeoutMs: 45_000,
        });
        send('status', { stage: 'answering', provider: textStream.provider });

        let answer = '';
        const seen = new Set<number>();

        for await (const token of textStream.tokens) {
          answer += token;
          // English answers stream straight through; a translated answer has
          // to be whole before it can be translated, so hold it back.
          if (!needsTranslation) send('token', { text: token });

          // Tell the UI about a citation as soon as its marker is complete,
          // so the marker can be a button before the reply finishes.
          for (const n of citedNumbers(answer, chunks.length)) {
            if (seen.has(n)) continue;
            seen.add(n);
            const chunk = map[n];
            send('citation', {
              n,
              sourceId: chunk.sourceId,
              chunkId: chunk.chunkId,
              quote: chunk.text.slice(0, QUOTE_CHARS),
              page: chunk.page,
            });
          }
        }

        answer = answer.trim();
        if (!answer) throw new Error('The tutor returned an empty answer.');

        const citations = buildCitations(answer, map);

        // 5. Back into the learner's language.
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

        await chat.insertOne({
          _id: randomUUID(),
          notebookId,
          userId,
          role: 'assistant',
          content: finalAnswer,
          language,
          citations,
          provider: textStream.provider,
          createdAt: new Date(),
        });

        send('done', {
          answer: finalAnswer,
          citations,
          provider: textStream.provider,
          retrieval: mode,
          translated,
          buffered: textStream.buffered,
        });
      } catch (error) {
        // The detail stays in the server log; the learner gets one clear line.
        console.error('Notebook chat failed:', error);
        send('error', { error: 'The tutor could not answer just now. Please try again.' });
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
      // Stops a proxy from sitting on the stream until it ends.
      'X-Accel-Buffering': 'no',
    },
  });
}

/** The conversation so far, oldest first. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-chat-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const limit = Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 50) || 50);
  const chat = await chatCollection();
  const messages = await chat
    .find({ notebookId, userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return Response.json({
    messages: messages.reverse().map((message) => ({
      id: message._id,
      role: message.role,
      content: message.content,
      language: message.language,
      citations: message.citations ?? [],
      provider: message.provider,
      createdAt: message.createdAt,
    })),
  });
}

/** Clears the conversation, leaving the sources and notes alone. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-chat-write', 30);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const notebook = await assertNotebookAccess(userId, notebookId, { write: true });
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const chat = await chatCollection();
  await chat.deleteMany({ notebookId, userId });
  return Response.json({ cleared: true });
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { streamChat } from '@/lib/notebooks/client';

/**
 * The chat client parses Server-Sent Events by hand, so these tests push the
 * awkward shapes through it: an event split across two network chunks, several
 * events in one chunk, unknown events, and a stream that stops without a
 * `done`.
 */

function sseResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

function mockFetch(response: Response | Promise<Response>): void {
  vi.stubGlobal('fetch', vi.fn(async () => response));
}

const event = (name: string, data: unknown): string =>
  `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;

interface Collected {
  tokens: string[];
  citations: number[];
  statuses: string[];
  done: { answer: string; provider: string } | null;
  error: string | null;
}

async function run(chunks: string[]): Promise<Collected> {
  const collected: Collected = {
    tokens: [],
    citations: [],
    statuses: [],
    done: null,
    error: null,
  };

  mockFetch(sseResponse(chunks));
  await streamChat(
    'nb-1',
    { question: 'Why do plants need light?', sourceIds: ['s1'] },
    {
      onToken: (text) => collected.tokens.push(text),
      onCitation: (citation) => collected.citations.push(citation.n),
      onStatus: (status) => collected.statuses.push(status.stage),
      onDone: (result) => {
        collected.done = { answer: result.answer, provider: result.provider };
      },
      onError: (message) => {
        collected.error = message;
      },
    },
  );

  return collected;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('streamChat', () => {
  it('reads tokens, citations and the final answer', async () => {
    const result = await run([
      event('status', { stage: 'retrieving' }),
      event('token', { text: 'Plants ' }),
      event('token', { text: 'need light' }),
      event('citation', { n: 1, sourceId: 's1', chunkId: 'c1', quote: 'Light is needed' }),
      event('done', { answer: 'Plants need light [1]', citations: [], provider: 'Google Gemini' }),
    ]);

    expect(result.tokens).toEqual(['Plants ', 'need light']);
    expect(result.citations).toEqual([1]);
    expect(result.statuses).toEqual(['retrieving']);
    expect(result.done).toEqual({ answer: 'Plants need light [1]', provider: 'Google Gemini' });
    expect(result.error).toBeNull();
  });

  it('reassembles an event split across two network chunks', async () => {
    const whole = event('token', { text: 'photosynthesis' });
    const cut = Math.floor(whole.length / 2);

    const result = await run([
      whole.slice(0, cut),
      whole.slice(cut),
      event('done', { answer: 'photosynthesis', citations: [], provider: 'Groq' }),
    ]);

    expect(result.tokens).toEqual(['photosynthesis']);
    expect(result.done?.provider).toBe('Groq');
  });

  it('reads several events arriving in one chunk', async () => {
    const result = await run([
      event('token', { text: 'a' }) + event('token', { text: 'b' }) + event('token', { text: 'c' }),
      event('done', { answer: 'abc', citations: [], provider: 'Groq' }),
    ]);

    expect(result.tokens).toEqual(['a', 'b', 'c']);
  });

  it('ignores an event it does not know', async () => {
    const result = await run([
      event('heartbeat', { at: 1 }),
      event('token', { text: 'ok' }),
      event('done', { answer: 'ok', citations: [], provider: 'Groq' }),
    ]);

    expect(result.tokens).toEqual(['ok']);
    expect(result.error).toBeNull();
  });

  it('survives a malformed data payload', async () => {
    const result = await run([
      'event: token\ndata: {not json}\n\n',
      event('token', { text: 'still here' }),
      event('done', { answer: 'still here', citations: [], provider: 'Groq' }),
    ]);

    expect(result.tokens).toEqual(['still here']);
    expect(result.done).not.toBeNull();
  });

  it('reports a server error event to the learner', async () => {
    const result = await run([event('error', { error: 'The tutor could not answer just now.' })]);

    expect(result.error).toBe('The tutor could not answer just now.');
    expect(result.done).toBeNull();
  });

  it('does not leave a spinner when the stream ends without done', async () => {
    const result = await run([event('token', { text: 'half an answer' })]);

    expect(result.tokens).toEqual(['half an answer']);
    expect(result.error).toBe('The answer stopped partway. Please try again.');
  });

  it('surfaces the API error message when the request is refused', async () => {
    mockFetch(
      new Response(JSON.stringify({ error: 'Tick at least one source, then ask again.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    let message = '';
    await streamChat(
      'nb-1',
      { question: 'Anything?', sourceIds: [] },
      { onDone: () => undefined, onError: (error) => { message = error; } },
    );

    expect(message).toBe('Tick at least one source, then ask again.');
  });

  it('says something useful when the network is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }));

    let message = '';
    await streamChat(
      'nb-1',
      { question: 'Anything?', sourceIds: ['s1'] },
      { onDone: () => undefined, onError: (error) => { message = error; } },
    );

    expect(message).toContain('offline');
  });
});

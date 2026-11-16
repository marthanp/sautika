/**
 * Streaming text from the LLM providers.
 *
 * The learner sees the first words of an answer instead of waiting for the
 * whole thing. Two dialects cover every provider configured today: Gemini's
 * `streamGenerateContent` and the OpenAI chat-completions format that Groq,
 * OpenRouter, Mistral, SambaNova, Fireworks, NVIDIA, Kimi and Zhipu all speak.
 *
 * This is the seam Phase 4 builds the full router on: hedged requests, a
 * global time budget and Anthropic go on top of `openTextStream` without the
 * callers changing. Cohere has no streaming path here and is reached through
 * the non-streaming fallback at the end.
 */

import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_KEY_ENV,
  model,
  OPENAI_COMPATIBLE,
  readKey,
  generateAIResponse,
  type OpenAICompatibleProvider,
} from '@/lib/llm-providers';

export interface StreamOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  /** Cancels the upstream request; used to abort a hedged loser. */
  signal?: AbortSignal;
  /** Time allowed to open the stream and keep it open. */
  timeoutMs?: number;
}

export interface TextStream {
  /** Which provider is answering, known before the first token. */
  provider: string;
  tokens: AsyncIterable<string>;
  /** True when the text arrived in one piece rather than token by token. */
  buffered: boolean;
}

const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_MAX_TOKENS = 1200;

/** Joins the caller's signal with a timeout, so either can stop the request. */
function requestSignal(options: StreamOptions): AbortSignal {
  const timeout = AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (!options.signal) return timeout;
  // AbortSignal.any is in Node 20+; this project needs Node 22.18+.
  return AbortSignal.any([timeout, options.signal]);
}

/**
 * Reads an SSE body and yields each `data:` payload, which is the one part of
 * the protocol both dialects share.
 */
async function* sseEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Events are separated by a blank line; a chunk can split one in half.
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const event = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        for (const line of event.split('\n')) {
          const trimmed = line.trimStart();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data) yield data;
        }
        boundary = buffer.indexOf('\n\n');
      }
    }
  } finally {
    // Releasing the lock lets an abort actually close the socket.
    reader.releaseLock();
  }
}

async function* geminiTokens(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const data of sseEvents(body)) {
    let parsed: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const parts = parsed.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.text) yield part.text;
    }
  }
}

async function* openAITokens(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const data of sseEvents(body)) {
    if (data === '[DONE]') return;
    let parsed: { choices?: { delta?: { content?: string } }[] };
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    const token = parsed.choices?.[0]?.delta?.content;
    if (token) yield token;
  }
}

async function openGemini(key: string, options: StreamOptions): Promise<TextStream | null> {
  const name = model('GEMINI_MODEL', GEMINI_DEFAULT_MODEL);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Keys belong in a header, never in a URL that proxies and logs capture.
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        ...(options.systemPrompt
          ? { system_instruction: { parts: [{ text: options.systemPrompt }] } }
          : {}),
        contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
        // Gemini 3.6+ deprecated the sampling parameters, so no `temperature`.
        generationConfig: { maxOutputTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS },
      }),
      signal: requestSignal(options),
    },
  );

  if (!response.ok || !response.body) {
    console.warn('Gemini stream responded with status', response.status);
    return null;
  }
  return { provider: 'Google Gemini', tokens: geminiTokens(response.body), buffered: false };
}

async function openOpenAICompatible(
  provider: OpenAICompatibleProvider,
  key: string,
  options: StreamOptions,
): Promise<TextStream | null> {
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model(provider.modelEnv, provider.defaultModel),
      messages: [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        { role: 'user', content: options.prompt },
      ],
      max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
      stream: true,
      ...(provider.sendTemperature === false
        ? {}
        : { temperature: options.temperature ?? 0.4 }),
    }),
    signal: requestSignal(options),
  });

  if (!response.ok || !response.body) {
    console.warn(`${provider.name} stream responded with status`, response.status);
    return null;
  }
  return { provider: provider.name, tokens: openAITokens(response.body), buffered: false };
}

/** One chunk, for the last-resort non-streaming path. */
async function* single(text: string): AsyncGenerator<string> {
  if (text) yield text;
}

/** The streaming providers in order, as names, for logs and diagnostics. */
export function streamingProviders(): string[] {
  const names: string[] = [];
  if (readKey(GEMINI_KEY_ENV)) names.push('Google Gemini');
  for (const provider of OPENAI_COMPATIBLE) {
    if (readKey(provider.keyEnv)) names.push(provider.name);
  }
  return names;
}

/**
 * Opens a stream with the first provider that accepts the request.
 *
 * Resolves once the response headers are in, so the caller knows which
 * provider answered before any token arrives. If no provider will stream, the
 * non-streaming engine answers and the whole text is delivered as one chunk
 * with `buffered: true`, so the UI can tell the difference.
 */
export async function openTextStream(options: StreamOptions): Promise<TextStream> {
  const attempts: (() => Promise<TextStream | null>)[] = [];

  const geminiKey = readKey(GEMINI_KEY_ENV);
  if (geminiKey) attempts.push(() => openGemini(geminiKey, options));

  for (const provider of OPENAI_COMPATIBLE) {
    const key = readKey(provider.keyEnv);
    if (key) attempts.push(() => openOpenAICompatible(provider, key, options));
  }

  for (const attempt of attempts) {
    if (options.signal?.aborted) break;
    try {
      const stream = await attempt();
      if (stream) return stream;
    } catch (error) {
      // A refused or timed-out provider is not fatal: try the next one.
      console.warn('Stream attempt failed, trying the next provider:', error);
    }
  }

  // Nothing streamed. Fall back to the non-streaming engine so the learner
  // still gets an answer, and say so through `buffered`.
  const result = await generateAIResponse({
    prompt: options.prompt,
    systemPrompt: options.systemPrompt,
    maxTokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: options.temperature,
    allowHeuristic: false,
  });

  return { provider: result.provider, tokens: single(result.text), buffered: true };
}

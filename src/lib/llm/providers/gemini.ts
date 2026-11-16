import { GEMINI_DEFAULT_MODEL, GEMINI_KEY_ENV, model, readKey } from '@/lib/llm-providers';
import { sseEvents } from '@/lib/llm/sse';
import type { StreamOptions, StreamProvider, TextStream } from '@/lib/llm/types';

/** Google Gemini, streaming through `streamGenerateContent`. */

async function* geminiTokens(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  for await (const data of sseEvents(body)) {
    let parsed: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    try {
      parsed = JSON.parse(data);
    } catch {
      continue;
    }
    for (const part of parsed.candidates?.[0]?.content?.parts ?? []) {
      if (part.text) yield part.text;
    }
  }
}

/** Numbered sources in the prompt, for a provider without native citations. */
export function promptWithDocuments(options: StreamOptions): string {
  const documents = options.documents ?? [];
  if (documents.length === 0) return options.prompt;

  const block = documents
    .map((document) => `[${document.n}] ${document.title}\n${document.text}`)
    .join('\n\n');
  return `Sources:\n${block}\n\n${options.prompt}`;
}

export const geminiProvider: StreamProvider = {
  name: 'Google Gemini',
  configured: () => Boolean(readKey(GEMINI_KEY_ENV)),

  async open(options: StreamOptions): Promise<TextStream | null> {
    const key = readKey(GEMINI_KEY_ENV);
    if (!key) return null;

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
          contents: [{ role: 'user', parts: [{ text: promptWithDocuments(options) }] }],
          // Gemini 3.6+ deprecated the sampling parameters, so no `temperature`.
          generationConfig: { maxOutputTokens: options.maxTokens ?? 1600 },
        }),
        signal: options.signal,
      },
    );

    if (!response.ok || !response.body) {
      console.warn('Gemini stream responded with status', response.status);
      return null;
    }
    return { provider: 'Google Gemini', tokens: geminiTokens(response.body), buffered: false };
  },
};

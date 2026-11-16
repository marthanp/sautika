import { model, OPENAI_COMPATIBLE, readKey, type OpenAICompatibleProvider } from '@/lib/llm-providers';
import { promptWithDocuments } from '@/lib/llm/providers/gemini';
import { sseEvents } from '@/lib/llm/sse';
import type { StreamOptions, StreamProvider, TextStream } from '@/lib/llm/types';

/**
 * Groq, OpenRouter, Mistral, SambaNova, Fireworks, NVIDIA, Kimi and Zhipu:
 * all of them speak the OpenAI chat-completions dialect, so one adapter
 * covers the lot.
 */

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

function adapt(provider: OpenAICompatibleProvider): StreamProvider {
  return {
    name: provider.name,
    configured: () => Boolean(readKey(provider.keyEnv)),

    async open(options: StreamOptions): Promise<TextStream | null> {
      const key = readKey(provider.keyEnv);
      if (!key) return null;

      const response = await fetch(provider.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model(provider.modelEnv, provider.defaultModel),
          messages: [
            ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: promptWithDocuments(options) },
          ],
          max_tokens: options.maxTokens ?? 1600,
          stream: true,
          ...(provider.sendTemperature === false
            ? {}
            : { temperature: options.temperature ?? 0.4 }),
        }),
        signal: options.signal,
      });

      if (!response.ok || !response.body) {
        console.warn(`${provider.name} stream responded with status`, response.status);
        return null;
      }
      return { provider: provider.name, tokens: openAITokens(response.body), buffered: false };
    },
  };
}

/** One streaming adapter per configured OpenAI-compatible provider. */
export const openAICompatibleProviders: StreamProvider[] = OPENAI_COMPATIBLE.map(adapt);

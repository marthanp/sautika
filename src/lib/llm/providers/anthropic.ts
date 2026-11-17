import type { ProviderCitation, StreamOptions, StreamProvider, TextStream } from '@/lib/llm/types';

/**
 * Anthropic Claude.
 *
 * Two things here that no other provider in the chain gives us:
 *
 *  - **Prompt caching.** The system prompt and the retrieved-sources block are
 *    marked `cache_control: ephemeral`, so a follow-up question in the same
 *    notebook re-reads them from cache instead of paying for them again. The
 *    volatile part (the learner's question) goes last, after the last
 *    breakpoint, because caching is a prefix match.
 *  - **Native citations.** Passages are sent as `document` blocks with
 *    `citations: {enabled: true}`, so the spans come back from the API with the
 *    exact quoted text, instead of being guessed from `[n]` markers the model
 *    may put in the wrong place.
 *
 * Notes from the current API that the code depends on:
 *  - `temperature` is rejected with a 400 on Haiku 5.5 and Sonnet 5.5, so it
 *    is never sent.
 *  - A safety decline arrives as HTTP 200 with `stop_reason: 'refusal'`. That
 *    is treated as a failed attempt so the router moves to the next provider,
 *    which is what the rest of the chain is for.
 */

const FAST_MODEL = process.env.ANTHROPIC_MODEL_FAST || 'claude-haiku-5-5';
const DEEP_MODEL = process.env.ANTHROPIC_MODEL_DEEP || 'claude-sonnet-5-5';

export function anthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function anthropicModel(tier: 'fast' | 'deep'): string {
  return tier === 'deep' ? DEEP_MODEL : FAST_MODEL;
}

/** Documents as citable blocks, with the last one carrying the cache breakpoint. */
function documentBlocks(options: StreamOptions): unknown[] {
  const documents = options.documents ?? [];
  return documents.map((document, index) => ({
    type: 'document',
    source: { type: 'text', media_type: 'text/plain', data: document.text },
    title: `[${document.n}] ${document.title}`.slice(0, 200),
    // All documents or none, per the API.
    citations: { enabled: true },
    // One breakpoint at the end of the sources: everything before it is
    // stable for the whole notebook conversation.
    ...(index === documents.length - 1 ? { cache_control: { type: 'ephemeral' } } : {}),
  }));
}

export const anthropicProvider: StreamProvider = {
  name: 'Anthropic Claude',
  configured: anthropicConfigured,
  nativeCitations: true,

  async open(options: StreamOptions): Promise<TextStream | null> {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return null;

    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: key, maxRetries: 0 });

    const tier = options.tier ?? 'fast';
    const model = anthropicModel(tier);
    const documents = options.documents ?? [];

    const content: unknown[] = [
      ...documentBlocks(options),
      { type: 'text', text: options.prompt },
    ];

    const collected: ProviderCitation[] = [];

    const stream = client.messages.stream(
      {
        model,
        max_tokens: options.maxTokens ?? 1600,
        // The system prompt is identical for every turn, so cache it.
        ...(options.systemPrompt
          ? {
            system: [
              {
                type: 'text' as const,
                text: options.systemPrompt,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          }
          : {}),
        messages: [{ role: 'user' as const, content: content as never }],
      },
      { signal: options.signal },
    );

    async function* tokens(): AsyncGenerator<string> {
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as {
            type: string;
            text?: string;
            citation?: { cited_text?: string; document_title?: string | null };
          };

          if (delta.type === 'text_delta' && delta.text) {
            yield delta.text;
            continue;
          }

          // A citation delta names the document it came from in the title we
          // set, which is where the `[n]` is recovered from.
          if (delta.type === 'citations_delta' && delta.citation) {
            const title = delta.citation.document_title ?? '';
            const match = /^\[(\d{1,2})\]/.exec(title);
            const n = match ? Number(match[1]) : 0;
            if (n >= 1 && n <= documents.length) {
              collected.push({ n, quote: (delta.citation.cited_text ?? '').slice(0, 240) });
            }
          }
        }
      }

      // A decline is not an answer: fail so the router tries the next provider.
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') {
        throw new Error('Claude declined this request.');
      }
    }

    return {
      provider: `${this.name} (${tier})`,
      tokens: tokens(),
      buffered: false,
      citations: () => collected,
    };
  },
};

/**
 * A non-streaming Anthropic call, for the places that want one string back
 * (translation polishing, a source guide, a Studio generator).
 */
export async function anthropicComplete(options: {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  tier?: 'fast' | 'deep';
  signal?: AbortSignal;
}): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: key, maxRetries: 1 });

  const message = await client.messages.create(
    {
      model: anthropicModel(options.tier ?? 'fast'),
      max_tokens: options.maxTokens ?? 1600,
      ...(options.systemPrompt
        ? {
          system: [
            {
              type: 'text' as const,
              text: options.systemPrompt,
              cache_control: { type: 'ephemeral' as const },
            },
          ],
        }
        : {}),
      messages: [{ role: 'user' as const, content: options.prompt }],
    },
    { signal: options.signal },
  );

  if (message.stop_reason === 'refusal') return null;

  const text = message.content
    .filter((block): block is { type: 'text'; text: string } & typeof block => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  return text || null;
}

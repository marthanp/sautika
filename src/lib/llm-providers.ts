/**
 * Multi-provider LLM engine with failover.
 *
 * Order: Gemini -> Groq -> OpenRouter -> Mistral -> SambaNova -> Fireworks
 *        -> NVIDIA NIM -> Kimi -> Zhipu -> Cohere -> built-in extractive fallback.
 *
 * Every provider's model is overridable through an environment variable so the
 * platform can follow model deprecations without a code change.
 */

export interface LLMRequestOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  /** Ask the provider for JSON back. */
  json?: boolean;
  /** When every provider fails, fall back to a local extractive summary. */
  allowHeuristic?: boolean;
  /** The learner's own text. The fallback summarises THIS, never the instruction. */
  heuristicSource?: string;
  timeoutMs?: number;
  /**
   * Which Anthropic tier to use when a key is configured. `fast` for anything
   * a learner is waiting on, `deep` for reports and long scripts.
   */
  tier?: 'fast' | 'deep';
}

export interface LLMResponse {
  text: string;
  provider: string;
}

export interface OpenAICompatibleProvider {
  name: string;
  keyEnv: string[];
  url: string;
  defaultModel: string;
  modelEnv: string;
  /** Zhipu rejects `temperature` alongside some models, so it is opt-out. */
  sendTemperature?: boolean;
}

/**
 * The OpenAI-compatible providers, in failover order. Gemini and Cohere speak
 * their own dialects and are handled separately.
 */
export const OPENAI_COMPATIBLE: OpenAICompatibleProvider[] = [
  {
    name: 'Groq',
    keyEnv: ['GROQ_API_KEY'],
    url: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    modelEnv: 'GROQ_MODEL',
  },
  {
    name: 'OpenRouter',
    keyEnv: ['OPENROUTER_API_KEY'],
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    modelEnv: 'OPENROUTER_MODEL',
  },
  {
    name: 'Mistral',
    keyEnv: ['MISTRAL_API_KEY'],
    url: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    modelEnv: 'MISTRAL_MODEL',
  },
  {
    name: 'SambaNova',
    keyEnv: ['SAMBANOVA_API_KEY'],
    url: 'https://api.sambanova.ai/v1/chat/completions',
    defaultModel: 'Meta-Llama-3.1-70B-Instruct',
    modelEnv: 'SAMBANOVA_MODEL',
  },
  {
    name: 'Fireworks AI',
    keyEnv: ['FIREWORKS_API_KEY'],
    url: 'https://api.fireworks.ai/inference/v1/chat/completions',
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    modelEnv: 'FIREWORKS_MODEL',
  },
  {
    name: 'NVIDIA NIM',
    keyEnv: ['NVIDIA_NIM_API_KEY', 'NVIDIA_API_KEY'],
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    defaultModel: 'meta/llama-3.1-70b-instruct',
    modelEnv: 'NVIDIA_MODEL',
  },
  {
    name: 'Moonshot Kimi',
    keyEnv: ['KIMI_API_KEY', 'MOONSHOT_API_KEY'],
    url: 'https://api.moonshot.cn/v1/chat/completions',
    defaultModel: 'moonshot-v1-8k',
    modelEnv: 'KIMI_MODEL',
  },
  {
    name: 'Zhipu ZAI',
    keyEnv: ['ZAI_API_KEY', 'ZHIPU_API_KEY'],
    url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    modelEnv: 'ZHIPU_MODEL',
    sendTemperature: false,
  },
];

export const GEMINI_KEY_ENV = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'];
/** Current GA Flash model. `gemini-1.5-flash` is retired. */
export const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';

/** The first of these environment variables that has a value. */
export function readKey(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  return undefined;
}

/** A model name from the environment, or the shipped default. */
export function model(envName: string, fallback: string): string {
  return process.env[envName] || fallback;
}

/** True when at least one provider key is configured. */
export function hasAnyLLMProvider(): boolean {
  if (readKey(GEMINI_KEY_ENV)) return true;
  if (process.env.COHERE_API_KEY) return true;
  return OPENAI_COMPATIBLE.some((provider) => Boolean(readKey(provider.keyEnv)));
}

/** Names of the providers that currently have a key, in failover order. */
export function configuredProviders(): string[] {
  const names: string[] = [];
  if (readKey(GEMINI_KEY_ENV)) names.push('Google Gemini');
  for (const provider of OPENAI_COMPATIBLE) {
    if (readKey(provider.keyEnv)) names.push(provider.name);
  }
  if (process.env.COHERE_API_KEY) names.push('Cohere');
  return names;
}

export async function generateAIResponse(options: LLMRequestOptions): Promise<LLMResponse> {
  const {
    prompt,
    systemPrompt,
    maxTokens = 1200,
    temperature = 0.5,
    json = false,
    allowHeuristic = true,
    heuristicSource,
    timeoutMs = 25_000,
  } = options;

  const attempt = async (fn: () => Promise<LLMResponse | null>, label: string) => {
    try {
      return await fn();
    } catch (error) {
      console.warn(`${label} request failed, falling back:`, error);
      return null;
    }
  };

  // 0. Anthropic Claude, when configured. `tier` is chosen by the caller
  //    through `options.tier`; the default is the fast model, because most
  //    non-streaming callers here are short jobs a learner is waiting on.
  if (process.env.ANTHROPIC_API_KEY) {
    const result = await attempt(async () => {
      const { anthropicComplete } = await import('@/lib/llm/providers/anthropic');
      const text = await anthropicComplete({
        prompt,
        systemPrompt,
        maxTokens,
        tier: options.tier ?? 'fast',
      });
      return text ? { text, provider: 'Anthropic Claude' } : null;
    }, 'Anthropic');
    if (result) return result;
  }

  // 1. Google Gemini
  const geminiKey = readKey(GEMINI_KEY_ENV);
  if (geminiKey) {
    const result = await attempt(
      () => callGemini(geminiKey, { prompt, systemPrompt, maxTokens, json, timeoutMs }),
      'Gemini',
    );
    if (result) return result;
  }

  // 2 to 9. OpenAI-compatible providers
  for (const provider of OPENAI_COMPATIBLE) {
    const key = readKey(provider.keyEnv);
    if (!key) continue;
    const result = await attempt(
      () =>
        callOpenAICompatible(provider, key, {
          prompt,
          systemPrompt,
          maxTokens,
          temperature,
          json,
          timeoutMs,
        }),
      provider.name,
    );
    if (result) return result;
  }

  // 10. Cohere
  const cohereKey = process.env.COHERE_API_KEY;
  if (cohereKey) {
    const result = await attempt(
      () => callCohere(cohereKey, { prompt, systemPrompt, maxTokens, temperature, json, timeoutMs }),
      'Cohere',
    );
    if (result) return result;
  }

  if (!allowHeuristic) {
    throw new Error('No AI provider is available right now.');
  }

  return {
    text: extractiveSummary(heuristicSource ?? ''),
    provider: 'Built-in study engine',
  };
}

interface CallArgs {
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  temperature?: number;
  json: boolean;
  timeoutMs: number;
}

async function callGemini(key: string, args: CallArgs): Promise<LLMResponse | null> {
  const name = model('GEMINI_MODEL', GEMINI_DEFAULT_MODEL);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(name)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Keys belong in a header, never in a URL that proxies and logs capture.
        'x-goog-api-key': key,
      },
      body: JSON.stringify({
        system_instruction: args.systemPrompt ? { parts: [{ text: args.systemPrompt }] } : undefined,
        contents: [{ role: 'user', parts: [{ text: args.prompt }] }],
        // Gemini 3.6+ deprecated the sampling parameters, so no `temperature` here.
        generationConfig: {
          maxOutputTokens: args.maxTokens,
          ...(args.json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
      signal: AbortSignal.timeout(args.timeoutMs),
    },
  );
  if (!res.ok) {
    console.warn('Gemini responded with status', res.status);
    return null;
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  return text ? { text, provider: 'Google Gemini' } : null;
}

async function callOpenAICompatible(
  provider: OpenAICompatibleProvider,
  key: string,
  args: CallArgs,
): Promise<LLMResponse | null> {
  const res = await fetch(provider.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model(provider.modelEnv, provider.defaultModel),
      messages: [
        ...(args.systemPrompt ? [{ role: 'system', content: args.systemPrompt }] : []),
        { role: 'user', content: args.prompt },
      ],
      max_tokens: args.maxTokens,
      ...(provider.sendTemperature === false ? {} : { temperature: args.temperature ?? 0.5 }),
      ...(args.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  if (!res.ok) {
    console.warn(`${provider.name} responded with status`, res.status);
    return null;
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text ? { text, provider: provider.name } : null;
}

async function callCohere(key: string, args: CallArgs): Promise<LLMResponse | null> {
  const res = await fetch('https://api.cohere.com/v2/chat', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model('COHERE_MODEL', 'command-r-08-2024'),
      messages: [
        ...(args.systemPrompt ? [{ role: 'system', content: args.systemPrompt }] : []),
        { role: 'user', content: args.prompt },
      ],
      max_tokens: args.maxTokens,
      temperature: args.temperature ?? 0.5,
      ...(args.json ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  if (!res.ok) {
    console.warn('Cohere responded with status', res.status);
    return null;
  }
  const data = (await res.json()) as {
    message?: { content?: { text?: string }[] };
  };
  const text = data.message?.content
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  return text ? { text, provider: 'Cohere' } : null;
}

const STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'for', 'are', 'was', 'were', 'you', 'your',
  'from', 'have', 'has', 'had', 'but', 'not', 'they', 'their', 'them', 'can',
  'will', 'would', 'should', 'into', 'than', 'then', 'when', 'what', 'which', 'who',
  'how', 'why', 'its', 'it', 'is', 'of', 'to', 'in', 'on', 'at', 'as', 'by', 'an', 'a',
  'be', 'or', 'if', 'so', 'we', 'he', 'she', 'do', 'does', 'did', 'there', 'these',
  'those', 'also', 'more', 'most', 'some', 'such', 'only', 'other', 'because',
]);

/**
 * Local fallback when no provider answers.
 *
 * It summarises the learner's own notes, never the instruction we sent the model:
 * sentences are scored by the frequency of their content words, the strongest four
 * are kept in their original order, and a study tip closes it off.
 */
function extractiveSummary(source: string): string {
  const clean = source.replace(/\s+/g, ' ').trim();
  if (clean.length < 40) {
    return [
      '- Your notes are too short for Sautika to summarise on its own right now.',
      '',
      'Study tip: add a few more lines from your book, then try again. Reading your notes aloud also helps them stick.',
    ].join('\n');
  }

  const sentences = clean
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= 4);

  if (sentences.length === 0) {
    return [`- ${clean.slice(0, 220)}`, '', 'Study tip: turn this into a question and answer it from memory.'].join('\n');
  }

  const frequency = new Map<string, number>();
  for (const word of clean.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    if (STOPWORDS.has(word)) continue;
    frequency.set(word, (frequency.get(word) ?? 0) + 1);
  }

  const scored = sentences.map((sentence, index) => {
    const words = sentence.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
    const total = words.reduce((sum, word) => sum + (frequency.get(word) ?? 0), 0);
    // Divide by length so a long sentence does not win on bulk alone.
    return { sentence, index, score: words.length > 0 ? total / Math.sqrt(words.length) : 0 };
  });

  const top = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .sort((a, b) => a.index - b.index);

  const bullets = top.map((item) => `- ${trimSentence(item.sentence)}`);

  return [
    ...bullets,
    '',
    'Study tip: cover these points, say them back in your own words, then check what you missed.',
  ].join('\n');
}

function trimSentence(sentence: string): string {
  const trimmed = sentence.replace(/^[-*•\s]+/, '').trim();
  if (trimmed.length <= 240) return trimmed;
  return `${trimmed.slice(0, 237).trimEnd()}...`;
}

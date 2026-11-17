import { generateAIResponse } from '@/lib/llm-providers';
import { kvGet, kvKey, kvSet } from '@/lib/kv-cache';
import { normalizeSunbirdLanguage, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import { translateWithSunbird } from '@/lib/sunbird-translation';

export type TranslationProvider = 'sunbird' | 'google' | 'llm';
export type TranslationSource = TranslationProvider | 'none';

export interface TranslateResult {
  text: string;
  provider: TranslationSource;
  polished?: boolean;
}

export interface TranslateOptions {
  /** Run the English result through the LLM as a copy editor. */
  polishEnglish?: boolean;
  /** Force a provider order instead of the automatic routing. */
  providers?: TranslationProvider[];
}

/**
 * Languages where Sunbird AI is the specialist: Google either does not list them
 * or handles them poorly, so Sunbird goes first for these.
 */
const SUNBIRD_SPECIALIST = new Set([
  'lug', 'ach', 'teo', 'lgg', 'nyn', 'myx', 'xog', 'cgg', 'koo', 'ruc', 'ttj',
  'led', 'kin', 'swa', 'luo', 'kln', 'luy',
]);

/** Sunbird code -> Google Cloud Translation code, for the languages Google lists. */
const GOOGLE_CODES: Record<string, string> = {
  eng: 'en', swa: 'sw', lug: 'lg', ach: 'ach', kin: 'rw', amh: 'am', hau: 'ha',
  ibo: 'ig', yor: 'yo', zul: 'zu', xho: 'xh', sna: 'sn', som: 'so', orm: 'om',
  lin: 'ln', nya: 'ny', mlg: 'mg', aka: 'ak', afr: 'af', ewe: 'ee', ful: 'ff',
  wol: 'wo', sot: 'st', tsn: 'tn', bam: 'bm', nbl: 'nr', kik: 'ki',
};

const LANGUAGE_NAMES = new Map<string, string>(
  SUNBIRD_LANGUAGES.map((language) => [language.code, language.name]),
);

/** Which translation providers are configured right now. */
export function translationProviders(): Record<TranslationProvider, boolean> {
  return {
    sunbird: Boolean(process.env.SUNBIRD_API_KEY),
    google: Boolean(process.env.GOOGLE_TRANSLATE_API_KEY),
    llm: Boolean(
      process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GROQ_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        process.env.MISTRAL_API_KEY ||
        process.env.SAMBANOVA_API_KEY ||
        process.env.FIREWORKS_API_KEY ||
        process.env.NVIDIA_NIM_API_KEY ||
        process.env.NVIDIA_API_KEY ||
        process.env.KIMI_API_KEY ||
        process.env.MOONSHOT_API_KEY ||
        process.env.ZAI_API_KEY ||
        process.env.ZHIPU_API_KEY ||
        process.env.COHERE_API_KEY,
    ),
  };
}

const CACHE_LIMIT = 2000;
/** Level 1: this instance only, free to read. */
const cache = new Map<string, TranslateResult>();
/** Level 2 (`kv_cache`) is shared by every instance, so a hit is worth a round trip. */
const SHARED_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheGet(key: string): TranslateResult | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  // Refresh insertion order so the hottest entries survive eviction.
  cache.delete(key);
  cache.set(key, hit);
  return hit;
}

function cacheSet(key: string, value: TranslateResult): void {
  cache.set(key, value);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function envProviderOrder(): TranslationProvider[] | null {
  const raw = process.env.TRANSLATION_PROVIDER_ORDER;
  if (!raw) return null;
  const order = raw
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is TranslationProvider =>
      part === 'sunbird' || part === 'google' || part === 'llm',
    );
  return order.length > 0 ? order : null;
}

function routeFor(source: string, target: string): TranslationProvider[] {
  const fromEnv = envProviderOrder();
  if (fromEnv) return fromEnv;
  const specialist = SUNBIRD_SPECIALIST.has(source) || SUNBIRD_SPECIALIST.has(target);
  return specialist ? ['sunbird', 'google', 'llm'] : ['google', 'sunbird', 'llm'];
}

function languageName(code: string): string {
  return LANGUAGE_NAMES.get(code) ?? code;
}

async function translateWithGoogle(
  text: string,
  source: string,
  target: string,
): Promise<string> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('Google Cloud Translation is not configured.');

  const from = GOOGLE_CODES[source];
  const to = GOOGLE_CODES[target];
  // Throw rather than guess, so the router moves to the next provider.
  if (!from || !to) throw new Error(`Google Translate does not list ${source} to ${target}.`);

  const res = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`Google Translate responded with status ${res.status}.`);

  const data = (await res.json()) as {
    data?: { translations?: { translatedText?: string }[] };
  };
  const translated = data.data?.translations?.[0]?.translatedText;
  if (!translated || !translated.trim()) {
    throw new Error('Google Translate returned an empty result.');
  }
  return decodeHtmlEntities(translated.trim());
}

/** The v2 endpoint escapes a handful of entities even with `format: 'text'`. */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

async function translateWithLLM(text: string, source: string, target: string): Promise<string> {
  const result = await generateAIResponse({
    systemPrompt:
      `You are a careful translator between ${languageName(source)} and ${languageName(target)}. ` +
      'Return only the translation. Keep every number, name and citation marker such as [1] exactly as it appears. ' +
      'Add no notes, no quotes around the answer and no explanation.',
    prompt: `Translate this from ${languageName(source)} into ${languageName(target)}:\n\n${text}`,
    maxTokens: Math.min(2000, Math.max(256, Math.ceil(text.length / 2))),
    temperature: 0.2,
    allowHeuristic: false,
  });
  const translated = result.text.trim();
  if (!translated) throw new Error('The AI translator returned nothing.');
  return translated;
}

/**
 * Rewrites machine-translated English so a learner reads fluent prose.
 * The edit is rejected if it balloons, which is the usual sign the model
 * started explaining instead of editing.
 */
async function polish(text: string): Promise<string> {
  try {
    const result = await generateAIResponse({
      systemPrompt:
        'You are an English copy editor for a learning platform. Fix grammar, word order and fluency. ' +
        'Keep the meaning, every number and every citation marker such as [1] exactly as they are. ' +
        'Add nothing, remove nothing, explain nothing. Return only the edited text.',
      prompt: text,
      maxTokens: Math.min(2000, Math.max(256, Math.ceil(text.length / 2))),
      temperature: 0.2,
      allowHeuristic: false,
    });
    const edited = result.text.trim();
    if (!edited) return text;
    if (edited.length > text.length * 1.6) return text;
    return edited;
  } catch (error) {
    console.warn('English polish skipped:', error);
    return text;
  }
}

/**
 * Translates `text`, trying each provider in the routed order and keeping the
 * first result. Throws a learner-facing message if every provider fails.
 */
export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  options: TranslateOptions = {},
): Promise<TranslateResult> {
  const source = normalizeSunbirdLanguage(sourceLanguage);
  const target = normalizeSunbirdLanguage(targetLanguage);
  const trimmed = text.trim();

  const wantsPolish =
    target === 'eng' &&
    (options.polishEnglish === true ||
      (options.polishEnglish !== false && process.env.TRANSLATION_ENGLISH_POLISH === 'true'));

  if (!trimmed) return { text, provider: 'none' };

  if (source === target) {
    if (!wantsPolish) return { text: trimmed, provider: 'none' };
    const polished = await polish(trimmed);
    return { text: polished, provider: 'none', polished: polished !== trimmed };
  }

  const cacheKey = `${source}>${target}|${wantsPolish ? 'p' : 'r'}|${trimmed}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // Level 2: a translation another instance already paid for.
  const sharedKey = kvKey('tr', source, target, wantsPolish ? 'p' : 'r', trimmed);
  const shared = await kvGet<TranslateResult>(sharedKey);
  if (shared?.text) {
    cacheSet(cacheKey, shared);
    return shared;
  }

  const order = options.providers ?? routeFor(source, target);
  const failures: string[] = [];

  for (const provider of order) {
    try {
      let translated: string;
      if (provider === 'sunbird') {
        translated = await translateWithSunbird(trimmed, source, target);
      } else if (provider === 'google') {
        translated = await translateWithGoogle(trimmed, source, target);
      } else {
        translated = await translateWithLLM(trimmed, source, target);
      }

      let polished = false;
      if (wantsPolish) {
        const edited = await polish(translated);
        polished = edited !== translated;
        translated = edited;
      }

      const result: TranslateResult = { text: translated, provider, polished };
      cacheSet(cacheKey, result);
      // Do not make the learner wait on the shared write.
      void kvSet(sharedKey, result, SHARED_CACHE_TTL_MS);
      return result;
    } catch (error) {
      failures.push(`${provider}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Keep the provider detail in the server log; the learner gets one clear line.
  console.error(`Translation ${source} to ${target} failed on every provider:`, failures.join(' | '));
  throw new Error('Translation is temporarily unavailable. Please try again in a moment.');
}

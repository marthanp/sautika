/**
 * Sautika MCP core: every tool, resource and prompt, and the JSON-RPC plumbing
 * around them.
 *
 * This file has NO imports on purpose. The same source runs inside Next.js
 * (src/app/api/mcp/route.ts) and directly under Node's native type stripping
 * (scripts/sautika-mcp-server.mjs), so everything it needs — courses, language
 * lists, search, environment and fetch — arrives in a context object. For the
 * same reason it uses no enums, no namespaces and no parameter properties.
 */

/* ------------------------------------------------------------------ types */

export interface McpQuizItem {
  k?: string;
  q: string;
  a: string;
  d?: readonly string[];
  x?: readonly string[];
}

export interface McpLesson {
  title: string;
  items: readonly McpQuizItem[];
}

export interface McpCourse {
  id: string;
  cat: string;
  title: string;
  level: string;
  emoji?: string;
  color?: string;
  levelGroup?: string;
  author?: string;
  sourceUrl?: string;
  description?: string;
  ttsLang?: string;
  lessons: readonly McpLesson[];
}

export interface McpLanguage {
  code: string;
  name: string;
}

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations: ToolAnnotations;
}

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ExtraTool {
  definition: ToolDefinition;
  handler: (args: Record<string, unknown>) => Promise<ToolResult> | ToolResult;
}

export interface McpContext {
  courses: readonly McpCourse[];
  languages: readonly McpLanguage[];
  ttsLanguages: ReadonlySet<string>;
  searchCourses(courses: readonly McpCourse[], query: string): readonly McpCourse[];
  env: Record<string, string | undefined>;
  fetch: typeof fetch;
  /** Tools only one transport offers, such as local file reads over stdio. */
  extraTools?: readonly ExtraTool[];
  /** Tool names to hide, used by the HTTP transport for anonymous callers. */
  disabledTools?: readonly string[];
  serverVersion?: string;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

/* -------------------------------------------------------------- constants */

/** Newest first. `2026-07-28` is discovery-only and is never negotiated. */
export const SUPPORTED_VERSIONS = [
  '2026-07-28',
  '2025-11-25',
  '2025-06-18',
  '2025-03-26',
  '2024-11-05',
];

const DISCOVERY_VERSION = '2026-07-28';
const DEFAULT_VERSION = '2025-11-25';
const TTL_MS = 300_000;
const CACHE_SCOPE = 'public';
const SERVER_NAME = 'sautika';
const DEFAULT_SERVER_VERSION = '2.0.0';

const META_PROTOCOL = 'io.modelcontextprotocol/protocolVersion';
const META_SERVER = 'io.modelcontextprotocol/serverInfo';

const UNSUPPORTED_VERSION_CODE = -32022;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INVALID_REQUEST = -32600;

const INSTRUCTIONS = [
  'Sautika is a voice-first learning platform for East African learners, Baby Class to Senior 6.',
  'Use search_courses and get_course to ground answers in the real curriculum, and get_lesson_quiz for ready-made questions.',
  'translate_text and text_to_speech work in Ugandan and East African languages through Sunbird AI, with Google and an LLM as fallbacks.',
  'Only quote course content that the tools return; do not invent lessons, levels or questions.',
].join(' ');

const MAX_TEXT_CHARS = 5_000;
const MAX_TTS_CHARS = 600;
const MAX_NOTES_CHARS = 25_000;
const LLM_TIMEOUT_MS = 25_000;

/** Sunbird is the specialist for these; elsewhere Google goes first. */
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

const GEMINI_KEYS = ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_AI_API_KEY'];
const GEMINI_DEFAULT_MODEL = 'gemini-3.8-flash';
const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_DEFAULT_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

/* ---------------------------------------------------------------- helpers */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function serverInfo(ctx: McpContext): Record<string, unknown> {
  return {
    name: SERVER_NAME,
    title: 'Sautika',
    version: ctx.serverVersion ?? DEFAULT_SERVER_VERSION,
  };
}

function capabilities(): Record<string, unknown> {
  return {
    tools: { listChanged: false },
    resources: { listChanged: false, subscribe: false },
    prompts: { listChanged: false },
    logging: {},
  };
}

function ok(ctx: McpContext, id: string | number, result: Record<string, unknown>): JsonRpcResponse {
  return {
    jsonrpc: '2.0',
    id,
    result: {
      ...result,
      resultType: 'complete',
      _meta: { [META_SERVER]: serverInfo(ctx) },
    },
  };
}

/** List and read results are cacheable, so they carry a TTL and a scope. */
function okCacheable(
  ctx: McpContext,
  id: string | number,
  result: Record<string, unknown>,
): JsonRpcResponse {
  return ok(ctx, id, { ...result, ttlMs: TTL_MS, cacheScope: CACHE_SCOPE });
}

function fail(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: data === undefined ? { code, message } : { code, message, data } };
}

function textResult(text: string, structuredContent?: Record<string, unknown>): ToolResult {
  const result: ToolResult = { content: [{ type: 'text', text }] };
  if (structuredContent) result.structuredContent = structuredContent;
  return result;
}

function jsonResult(value: unknown, structuredContent?: Record<string, unknown>): ToolResult {
  return textResult(JSON.stringify(value, null, 2), structuredContent);
}

/** Input and service problems come back as tool results, so a model can retry. */
function toolError(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normaliseLanguage(code: string): string {
  const trimmed = code.trim().toLowerCase();
  return trimmed === 'en' ? 'eng' : trimmed;
}

function languageName(ctx: McpContext, code: string): string {
  return ctx.languages.find((language) => language.code === code)?.name ?? code;
}

function isLanguage(ctx: McpContext, code: string): boolean {
  return ctx.languages.some((language) => language.code === code);
}

function readKey(ctx: McpContext, names: string[]): string | undefined {
  for (const name of names) {
    const value = ctx.env[name];
    if (value) return value;
  }
  return undefined;
}

function sunbirdBase(ctx: McpContext): string {
  return (ctx.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
}

function courseSummary(course: McpCourse): Record<string, unknown> {
  return {
    id: course.id,
    title: course.title,
    subject: course.cat,
    level: course.level,
    lessons: course.lessons.length,
    questions: course.lessons.reduce((total, lesson) => total + lesson.items.length, 0),
    description: course.description ?? '',
  };
}

function fullCourse(course: McpCourse): Record<string, unknown> {
  return {
    ...courseSummary(course),
    levelGroup: course.levelGroup ?? null,
    author: course.author ?? null,
    sourceUrl: course.sourceUrl ?? null,
    ttsLanguage: course.ttsLang ?? null,
    lessonList: course.lessons.map((lesson, index) => ({
      index,
      title: lesson.title,
      questions: lesson.items.map((item) => ({
        question: item.q,
        answer: item.a,
        distractors: item.d ? [...item.d] : [],
        blanks: item.x ? [...item.x] : [],
      })),
    })),
  };
}

/* ------------------------------------------------------------ translation */

async function sunbirdTranslate(
  ctx: McpContext,
  text: string,
  source: string,
  target: string,
): Promise<string> {
  const key = ctx.env.SUNBIRD_API_KEY;
  if (!key) throw new Error('SUNBIRD_API_KEY is not set.');

  const response = await ctx.fetch(`${sunbirdBase(ctx)}/tasks/translate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({ text, source_language: source, target_language: target }),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Sunbird translation failed (${response.status}).`);

  const data: unknown = await response.json();
  const output = isRecord(data) && isRecord(data.output) ? data.output : null;
  const translated = output ? asString(output.translated_text).trim() : '';
  if (!translated) throw new Error('Sunbird translation returned nothing.');
  return translated;
}

async function googleTranslate(
  ctx: McpContext,
  text: string,
  source: string,
  target: string,
): Promise<string> {
  const key = ctx.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error('GOOGLE_TRANSLATE_API_KEY is not set.');

  const from = GOOGLE_CODES[source];
  const to = GOOGLE_CODES[target];
  if (!from || !to) throw new Error('Google Cloud Translation does not list this language pair.');

  const response = await ctx.fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: from, target: to, format: 'text' }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Google translation failed (${response.status}).`);

  const data: unknown = await response.json();
  const payload = isRecord(data) && isRecord(data.data) ? data.data : null;
  const list = payload && Array.isArray(payload.translations) ? payload.translations : [];
  const first = list.length > 0 && isRecord(list[0]) ? asString(list[0].translatedText).trim() : '';
  if (!first) throw new Error('Google translation returned nothing.');
  return first;
}

async function llmTranslate(
  ctx: McpContext,
  text: string,
  source: string,
  target: string,
): Promise<string> {
  const result = await callModel(ctx, {
    systemPrompt:
      'You are a careful translator for East African languages. Reply with the translation only: no quotes, no notes, no explanation.',
    prompt: `Translate from ${languageName(ctx, source)} to ${languageName(ctx, target)}:\n\n${text}`,
    maxTokens: 900,
  });
  const translated = result.text.trim();
  if (!translated) throw new Error('The model returned an empty translation.');
  return translated;
}

async function polish(ctx: McpContext, text: string): Promise<string | null> {
  try {
    const result = await callModel(ctx, {
      systemPrompt:
        'You are an English copy editor. Fix grammar and make the text read naturally. Keep the meaning, every number and every [n] citation marker. Add nothing. Reply with the edited text only.',
      prompt: text,
      maxTokens: 900,
    });
    const edited = result.text.trim();
    if (!edited) return null;
    // A much longer "edit" means the model added material of its own.
    if (edited.length > text.length * 1.6) return null;
    return edited;
  } catch {
    return null;
  }
}

function providerOrder(ctx: McpContext, source: string, target: string): string[] {
  const configured = (ctx.env.TRANSLATION_PROVIDER_ORDER ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part === 'sunbird' || part === 'google' || part === 'llm');
  if (configured.length > 0) return configured;
  const specialist = SUNBIRD_SPECIALIST.has(source) || SUNBIRD_SPECIALIST.has(target);
  return specialist ? ['sunbird', 'google', 'llm'] : ['google', 'sunbird', 'llm'];
}

async function routeTranslate(
  ctx: McpContext,
  text: string,
  source: string,
  target: string,
  polishEnglish: boolean,
): Promise<{ text: string; provider: string; polished: boolean }> {
  if (!text.trim()) return { text, provider: 'none', polished: false };
  if (source === target) {
    if (target === 'eng' && polishEnglish) {
      const edited = await polish(ctx, text);
      if (edited) return { text: edited, provider: 'llm', polished: true };
    }
    return { text, provider: 'none', polished: false };
  }

  const failures: string[] = [];
  for (const provider of providerOrder(ctx, source, target)) {
    try {
      let translated: string;
      if (provider === 'sunbird') translated = await sunbirdTranslate(ctx, text, source, target);
      else if (provider === 'google') translated = await googleTranslate(ctx, text, source, target);
      else translated = await llmTranslate(ctx, text, source, target);

      let polished = false;
      if (target === 'eng' && polishEnglish) {
        const edited = await polish(ctx, translated);
        if (edited) {
          translated = edited;
          polished = true;
        }
      }
      return { text: translated, provider, polished };
    } catch (error) {
      failures.push(`${provider}: ${errorMessage(error)}`);
    }
  }
  throw new Error(`No translation provider could help. ${failures.join(' | ')}`);
}

/* -------------------------------------------------------------------- LLM */

interface ModelCall {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  json?: boolean;
}

async function callGemini(ctx: McpContext, call: ModelCall, key: string): Promise<string> {
  const model = ctx.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  const generationConfig: Record<string, unknown> = { maxOutputTokens: call.maxTokens ?? 900 };
  // Gemini 3.6+ deprecated the sampling parameters, so no temperature is sent.
  if (call.json) generationConfig.responseMimeType = 'application/json';

  const text = call.systemPrompt ? `${call.systemPrompt}\n\n${call.prompt}` : call.prompt;
  const response = await ctx.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Gemini failed (${response.status}).`);

  const data: unknown = await response.json();
  const candidates = isRecord(data) && Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates.length > 0 && isRecord(candidates[0]) ? candidates[0] : null;
  const content = first && isRecord(first.content) ? first.content : null;
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  const joined = parts
    .map((part) => (isRecord(part) ? asString(part.text) : ''))
    .join('')
    .trim();
  if (!joined) throw new Error('Gemini returned no text.');
  return joined;
}

async function callOpenAICompatible(
  ctx: McpContext,
  call: ModelCall,
  key: string,
  url: string,
  model: string,
  label: string,
): Promise<string> {
  const messages: { role: string; content: string }[] = [];
  if (call.systemPrompt) messages.push({ role: 'system', content: call.systemPrompt });
  messages.push({ role: 'user', content: call.prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: call.maxTokens ?? 900,
  };
  if (call.json) body.response_format = { type: 'json_object' };

  const response = await ctx.fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${label} failed (${response.status}).`);

  const data: unknown = await response.json();
  const choices = isRecord(data) && Array.isArray(data.choices) ? data.choices : [];
  const first = choices.length > 0 && isRecord(choices[0]) ? choices[0] : null;
  const message = first && isRecord(first.message) ? first.message : null;
  const text = message ? asString(message.content).trim() : '';
  if (!text) throw new Error(`${label} returned no text.`);
  return text;
}

/** Gemini, then Groq, then OpenRouter. No heuristic fallback: tools say so instead. */
async function callModel(ctx: McpContext, call: ModelCall): Promise<{ text: string; provider: string }> {
  const failures: string[] = [];

  const geminiKey = readKey(ctx, GEMINI_KEYS);
  if (geminiKey) {
    try {
      return { text: await callGemini(ctx, call, geminiKey), provider: 'gemini' };
    } catch (error) {
      failures.push(`gemini: ${errorMessage(error)}`);
    }
  }

  const groqKey = ctx.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const text = await callOpenAICompatible(
        ctx,
        call,
        groqKey,
        'https://api.groq.com/openai/v1/chat/completions',
        ctx.env.GROQ_MODEL || GROQ_DEFAULT_MODEL,
        'Groq',
      );
      return { text, provider: 'groq' };
    } catch (error) {
      failures.push(`groq: ${errorMessage(error)}`);
    }
  }

  const openRouterKey = ctx.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    try {
      const text = await callOpenAICompatible(
        ctx,
        call,
        openRouterKey,
        'https://openrouter.ai/api/v1/chat/completions',
        ctx.env.OPENROUTER_MODEL || OPENROUTER_DEFAULT_MODEL,
        'OpenRouter',
      );
      return { text, provider: 'openrouter' };
    } catch (error) {
      failures.push(`openrouter: ${errorMessage(error)}`);
    }
  }

  if (!failures.length) {
    throw new Error('No AI provider is configured. Set GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY.');
  }
  throw new Error(`Every AI provider failed. ${failures.join(' | ')}`);
}

function parseQuizItems(raw: string): { q: string; a: string; d: string[]; e: string }[] {
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

  const items: { q: string; a: string; d: string[]; e: string }[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const q = asString(entry.q).trim();
    const a = asString(entry.a).trim();
    if (!q || !a) continue;
    const wrong = Array.isArray(entry.d)
      ? entry.d.map((option) => asString(option).trim()).filter(Boolean)
      : [];
    if (wrong.length < 2) continue;
    items.push({ q, a, d: [wrong[0], wrong[1]], e: asString(entry.e).trim() });
  }
  return items;
}

/* ------------------------------------------------------------------ tools */

const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const READ_ONLY_REMOTE: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_courses',
    title: 'Search courses',
    description:
      'Search the Sautika curriculum. Understands spoken phrasing such as "fractions P.4" or "computers for senior three", and can be narrowed by subject and level.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the learner asked for, in their own words.' },
        subject: {
          type: 'string',
          enum: ['Science', 'Math', 'Languages', 'Social Studies', 'Digital Literacy'],
          description: 'Restrict to one subject.',
        },
        level: { type: 'string', description: 'Class name, for example "Primary 4" or "Senior 3".' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'How many courses to return (default 10).' },
      },
      required: [],
      additionalProperties: false,
    },
    outputSchema: {
      type: 'object',
      properties: {
        total: { type: 'integer' },
        courses: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              subject: { type: 'string' },
              level: { type: 'string' },
              lessons: { type: 'integer' },
              questions: { type: 'integer' },
              description: { type: 'string' },
            },
            required: ['id', 'title', 'subject', 'level', 'lessons'],
          },
        },
      },
      required: ['total', 'courses'],
    },
    annotations: READ_ONLY,
  },
  {
    name: 'get_course',
    title: 'Get a course',
    description: 'Every lesson in one course, with each question and its correct answer.',
    inputSchema: {
      type: 'object',
      properties: { course_id: { type: 'string', description: 'The course id, for example "p4-math".' } },
      required: ['course_id'],
      additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: 'get_lesson_quiz',
    title: 'Get a lesson quiz',
    description: 'The questions of one lesson, optionally translated into the learner’s language.',
    inputSchema: {
      type: 'object',
      properties: {
        course_id: { type: 'string' },
        lesson_index: { type: 'integer', minimum: 0 },
        language: { type: 'string', description: 'Sunbird language code, for example "lug".' },
      },
      required: ['course_id', 'lesson_index'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'list_languages',
    title: 'List languages',
    description: 'Every language Sautika can translate into, and which of them have a voice.',
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: 'translate_text',
    title: 'Translate text',
    description:
      'Translate between any two supported languages. Routes through Sunbird AI, Google Cloud Translation and an LLM, whichever fits the pair.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', maxLength: MAX_TEXT_CHARS },
        source_language: { type: 'string' },
        target_language: { type: 'string' },
        polish_english: { type: 'boolean', description: 'Edit an English result for grammar and fluency.' },
      },
      required: ['text', 'source_language', 'target_language'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'text_to_speech',
    title: 'Read text aloud',
    description: 'Synthesise speech with Sunbird AI and return a URL to the audio.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', maxLength: MAX_TTS_CHARS },
        language: { type: 'string', description: 'A language with a Sunbird voice, such as "lug".' },
      },
      required: ['text', 'language'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'generate_quiz',
    title: 'Generate a quiz',
    description: 'Build multiple-choice questions from notes, each with two wrong options and an explanation.',
    inputSchema: {
      type: 'object',
      properties: {
        notes: { type: 'string', maxLength: MAX_NOTES_CHARS },
        count: { type: 'integer', minimum: 1, maximum: 10 },
        language: { type: 'string' },
      },
      required: ['notes'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'summarize_notes',
    title: 'Summarise notes',
    description: 'Turn notes into a short revision summary or a study guide, in the learner’s language.',
    inputSchema: {
      type: 'object',
      properties: {
        notes: { type: 'string', maxLength: MAX_NOTES_CHARS },
        style: { type: 'string', enum: ['summary', 'study_guide'] },
        language: { type: 'string' },
      },
      required: ['notes', 'style'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'ocr_extract_text',
    title: 'Read text from an image',
    description: 'Extract text from a photo of notes, given an https URL or a data URI.',
    inputSchema: {
      type: 'object',
      properties: {
        image: { type: 'string', description: 'https:// URL or data:image/...;base64,... payload.' },
        language: { type: 'string', description: 'OCR language code, default "eng".' },
      },
      required: ['image'],
      additionalProperties: false,
    },
    annotations: READ_ONLY_REMOTE,
  },
  {
    name: 'platform_status',
    title: 'Platform status',
    description: 'Catalogue counts and which services are configured. Never returns secrets.',
    inputSchema: { type: 'object', properties: {}, required: [], additionalProperties: false },
    annotations: READ_ONLY,
  },
];

function toolDefinitions(ctx: McpContext): ToolDefinition[] {
  const disabled = new Set(ctx.disabledTools ?? []);
  const extras = (ctx.extraTools ?? []).map((tool) => tool.definition);
  return [...TOOL_DEFINITIONS, ...extras]
    .filter((tool) => !disabled.has(tool.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function runTool(
  ctx: McpContext,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  switch (name) {
    case 'search_courses':
      return searchCoursesTool(ctx, args);
    case 'get_course':
      return getCourseTool(ctx, args);
    case 'get_lesson_quiz':
      return getLessonQuizTool(ctx, args);
    case 'list_languages':
      return listLanguagesTool(ctx);
    case 'translate_text':
      return translateTool(ctx, args);
    case 'text_to_speech':
      return ttsTool(ctx, args);
    case 'generate_quiz':
      return generateQuizTool(ctx, args);
    case 'summarize_notes':
      return summarizeTool(ctx, args);
    case 'ocr_extract_text':
      return ocrTool(ctx, args);
    case 'platform_status':
      return statusTool(ctx);
    default: {
      const extra = (ctx.extraTools ?? []).find((tool) => tool.definition.name === name);
      if (extra) return extra.handler(args);
      return toolError(`Unknown tool: ${name}`);
    }
  }
}

function searchCoursesTool(ctx: McpContext, args: Record<string, unknown>): ToolResult {
  const query = asString(args.query).trim();
  const subject = asString(args.subject).trim().toLowerCase();
  const level = asString(args.level).trim().toLowerCase();
  const rawLimit = typeof args.limit === 'number' ? Math.floor(args.limit) : 10;
  const limit = Math.min(50, Math.max(1, rawLimit));

  let courses = ctx.courses.filter((course) => {
    if (subject && course.cat.toLowerCase() !== subject) return false;
    if (level && !course.level.toLowerCase().includes(level)) return false;
    return true;
  });
  if (query) courses = [...ctx.searchCourses(courses, query)];

  const found = courses.slice(0, limit).map(courseSummary);
  const structured = { total: courses.length, courses: found };
  return jsonResult(structured, structured);
}

function getCourseTool(ctx: McpContext, args: Record<string, unknown>): ToolResult {
  const id = asString(args.course_id).trim();
  if (!id) return toolError('course_id is required.');
  const course = ctx.courses.find((entry) => entry.id === id);
  if (!course) {
    return toolError(`No course with id "${id}". Use search_courses to find a valid id.`);
  }
  return jsonResult(fullCourse(course));
}

async function getLessonQuizTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const id = asString(args.course_id).trim();
  const course = ctx.courses.find((entry) => entry.id === id);
  if (!course) return toolError(`No course with id "${id}".`);

  const index = typeof args.lesson_index === 'number' ? Math.floor(args.lesson_index) : -1;
  const lesson = course.lessons[index];
  if (!lesson) {
    return toolError(`Lesson ${index} is out of range. "${course.title}" has ${course.lessons.length} lessons.`);
  }

  const language = args.language === undefined ? 'eng' : normaliseLanguage(asString(args.language));
  if (!isLanguage(ctx, language)) return toolError(`Unknown language code "${language}".`);

  const questions = lesson.items.map((item) => ({
    question: item.q,
    answer: item.a,
    distractors: item.d ? [...item.d] : [],
    blanks: item.x ? [...item.x] : [],
  }));

  if (language === 'eng') {
    return jsonResult({ course: course.title, lesson: lesson.title, language, questions });
  }

  try {
    const translated = await Promise.all(
      questions.map(async (entry) => {
        const [question, answer] = await Promise.all([
          routeTranslate(ctx, entry.question, 'eng', language, false),
          routeTranslate(ctx, entry.answer, 'eng', language, false),
        ]);
        const distractors = await Promise.all(
          entry.distractors.map(async (option) => (await routeTranslate(ctx, option, 'eng', language, false)).text),
        );
        return { question: question.text, answer: answer.text, distractors, blanks: entry.blanks };
      }),
    );
    return jsonResult({ course: course.title, lesson: lesson.title, language, questions: translated });
  } catch (error) {
    return toolError(`Could not translate this lesson: ${errorMessage(error)}`);
  }
}

function listLanguagesTool(ctx: McpContext): ToolResult {
  const languages = ctx.languages.map((language) => ({
    code: language.code,
    name: language.name,
    voice: ctx.ttsLanguages.has(language.code),
  }));
  return jsonResult({
    total: languages.length,
    withVoice: languages.filter((language) => language.voice).length,
    languages,
  });
}

async function translateTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const text = asString(args.text);
  if (!text.trim()) return toolError('text is required.');
  if (text.length > MAX_TEXT_CHARS) return toolError(`Keep text under ${MAX_TEXT_CHARS} characters.`);

  const source = normaliseLanguage(asString(args.source_language));
  const target = normaliseLanguage(asString(args.target_language));
  if (!isLanguage(ctx, source)) return toolError(`Unknown source language "${source}".`);
  if (!isLanguage(ctx, target)) return toolError(`Unknown target language "${target}".`);

  try {
    const result = await routeTranslate(ctx, text, source, target, args.polish_english === true);
    return jsonResult({
      text: result.text,
      provider: result.provider,
      polished: result.polished,
      source_language: source,
      target_language: target,
    });
  } catch (error) {
    return toolError(errorMessage(error));
  }
}

async function ttsTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const text = asString(args.text).trim();
  if (!text) return toolError('text is required.');
  if (text.length > MAX_TTS_CHARS) return toolError(`Keep text under ${MAX_TTS_CHARS} characters.`);

  const language = normaliseLanguage(asString(args.language));
  if (!isLanguage(ctx, language)) return toolError(`Unknown language code "${language}".`);
  if (!ctx.ttsLanguages.has(language)) {
    return toolError(`There is no Sunbird voice for ${languageName(ctx, language)}. Use list_languages to see which have one.`);
  }

  const key = ctx.env.SUNBIRD_API_KEY;
  if (!key) return toolError('SUNBIRD_API_KEY is not set, so speech is unavailable.');

  try {
    const response = await ctx.fetch(`${sunbirdBase(ctx)}/tasks/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ text, language, response_mode: 'url' }),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!response.ok) return toolError(`Sunbird speech failed (${response.status}).`);

    const data: unknown = await response.json();
    const audioUrl = isRecord(data) ? asString(data.audio_url) : '';
    if (!audioUrl) return toolError('Sunbird speech returned no audio URL.');
    return jsonResult({ audio_url: audioUrl, language, characters: text.length });
  } catch (error) {
    return toolError(errorMessage(error));
  }
}

async function generateQuizTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const notes = asString(args.notes).trim();
  if (!notes) return toolError('notes is required.');

  const rawCount = typeof args.count === 'number' ? Math.floor(args.count) : 5;
  const count = Math.min(10, Math.max(1, rawCount));
  const language = args.language === undefined ? 'eng' : normaliseLanguage(asString(args.language));
  if (!isLanguage(ctx, language)) return toolError(`Unknown language code "${language}".`);

  let raw: { text: string; provider: string };
  try {
    raw = await callModel(ctx, {
      systemPrompt:
        'You are Sautika, a warm tutor for East African learners. Use ONLY the notes given. Write short, simple sentences.',
      prompt:
        `Return ONLY a JSON array of ${count} objects shaped ` +
        '{"q": question, "a": correct answer in at most 6 words, "d": [wrong answer, another wrong answer], "e": one-sentence explanation}. ' +
        `Test understanding, not word recall. No text outside the array.\n\nNOTES:\n${notes.slice(0, MAX_NOTES_CHARS)}`,
      maxTokens: 1400,
      json: true,
    });
  } catch (error) {
    return toolError(errorMessage(error));
  }

  const items = parseQuizItems(raw.text).slice(0, count);
  if (items.length < 1) return toolError('The model did not return a usable quiz. Try notes with more detail.');

  if (language === 'eng') return jsonResult({ provider: raw.provider, language, items });

  try {
    const translated = await Promise.all(
      items.map(async (item) => {
        const [q, a, d0, d1, e] = await Promise.all([
          routeTranslate(ctx, item.q, 'eng', language, false),
          routeTranslate(ctx, item.a, 'eng', language, false),
          routeTranslate(ctx, item.d[0], 'eng', language, false),
          routeTranslate(ctx, item.d[1], 'eng', language, false),
          item.e ? routeTranslate(ctx, item.e, 'eng', language, false) : Promise.resolve({ text: '' }),
        ]);
        return { q: q.text, a: a.text, d: [d0.text, d1.text], e: e.text };
      }),
    );
    return jsonResult({ provider: raw.provider, language, items: translated });
  } catch {
    return jsonResult({ provider: raw.provider, language: 'eng', items, note: 'Translation failed; the English quiz is returned.' });
  }
}

async function summarizeTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const notes = asString(args.notes).trim();
  if (!notes) return toolError('notes is required.');

  const style = asString(args.style);
  if (style !== 'summary' && style !== 'study_guide') {
    return toolError('style must be "summary" or "study_guide".');
  }
  const language = args.language === undefined ? 'eng' : normaliseLanguage(asString(args.language));
  if (!isLanguage(ctx, language)) return toolError(`Unknown language code "${language}".`);

  const prompt =
    style === 'summary'
      ? 'Summarise the notes in 4 to 5 short bullet points a learner can revise from, then a line "Words to know:" with 3 key terms and a one-line definition each.'
      : 'Write a study guide in at most 250 words: the key ideas as bullets, the core terms with short explanations, and 3 practice questions each followed by its answer.';

  let raw: { text: string; provider: string };
  try {
    raw = await callModel(ctx, {
      systemPrompt: `You are Sautika, a warm tutor for East African learners. Use ONLY these notes.\n\nNOTES:\n${notes.slice(0, MAX_NOTES_CHARS)}`,
      prompt,
      maxTokens: 900,
    });
  } catch (error) {
    return toolError(errorMessage(error));
  }

  if (language === 'eng') {
    return textResult(raw.text, { text: raw.text, provider: raw.provider, language, style });
  }

  try {
    const translated = await routeTranslate(ctx, raw.text, 'eng', language, false);
    return textResult(translated.text, {
      text: translated.text,
      provider: raw.provider,
      translationProvider: translated.provider,
      language,
      style,
    });
  } catch {
    return textResult(raw.text, { text: raw.text, provider: raw.provider, language: 'eng', style });
  }
}

async function ocrTool(ctx: McpContext, args: Record<string, unknown>): Promise<ToolResult> {
  const image = asString(args.image).trim();
  if (!image) return toolError('image is required.');

  const isUrl = /^https:\/\//i.test(image);
  const isDataUri = /^data:image\/[a-z.+-]+;base64,/i.test(image);
  if (!isUrl && !isDataUri) {
    return toolError('image must be an https:// URL or a data:image/...;base64 payload.');
  }

  const key = ctx.env.OCR_SPACE_API_KEY_FALLBACK || ctx.env.OCR_SPACE_API_KEY;
  if (!key) return toolError('OCR_SPACE_API_KEY is not set, so image reading is unavailable.');

  const language = asString(args.language).trim() || 'eng';
  const form = new URLSearchParams();
  form.set(isUrl ? 'url' : 'base64Image', image);
  form.set('language', language);
  form.set('OCREngine', '2');
  form.set('scale', 'true');
  form.set('isTable', 'false');

  try {
    const response = await ctx.fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: key, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
      signal: AbortSignal.timeout(LLM_TIMEOUT_MS),
    });
    if (!response.ok) return toolError(`OCR.Space failed (${response.status}).`);

    const data: unknown = await response.json();
    if (!isRecord(data)) return toolError('OCR.Space returned an unreadable response.');
    if (data.IsErroredOnProcessing === true) {
      const detail = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(' ') : asString(data.ErrorMessage);
      return toolError(`OCR failed: ${detail || 'unknown error'}`);
    }

    const results = Array.isArray(data.ParsedResults) ? data.ParsedResults : [];
    const text = results
      .map((entry) => (isRecord(entry) ? asString(entry.ParsedText) : ''))
      .join('\n')
      .trim();
    if (!text) return toolError('No text was found in that image.');
    return textResult(text, { text, characters: text.length, language });
  } catch (error) {
    return toolError(errorMessage(error));
  }
}

function statusTool(ctx: McpContext): ToolResult {
  const lessons = ctx.courses.reduce((total, course) => total + course.lessons.length, 0);
  const questions = ctx.courses.reduce(
    (total, course) => total + course.lessons.reduce((sum, lesson) => sum + lesson.items.length, 0),
    0,
  );
  const subjects = [...new Set(ctx.courses.map((course) => course.cat))].sort();

  // Booleans only: no key, prefix or URL ever leaves the server.
  const configured = {
    sunbird: Boolean(ctx.env.SUNBIRD_API_KEY),
    googleTranslate: Boolean(ctx.env.GOOGLE_TRANSLATE_API_KEY),
    gemini: Boolean(readKey(ctx, GEMINI_KEYS)),
    groq: Boolean(ctx.env.GROQ_API_KEY),
    openRouter: Boolean(ctx.env.OPENROUTER_API_KEY),
    ocrSpace: Boolean(ctx.env.OCR_SPACE_API_KEY || ctx.env.OCR_SPACE_API_KEY_FALLBACK),
    mongodb: Boolean(ctx.env.MONGODB_URI),
    r2: Boolean(ctx.env.R2_ACCOUNT_ID && ctx.env.R2_ACCESS_KEY_ID),
    clerk: Boolean(ctx.env.CLERK_SECRET_KEY),
    mcpToken: Boolean(ctx.env.MCP_API_TOKEN),
  };

  return jsonResult({
    server: SERVER_NAME,
    version: ctx.serverVersion ?? DEFAULT_SERVER_VERSION,
    catalogue: {
      courses: ctx.courses.length,
      lessons,
      questions,
      subjects,
      languages: ctx.languages.length,
      voices: ctx.ttsLanguages.size,
    },
    configured,
    tools: toolDefinitions(ctx).map((tool) => tool.name),
  });
}

/* -------------------------------------------------------------- resources */

const RESOURCE_TEMPLATES = [
  {
    uriTemplate: 'sautika://courses/{course_id}',
    name: 'course',
    title: 'One course',
    description: 'A single course with every lesson and question.',
    mimeType: 'application/json',
  },
];

function resourceList(): Record<string, unknown>[] {
  return [
    {
      uri: 'sautika://curriculum',
      name: 'curriculum',
      title: 'Sautika curriculum',
      description: 'Every course with its subject, class and lesson count.',
      mimeType: 'application/json',
    },
    {
      uri: 'sautika://languages',
      name: 'languages',
      title: 'Supported languages',
      description: 'Every language Sautika translates, and which have a voice.',
      mimeType: 'application/json',
    },
  ];
}

function readResource(ctx: McpContext, uri: string): Record<string, unknown> | null {
  if (uri === 'sautika://curriculum') {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          courses: ctx.courses.map(courseSummary),
          total: ctx.courses.length,
        },
        null,
        2,
      ),
    };
  }

  if (uri === 'sautika://languages') {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          languages: ctx.languages.map((language) => ({
            code: language.code,
            name: language.name,
            voice: ctx.ttsLanguages.has(language.code),
          })),
        },
        null,
        2,
      ),
    };
  }

  const match = /^sautika:\/\/courses\/(.+)$/.exec(uri);
  if (match) {
    const course = ctx.courses.find((entry) => entry.id === match[1]);
    if (!course) return null;
    return { uri, mimeType: 'application/json', text: JSON.stringify(fullCourse(course), null, 2) };
  }

  return null;
}

/* ---------------------------------------------------------------- prompts */

const PROMPTS = [
  {
    name: 'lesson_plan',
    title: 'Lesson plan',
    description: 'A 40-minute lesson plan built from one Sautika course.',
    arguments: [{ name: 'course_id', description: 'The course to plan from.', required: true }],
  },
  {
    name: 'explain_in_language',
    title: 'Explain in a language',
    description: 'Explain a topic simply, in a chosen language.',
    arguments: [
      { name: 'topic', description: 'What to explain.', required: true },
      { name: 'language', description: 'Language code or name.', required: true },
      { name: 'level', description: 'Class, for example "Primary 5".', required: false },
    ],
  },
  {
    name: 'revision_session',
    title: 'Revision session',
    description: 'A 20-minute revision run through one course.',
    arguments: [{ name: 'course_id', description: 'The course to revise.', required: true }],
  },
];

function promptMessages(
  ctx: McpContext,
  name: string,
  args: Record<string, unknown>,
): { description: string; text: string } | null {
  if (name === 'lesson_plan' || name === 'revision_session') {
    const id = asString(args.course_id).trim();
    const course = ctx.courses.find((entry) => entry.id === id);
    if (!course) return null;

    const outline = course.lessons
      .map((lesson, index) => `${index + 1}. ${lesson.title} (${lesson.items.length} questions)`)
      .join('\n');
    const questions = course.lessons
      .flatMap((lesson) => lesson.items.map((item) => `- ${item.q} (answer: ${item.a})`))
      .slice(0, 12)
      .join('\n');

    if (name === 'lesson_plan') {
      return {
        description: `A 40-minute lesson plan for ${course.title}`,
        text: [
          `Write a 40-minute lesson plan for "${course.title}" (${course.level}, ${course.cat}).`,
          '',
          'Lessons in this course:',
          outline,
          '',
          'Questions you may use:',
          questions,
          '',
          'Structure the plan as:',
          '1. Learning objectives, written as what the learner will be able to do.',
          '2. A 5-minute warm-up that starts from something learners already know.',
          '3. Teaching steps with the key points and the board work.',
          '4. A group activity using Ugandan examples (markets, matooke, boda-boda fares, Lake Victoria, local crops).',
          '5. An exit check of 3 questions taken from the list above, with answers.',
          '',
          'Keep the language simple enough for a class with mixed English levels.',
        ].join('\n'),
      };
    }

    return {
      description: `A revision session for ${course.title}`,
      text: [
        `Run a 20-minute revision session for "${course.title}" (${course.level}).`,
        '',
        'Lessons:',
        outline,
        '',
        'Questions:',
        questions,
        '',
        'Start with a 3-point recap, then ask the questions one at a time, waiting for the learner before',
        'giving the answer. Explain each answer in one sentence, and finish with what to revise next.',
      ].join('\n'),
    };
  }

  if (name === 'explain_in_language') {
    const topic = asString(args.topic).trim();
    if (!topic) return null;
    const languageArg = asString(args.language).trim();
    const code = normaliseLanguage(languageArg);
    const label = isLanguage(ctx, code) ? languageName(ctx, code) : languageArg || 'English';
    const level = asString(args.level).trim();

    return {
      description: `Explain ${topic} in ${label}`,
      text: [
        `Explain "${topic}" in ${label}${level ? ` to a learner in ${level}` : ''}.`,
        '',
        'Use short sentences and everyday words. Give one example from daily life in East Africa.',
        'End with one question that checks whether the learner understood.',
        'If a term has no local word, give the English term in brackets after it.',
      ].join('\n'),
    };
  }

  return null;
}

/* ----------------------------------------------------------------- router */

function negotiateVersion(requested: unknown): string {
  const candidates = SUPPORTED_VERSIONS.filter((version) => version !== DISCOVERY_VERSION);
  const asked = typeof requested === 'string' ? requested : '';
  return candidates.includes(asked) ? asked : DEFAULT_VERSION;
}

/**
 * Handles one JSON-RPC message.
 *
 * Returns null for notifications (and for messages that cannot be answered),
 * so a transport can decide between 202 and a JSON body.
 */
export async function handleMcpMessage(
  ctx: McpContext,
  rawMessage: unknown,
): Promise<JsonRpcResponse | null> {
  if (!isRecord(rawMessage)) {
    return fail(null, INVALID_REQUEST, 'Invalid request: a JSON-RPC object is required.');
  }

  const id =
    typeof rawMessage.id === 'string' || typeof rawMessage.id === 'number' ? rawMessage.id : null;
  const isNotification = rawMessage.id === undefined || rawMessage.id === null;
  const method = asString(rawMessage.method);

  if (rawMessage.jsonrpc !== '2.0') {
    return isNotification ? null : fail(id, INVALID_REQUEST, 'jsonrpc must be "2.0".');
  }
  if (!method) {
    return isNotification ? null : fail(id, INVALID_REQUEST, 'method is required.');
  }

  const params = isRecord(rawMessage.params) ? rawMessage.params : {};
  const meta = isRecord(params._meta) ? params._meta : null;
  const requestedVersion = meta ? asString(meta[META_PROTOCOL]) : '';
  if (requestedVersion && !SUPPORTED_VERSIONS.includes(requestedVersion)) {
    if (isNotification) return null;
    return fail(
      id,
      UNSUPPORTED_VERSION_CODE,
      `Unsupported protocol version: ${requestedVersion}`,
      { supported: SUPPORTED_VERSIONS, requested: requestedVersion },
    );
  }

  // Notifications never get a reply, whether or not we know them.
  if (isNotification) return null;
  if (id === null) {
    return fail(null, INVALID_REQUEST, 'id must be a string or a number.');
  }
  const requestId: string | number = id;

  switch (method) {
    case 'server/discover':
      return ok(ctx, requestId, {
        supportedVersions: SUPPORTED_VERSIONS,
        capabilities: capabilities(),
        serverInfo: serverInfo(ctx),
        instructions: INSTRUCTIONS,
        ttlMs: TTL_MS,
        cacheScope: CACHE_SCOPE,
      });

    case 'initialize':
      return ok(ctx, requestId, {
        protocolVersion: negotiateVersion(params.protocolVersion),
        capabilities: capabilities(),
        serverInfo: serverInfo(ctx),
        instructions: INSTRUCTIONS,
      });

    case 'ping':
      return ok(ctx, requestId, {});

    case 'tools/list':
      return okCacheable(ctx, requestId, { tools: toolDefinitions(ctx) });

    case 'tools/call': {
      const name = asString(params.name);
      if (!name) return fail(requestId, INVALID_PARAMS, 'params.name is required.');
      const available = toolDefinitions(ctx).some((tool) => tool.name === name);
      if (!available) {
        return fail(requestId, INVALID_PARAMS, `Unknown tool: ${name}`, {
          available: toolDefinitions(ctx).map((tool) => tool.name),
        });
      }
      const args = isRecord(params.arguments) ? params.arguments : {};
      try {
        const result = await runTool(ctx, name, args);
        return ok(ctx, requestId, { ...result });
      } catch (error) {
        // Service failures stay inside the tool result so the model can recover.
        return ok(ctx, requestId, { ...toolError(errorMessage(error)) });
      }
    }

    case 'resources/list':
      return okCacheable(ctx, requestId, { resources: resourceList() });

    case 'resources/templates/list':
      return okCacheable(ctx, requestId, { resourceTemplates: RESOURCE_TEMPLATES });

    case 'resources/read': {
      const uri = asString(params.uri);
      if (!uri) return fail(requestId, INVALID_PARAMS, 'params.uri is required.');
      const contents = readResource(ctx, uri);
      if (!contents) return fail(requestId, INVALID_PARAMS, `Unknown resource: ${uri}`);
      return okCacheable(ctx, requestId, { contents: [contents] });
    }

    case 'prompts/list':
      return okCacheable(ctx, requestId, { prompts: PROMPTS });

    case 'prompts/get': {
      const name = asString(params.name);
      if (!name) return fail(requestId, INVALID_PARAMS, 'params.name is required.');
      if (!PROMPTS.some((prompt) => prompt.name === name)) {
        return fail(requestId, INVALID_PARAMS, `Unknown prompt: ${name}`);
      }
      const args = isRecord(params.arguments) ? params.arguments : {};
      const built = promptMessages(ctx, name, args);
      if (!built) return fail(requestId, INVALID_PARAMS, `Missing or unknown arguments for prompt "${name}".`);
      return ok(ctx, requestId, {
        description: built.description,
        messages: [{ role: 'user', content: { type: 'text', text: built.text } }],
      });
    }

    default:
      return fail(requestId, METHOD_NOT_FOUND, `Unknown method: ${method}`);
  }
}

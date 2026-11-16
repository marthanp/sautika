import { generateAIResponse } from '@/lib/llm-providers';
import { citedNumbers } from '@/lib/notebooks/citations';
import { parseQuizItems } from '@/lib/notebooks/quiz-parse';
import { numberSources, retrieve, type RetrievedChunk } from '@/lib/notebooks/retrieve';
import type { Citation } from '@/types/notebook';
import type {
  AudioOverviewPayload,
  DataTablePayload,
  DialogueLine,
  Flashcard,
  FlashcardsPayload,
  InfographicPayload,
  MindMapNode,
  MindMapPayload,
  QuizPayload,
  ReportPayload,
  Slide,
  SlideDeckPayload,
  StudioPayload,
  StudioRequest,
  VideoOverviewPayload,
} from '@/lib/studio/types';

/**
 * The Studio generators.
 *
 * Every one of them works the same way: retrieve from the sources the learner
 * ticked, ask the model in English with the passages numbered, parse the
 * result into a typed payload, and let the caller translate it afterwards.
 * English first is deliberate — grounding and citation behaviour are most
 * reliable there, and a translated output is only as good as the English it
 * came from.
 *
 * A generator never invents. If the sources do not support an output it says
 * so by returning few items rather than filling the gap.
 */

/** Passages pulled for a Studio job: more than chat, since it covers a whole source set. */
const RETRIEVE_K = 14;
const QUOTE_CHARS = 240;

export interface GenerateContext {
  chunks: RetrievedChunk[];
  block: string;
  map: Record<number, RetrievedChunk>;
}

/** What to retrieve for each output, phrased as the question it answers. */
const RETRIEVAL_QUERY: Record<string, string> = {
  report: 'the key ideas, terms and explanations in these sources',
  flashcards: 'the facts, definitions and terms worth memorising',
  quiz: 'the testable facts and their explanations',
  mind_map: 'the main topics and how they relate to each other',
  infographic: 'the most important numbers, facts and steps',
  data_table: 'the entities, dates, names and figures',
  slide_deck: 'the main points in the order they should be taught',
  audio_overview: 'the whole story these sources tell, from the beginning',
  video_overview: 'the main points in the order they should be taught',
};

export async function gather(request: StudioRequest): Promise<GenerateContext> {
  const query = RETRIEVAL_QUERY[request.type] ?? 'the key ideas in these sources';
  const { chunks } = await retrieve(
    request.userId,
    request.notebookId,
    request.sourceIds,
    request.focus ? `${request.focus}. ${query}` : query,
    RETRIEVE_K,
  );

  if (chunks.length === 0) {
    throw new Error('There is nothing readable in the sources you ticked yet.');
  }

  const { block, map } = numberSources(chunks);
  return { chunks, block, map };
}

/** Turns `[n]` markers in generated text into citations the UI can open. */
export function citationsFrom(text: string, context: GenerateContext): Citation[] {
  return citedNumbers(text, context.chunks.length).map((n) => {
    const chunk = context.map[n];
    return {
      n,
      sourceId: chunk.sourceId,
      chunkId: chunk.chunkId,
      quote: chunk.text.slice(0, QUOTE_CHARS),
    };
  });
}

const TUTOR_RULES =
  'You are Sautika, a warm tutor for learners in East Africa. ' +
  'Use ONLY the numbered sources given. Never add facts from outside them. ' +
  'Cite like [1] right after the point it supports. ' +
  'Short sentences, simple words, no preamble and no sign-off.';

async function ask(options: {
  instruction: string;
  context: GenerateContext;
  maxTokens: number;
  tier?: 'fast' | 'deep';
  json?: boolean;
}): Promise<string> {
  const result = await generateAIResponse({
    systemPrompt: TUTOR_RULES,
    prompt: `Sources:\n${options.context.block}\n\n${options.instruction}`,
    maxTokens: options.maxTokens,
    tier: options.tier ?? 'fast',
    json: options.json ?? false,
    allowHeuristic: false,
  });
  return result.text.trim();
}

/** Pulls the first JSON value out of a reply, whatever wrapping it arrived in. */
export function parseJson<T>(raw: string): T | null {
  const text = raw.replace(/```json|```/g, '');
  const openers = ['{', '['];
  for (const opener of openers) {
    const start = text.indexOf(opener);
    const end = text.lastIndexOf(opener === '{' ? '}' : ']');
    if (start === -1 || end <= start) continue;
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      // Try the other bracket style.
    }
  }
  return null;
}

function stringList(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.trim())
      .slice(0, max)
    : [];
}

// ── Reports ─────────────────────────────────────────────────────────────────

const REPORT_TEMPLATES: Record<string, { title: string; instruction: string }> = {
  study_guide: {
    title: 'Study guide',
    instruction:
      'Write a study guide in Markdown: "## Key ideas" as bullets with citations, ' +
      '"## Words to know" as term — meaning pairs, and "## Practise" with 3 questions and their answers.',
  },
  briefing: {
    title: 'Briefing',
    instruction:
      'Write a one-page briefing in Markdown: a two-sentence summary, then "## What matters" ' +
      'as 5 bullets with citations, then "## What is missing" naming anything the sources do not cover.',
  },
  revision_sheet: {
    title: 'Revision sheet',
    instruction:
      'Write a revision sheet in Markdown: "## Must remember" as short bullets with citations, ' +
      'then "## Common mistakes" as 3 bullets, then "## Quick check" with 5 one-line questions.',
  },
  explain_simply: {
    title: "Explain like I'm in P.5",
    instruction:
      'Explain these sources to a P.5 learner in Markdown. Use everyday examples from East Africa. ' +
      'Short paragraphs, one idea each. Keep the citations.',
  },
};

async function report(request: StudioRequest, context: GenerateContext): Promise<ReportPayload> {
  const template = (request.template && REPORT_TEMPLATES[request.template])
    ? (request.template as ReportPayload['template'])
    : 'study_guide';
  const chosen = REPORT_TEMPLATES[template];

  const markdown = await ask({
    instruction: chosen.instruction,
    context,
    maxTokens: 1800,
    // A report is read, not waited on: worth the deeper model.
    tier: 'deep',
  });

  if (!markdown) throw new Error('The report came back empty.');

  return {
    kind: 'report',
    template,
    title: chosen.title,
    markdown,
    citations: citationsFrom(markdown, context),
  };
}

// ── Flashcards ──────────────────────────────────────────────────────────────

async function flashcards(
  request: StudioRequest,
  context: GenerateContext,
): Promise<FlashcardsPayload> {
  const count = Math.min(20, Math.max(10, request.count ?? 12));
  const raw = await ask({
    instruction:
      `Make ${count} flashcards from the sources. Reply with JSON only: ` +
      '[{"front": "the question or term", "back": "the answer, one or two short sentences", "n": 1}]. ' +
      '"n" is the source number the card came from. No card without support in the sources.',
    context,
    maxTokens: 1600,
    json: true,
  });

  const parsed = parseJson<unknown[]>(raw) ?? [];
  const cards: Flashcard[] = [];
  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const front = typeof record.front === 'string' ? record.front.trim() : '';
    const back = typeof record.back === 'string' ? record.back.trim() : '';
    if (!front || !back) continue;
    const n = typeof record.n === 'number' && record.n >= 1 && record.n <= context.chunks.length
      ? record.n
      : undefined;
    cards.push({ front, back, ...(n ? { n } : {}) });
    if (cards.length >= count) break;
  }

  if (cards.length === 0) throw new Error('No flashcards could be made from these sources.');
  return { kind: 'flashcards', cards };
}

// ── Quiz ────────────────────────────────────────────────────────────────────

async function quiz(request: StudioRequest, context: GenerateContext): Promise<QuizPayload> {
  const count = Math.min(10, Math.max(3, request.count ?? 5));
  const difficulty = request.difficulty ?? 'normal';
  const raw = await ask({
    instruction:
      `Write a ${count}-question multiple-choice quiz at ${difficulty} difficulty. ` +
      'Reply with JSON only: [{"q": "question", "a": "correct answer", ' +
      '"d": ["wrong", "wrong"], "e": "one-sentence explanation ending with a citation like [1]"}].',
    context,
    maxTokens: 1600,
    json: true,
  });

  const questions = parseQuizItems(raw).slice(0, count);
  if (questions.length === 0) throw new Error('No quiz could be made from these sources.');

  return { kind: 'quiz', difficulty, questions };
}

// ── Mind map ────────────────────────────────────────────────────────────────

function cleanNode(value: unknown, depth = 0): MindMapNode | null {
  if (typeof value !== 'object' || value === null || depth > 3) return null;
  const record = value as Record<string, unknown>;
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  if (!label) return null;

  const children = Array.isArray(record.children)
    ? record.children
      .map((child) => cleanNode(child, depth + 1))
      .filter((child): child is MindMapNode => child !== null)
      .slice(0, 8)
    : [];

  const refs = Array.isArray(record.sourceRefs)
    ? record.sourceRefs.filter((ref): ref is number => typeof ref === 'number').slice(0, 4)
    : [];

  return {
    label: label.slice(0, 80),
    ...(children.length > 0 ? { children } : {}),
    ...(refs.length > 0 ? { sourceRefs: refs } : {}),
  };
}

async function mindMap(_request: StudioRequest, context: GenerateContext): Promise<MindMapPayload> {
  const raw = await ask({
    instruction:
      'Draw these sources as a mind map. Reply with JSON only: ' +
      '{"label": "the overall topic", "children": [{"label": "a main idea", ' +
      '"sourceRefs": [1], "children": [{"label": "a detail"}]}]}. ' +
      'At most 6 main ideas, at most 4 details each. Labels of a few words.',
    context,
    maxTokens: 1400,
    json: true,
    tier: 'deep',
  });

  const root = cleanNode(parseJson(raw));
  if (!root) throw new Error('No mind map could be made from these sources.');
  return { kind: 'mind_map', root };
}

// ── Infographic ─────────────────────────────────────────────────────────────

async function infographic(
  _request: StudioRequest,
  context: GenerateContext,
): Promise<InfographicPayload> {
  const raw = await ask({
    instruction:
      'Pick the facts worth putting on one printable page. Reply with JSON only: ' +
      '{"title": "short title", "subtitle": "one line", ' +
      '"facts": [{"label": "what it is", "value": "the number or short fact", "n": 1}], ' +
      '"steps": ["step one", "step two"]}. Between 3 and 6 facts. Leave "steps" out unless the sources describe a process.',
    context,
    maxTokens: 1000,
    json: true,
  });

  const parsed = parseJson<Record<string, unknown>>(raw);
  if (!parsed) throw new Error('No infographic could be made from these sources.');

  const facts = Array.isArray(parsed.facts)
    ? parsed.facts
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null) return null;
        const record = entry as Record<string, unknown>;
        const label = typeof record.label === 'string' ? record.label.trim() : '';
        const value = typeof record.value === 'string' ? record.value.trim() : '';
        if (!label || !value) return null;
        const n = typeof record.n === 'number' ? record.n : undefined;
        return { label, value, ...(n ? { n } : {}) };
      })
      .filter((fact): fact is { label: string; value: string; n?: number } => fact !== null)
      .slice(0, 6)
    : [];

  if (facts.length === 0) throw new Error('No facts could be pulled from these sources.');

  const steps = stringList(parsed.steps, 6);
  return {
    kind: 'infographic',
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Key facts',
    ...(typeof parsed.subtitle === 'string' && parsed.subtitle.trim()
      ? { subtitle: parsed.subtitle.trim() }
      : {}),
    facts,
    ...(steps.length > 1 ? { steps } : {}),
  };
}

// ── Data table ──────────────────────────────────────────────────────────────

async function dataTable(
  _request: StudioRequest,
  context: GenerateContext,
): Promise<DataTablePayload> {
  const raw = await ask({
    instruction:
      'Pull the facts in these sources into a table. Reply with JSON only: ' +
      '{"title": "what the table shows", "columns": ["Name", "Detail"], ' +
      '"rows": [["value", "value"]]}. Between 2 and 5 columns. Every row the same length as the columns.',
    context,
    maxTokens: 1600,
    json: true,
  });

  const parsed = parseJson<Record<string, unknown>>(raw);
  const columns = stringList(parsed?.columns, 5);
  if (!parsed || columns.length < 2) {
    throw new Error('No table could be made from these sources.');
  }

  const rows = Array.isArray(parsed.rows)
    ? parsed.rows
      .map((row) => stringList(row, columns.length))
      // A short row would misalign the table, so drop it.
      .filter((row) => row.length === columns.length)
      .slice(0, 60)
    : [];

  if (rows.length === 0) throw new Error('No rows could be pulled from these sources.');

  return {
    kind: 'data_table',
    title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : 'Facts',
    columns,
    rows,
  };
}

// ── Slides ──────────────────────────────────────────────────────────────────

function parseSlides(raw: string): { title: string; slides: Slide[] } | null {
  const parsed = parseJson<Record<string, unknown>>(raw);
  if (!parsed) return null;

  const slides = Array.isArray(parsed.slides)
    ? parsed.slides
      .map((entry) => {
        if (typeof entry !== 'object' || entry === null) return null;
        const record = entry as Record<string, unknown>;
        const title = typeof record.title === 'string' ? record.title.trim() : '';
        const bullets = stringList(record.bullets, 5);
        if (!title || bullets.length === 0) return null;
        return {
          title: title.slice(0, 90),
          bullets,
          notes: typeof record.notes === 'string' ? record.notes.trim() : '',
        };
      })
      .filter((slide): slide is Slide => slide !== null)
      .slice(0, 10)
    : [];

  if (slides.length === 0) return null;
  return {
    title: typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim()
      : slides[0].title,
    slides,
  };
}

const SLIDE_INSTRUCTION =
  'Turn these sources into 6 to 10 slides. Reply with JSON only: ' +
  '{"title": "deck title", "slides": [{"title": "slide title", ' +
  '"bullets": ["a short point [1]"], "notes": "what to say out loud"}]}. ' +
  'At most 4 bullets a slide, at most 12 words a bullet.';

async function slideDeck(
  _request: StudioRequest,
  context: GenerateContext,
): Promise<SlideDeckPayload> {
  const parsed = parseSlides(
    await ask({ instruction: SLIDE_INSTRUCTION, context, maxTokens: 2000, json: true, tier: 'deep' }),
  );
  if (!parsed) throw new Error('No slides could be made from these sources.');
  return { kind: 'slide_deck', title: parsed.title, slides: parsed.slides };
}

// ── Audio and video overviews ───────────────────────────────────────────────

function parseDialogue(raw: string, max: number): DialogueLine[] {
  const parsed = parseJson<unknown[]>(raw) ?? [];
  const lines: DialogueLine[] = [];

  for (const entry of parsed) {
    if (typeof entry !== 'object' || entry === null) continue;
    const record = entry as Record<string, unknown>;
    const speaker = record.speaker === 'student' ? 'student' : 'teacher';
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    if (!text) continue;
    lines.push({ speaker, text });
    if (lines.length >= max) break;
  }
  return lines;
}

async function audioOverview(
  request: StudioRequest,
  context: GenerateContext,
): Promise<AudioOverviewPayload> {
  const length = request.length === 'short' ? 'short' : 'standard';
  const turns = length === 'short' ? 14 : 28;

  const raw = await ask({
    instruction:
      `Write a ${length === 'short' ? 'two' : 'five'}-minute conversation that teaches these sources. ` +
      'A teacher and a student, about ' + turns + ' short turns, the student asking what a learner would ask. ' +
      'Keep the citations in the teacher\'s lines. Reply with JSON only: ' +
      '[{"speaker": "teacher", "text": "..."}, {"speaker": "student", "text": "..."}]' +
      (request.focus ? ` Focus on: ${request.focus}.` : ''),
    context,
    maxTokens: 3000,
    json: true,
    // A five-minute script over many sources is what the deep tier is for.
    tier: 'deep',
  });

  const lines = parseDialogue(raw, turns + 6);
  if (lines.length < 4) throw new Error('No audio overview could be written from these sources.');

  return {
    kind: 'audio_overview',
    title: request.focus ? `Audio overview: ${request.focus}` : 'Audio overview',
    length,
    lines,
  };
}

async function videoOverview(
  request: StudioRequest,
  context: GenerateContext,
): Promise<VideoOverviewPayload> {
  // Narrated slides: the deck carries the pictures, the dialogue the voice.
  const deck = await slideDeck(request, context);
  const lines = deck.slides.map<DialogueLine>((slide) => ({
    speaker: 'teacher',
    text: slide.notes || `${slide.title}. ${slide.bullets.join('. ')}`,
  }));

  return { kind: 'video_overview', title: deck.title, slides: deck.slides, lines };
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

/** Builds one Studio output in English. Translation happens afterwards. */
export async function generateStudio(
  request: StudioRequest,
  context?: GenerateContext,
): Promise<StudioPayload> {
  const gathered = context ?? (await gather(request));

  switch (request.type) {
    case 'report':
      return report(request, gathered);
    case 'flashcards':
      return flashcards(request, gathered);
    case 'quiz':
      return quiz(request, gathered);
    case 'mind_map':
      return mindMap(request, gathered);
    case 'infographic':
      return infographic(request, gathered);
    case 'data_table':
      return dataTable(request, gathered);
    case 'slide_deck':
      return slideDeck(request, gathered);
    case 'audio_overview':
      return audioOverview(request, gathered);
    case 'video_overview':
      return videoOverview(request, gathered);
    default:
      throw new Error('That Studio output is not available.');
  }
}

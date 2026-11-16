/**
 * Source ingestion: queued -> processing -> ready.
 *
 * The steps are extract, chunk, embed, write a source guide, mark ready. Each
 * one is a separate exported function so the Inngest pipeline (Phase 6) can
 * wrap each in `step.run()` and retry it on its own, while the inline path
 * used when Inngest is not configured calls them in order.
 *
 * Nothing here throws at the caller: a failure is recorded on the source as a
 * learner-facing message with `status: 'failed'`, so the Sources pane can show
 * a chip with a retry instead of a silent empty notebook.
 */

import { chunkPages, chunkText, type Chunk } from '@/lib/notebooks/chunk';
import { embedMany } from '@/lib/notebooks/embed';
import { extractBuffer } from '@/lib/notebooks/extract';
import { chunksCollection, notebooksCollection, sourcesCollection } from '@/lib/notebooks/schema';
import { generateAIResponse } from '@/lib/llm-providers';
import type { JobProgress, NotebookSource, SourceGuide } from '@/types/notebook';

/** How much of a source the guide prompt sees. The guide is a summary, not a copy. */
const GUIDE_INPUT_CHARS = 12_000;
/** Chunks embedded per database write, to keep single documents modest. */
const EMBED_WRITE_BATCH = 50;

export type ProgressSink = (progress: JobProgress) => void | Promise<void>;

const noProgress: ProgressSink = () => undefined;

/** A source document plus the raw text the migration or upload route stored. */
type SourceWithText = NotebookSource & { rawText?: string };

export interface IngestResult {
  sourceId: string;
  status: 'ready' | 'failed';
  chunkCount: number;
  charCount: number;
  embedded: boolean;
  error?: string;
}

/** Marks a source failed with a message a learner can act on. */
export async function failSource(sourceId: string, message: string): Promise<void> {
  const sources = await sourcesCollection();
  await sources.updateOne(
    { _id: sourceId },
    { $set: { status: 'failed', error: message.slice(0, 500), updatedAt: new Date() } },
  );
}

/**
 * Loads the text of a source: either the `rawText` already stored on it, or
 * the file it points at in R2.
 */
export async function loadSourceText(
  source: SourceWithText,
): Promise<{ text: string; pages?: { page: number; text: string }[] }> {
  if (typeof source.rawText === 'string' && source.rawText.trim()) {
    return { text: source.rawText };
  }

  if (!source.r2Key) {
    throw new Error('This source has no text and no file to read.');
  }

  const { downloadFromR2 } = await import('@/lib/r2');
  const file = await downloadFromR2(source.r2Key);
  const extracted = await extractBuffer(file.body, source.title, file.contentType);

  if (!extracted.text.trim()) {
    throw new Error('We could not read any text from this file. Try a clearer photo or a PDF with selectable text.');
  }

  return extracted.pages ? { text: extracted.text, pages: extracted.pages } : { text: extracted.text };
}

/** Splits the text, keeping page numbers when the source had pages. */
export function buildChunks(loaded: { text: string; pages?: { page: number; text: string }[] }): {
  text: string;
  chunks: Chunk[];
} {
  if (loaded.pages && loaded.pages.length > 0) return chunkPages(loaded.pages);
  return { text: loaded.text, chunks: chunkText(loaded.text) };
}

/**
 * Writes the chunks, with embeddings when they are available. Replaces any
 * chunks from a previous attempt, so a retry does not leave duplicates.
 */
export async function writeChunks(
  source: NotebookSource,
  chunks: Chunk[],
  onProgress: ProgressSink = noProgress,
): Promise<{ embedded: boolean }> {
  const collection = await chunksCollection();
  await collection.deleteMany({ sourceId: source._id });

  if (chunks.length === 0) return { embedded: false };

  let embeddings: number[][] | null = null;
  try {
    embeddings = await embedMany(chunks.map((chunk) => chunk.text), 'document');
  } catch (error) {
    // Retrieval falls back to keyword search, so this is not fatal.
    console.warn(`Embedding failed for source ${source._id}, storing chunks without vectors:`, error);
  }

  for (let index = 0; index < chunks.length; index += EMBED_WRITE_BATCH) {
    const batch = chunks.slice(index, index + EMBED_WRITE_BATCH);
    await collection.insertMany(
      batch.map((chunk, offset) => {
        const position = index + offset;
        const embedding = embeddings?.[position];
        return {
          _id: `${source._id}_${chunk.ord}`,
          sourceId: source._id,
          notebookId: source.notebookId,
          userId: source.userId,
          ord: chunk.ord,
          text: chunk.text,
          ...(chunk.page !== undefined ? { page: chunk.page } : {}),
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
          ...(embedding ? { embedding } : {}),
        };
      }),
      { ordered: false },
    );

    await onProgress({
      stage: 'embedding',
      percent: Math.round(((index + batch.length) / chunks.length) * 100),
      message: `Saved ${index + batch.length} of ${chunks.length} pieces`,
    });
  }

  return { embedded: Boolean(embeddings) };
}

function parseGuide(raw: string): SourceGuide | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const summary = typeof record.summary === 'string' ? record.summary.trim() : '';
  if (!summary) return null;

  const list = (value: unknown, max: number): string[] =>
    Array.isArray(value)
      ? value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .map((entry) => entry.trim())
        .slice(0, max)
      : [];

  return {
    summary,
    keyTopics: list(record.keyTopics, 8),
    suggestedQuestions: list(record.suggestedQuestions, 3),
  };
}

/**
 * The summary, key topics and suggested questions the Sources pane shows.
 * Returns null rather than throwing: a source without a guide is still usable.
 */
export async function buildGuide(text: string): Promise<SourceGuide | null> {
  const material = text.slice(0, GUIDE_INPUT_CHARS);
  if (material.trim().length < 120) return null;

  try {
    const result = await generateAIResponse({
      systemPrompt:
        'You are Sautika, a tutor for learners in East Africa. Read the study material and describe it. ' +
        'Use only what the material says. Reply with JSON only, no code fence, in this shape: ' +
        '{"summary": "2 to 3 short sentences", "keyTopics": ["topic", ...up to 6], ' +
        '"suggestedQuestions": ["question", "question", "question"]}. ' +
        'Write short sentences and simple words.',
      prompt: material,
      maxTokens: 700,
      temperature: 0.3,
      allowHeuristic: false,
    });
    return parseGuide(result.text);
  } catch (error) {
    console.warn('Source guide generation failed:', error);
    return null;
  }
}

/** Keeps a notebook's `sourceCount` honest after an ingest. */
async function refreshSourceCount(notebookId: string): Promise<void> {
  const [sources, notebooks] = await Promise.all([sourcesCollection(), notebooksCollection()]);
  const count = await sources.countDocuments({ notebookId });
  await notebooks.updateOne({ _id: notebookId }, { $set: { sourceCount: count, updatedAt: new Date() } });
}

/**
 * Runs the whole pipeline for one source. This is the function the Inngest
 * worker and the inline path both end up calling; the only difference is that
 * Inngest wraps each step with its own retries.
 */
export async function ingestSource(
  sourceId: string,
  onProgress: ProgressSink = noProgress,
): Promise<IngestResult> {
  const sources = await sourcesCollection();
  const source = (await sources.findOne({ _id: sourceId })) as SourceWithText | null;

  if (!source) {
    return { sourceId, status: 'failed', chunkCount: 0, charCount: 0, embedded: false, error: 'Source not found.' };
  }

  await sources.updateOne({ _id: sourceId }, { $set: { status: 'processing', updatedAt: new Date() } });
  await onProgress({ stage: 'reading', percent: 5, message: 'Reading your source' });

  try {
    const loaded = await loadSourceText(source);
    await onProgress({ stage: 'chunking', percent: 25, message: 'Splitting it into pieces' });

    const { text, chunks } = buildChunks(loaded);
    if (chunks.length === 0) {
      throw new Error('This source has no readable text.');
    }

    const { embedded } = await writeChunks(source, chunks, onProgress);

    await onProgress({ stage: 'guide', percent: 80, message: 'Writing the source guide' });
    const guide = await buildGuide(text);

    await sources.updateOne(
      { _id: sourceId },
      {
        $set: {
          status: 'ready',
          charCount: text.length,
          updatedAt: new Date(),
          ...(guide ? { guide } : {}),
        },
        // The raw text now lives in the chunks; drop the copy.
        $unset: { rawText: '', error: '' },
      },
    );

    await refreshSourceCount(source.notebookId);
    await onProgress({ stage: 'ready', percent: 100, message: 'Ready' });

    return {
      sourceId,
      status: 'ready',
      chunkCount: chunks.length,
      charCount: text.length,
      embedded,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'We could not process this source. Try adding it again.';
    await failSource(sourceId, message);
    return { sourceId, status: 'failed', chunkCount: 0, charCount: 0, embedded: false, error: message };
  }
}

/**
 * Processes a backlog of queued sources, oldest first. Used after the
 * migration and by the batch route; the per-upload path ingests one source.
 */
export async function ingestQueued(limit = 10, userId?: string): Promise<IngestResult[]> {
  const sources = await sourcesCollection();
  const filter: Record<string, unknown> = { status: 'queued' };
  if (userId) filter.userId = userId;

  const queued = await sources
    .find(filter, { projection: { _id: 1 }, sort: { createdAt: 1 }, limit })
    .toArray();

  const results: IngestResult[] = [];
  for (const source of queued) {
    results.push(await ingestSource(String(source._id)));
  }
  return results;
}

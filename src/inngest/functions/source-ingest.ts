import { inngest, sourceUploaded, sourceUrlAdded } from '@/inngest/client';
import {
  buildChunks,
  buildGuide,
  failSource,
  loadSourceText,
  writeChunks,
} from '@/lib/notebooks/ingest';
import { fetchReadableText } from '@/lib/notebooks/fetch-url';
import { notebooksCollection, sourcesCollection } from '@/lib/notebooks/schema';
import type { NotebookSource } from '@/types/notebook';

/**
 * Turning an added source into something the tutor can answer from.
 *
 * Every side effect sits inside its own `step.run`, so a retry re-runs only
 * the step that failed rather than extracting a 60-page PDF again. This is
 * also why a large source finishes here and not inside a request: the route
 * has 60 seconds, this does not.
 *
 * Concurrency is keyed on the learner, so one person uploading a folder full
 * of PDFs cannot starve everybody else.
 */

const PER_LEARNER_CONCURRENCY = 2;
/** Matched to the OCR and embedding quotas, not to our own appetite. */
const GLOBAL_THROTTLE = { limit: 20, period: '1m' as const };

type SourceWithText = NotebookSource & { rawText?: string };

async function readSource(sourceId: string): Promise<SourceWithText> {
  const sources = await sourcesCollection();
  const source = (await sources.findOne({ _id: sourceId })) as SourceWithText | null;
  if (!source) throw new Error(`Source ${sourceId} no longer exists.`);
  return source;
}

async function markProcessing(sourceId: string): Promise<void> {
  const sources = await sourcesCollection();
  await sources.updateOne(
    { _id: sourceId },
    { $set: { status: 'processing', updatedAt: new Date() } },
  );
}

async function markReady(
  source: SourceWithText,
  charCount: number,
  guide: Awaited<ReturnType<typeof buildGuide>>,
): Promise<void> {
  const [sources, notebooks] = await Promise.all([sourcesCollection(), notebooksCollection()]);
  await sources.updateOne(
    { _id: source._id },
    {
      $set: {
        status: 'ready',
        charCount,
        updatedAt: new Date(),
        ...(guide ? { guide } : {}),
      },
      $unset: { rawText: '', error: '', progress: '' },
    },
  );

  const count = await sources.countDocuments({ notebookId: source.notebookId });
  await notebooks.updateOne(
    { _id: source.notebookId },
    { $set: { sourceCount: count, updatedAt: new Date() } },
  );
}

/** A file or pasted text that has just been added. */
export const sourceIngest = inngest.createFunction(
  {
    id: 'source-ingest',
    name: 'Ingest a notebook source',
    concurrency: [{ key: 'event.data.userId', limit: PER_LEARNER_CONCURRENCY }],
    throttle: GLOBAL_THROTTLE,
    retries: 3,
    triggers: [{ event: sourceUploaded }],
    onFailure: async ({ event, error }) => {
      // Every retry is spent: tell the learner on the source itself.
      const sourceId = (event.data.event.data as { sourceId?: string }).sourceId;
      if (sourceId) {
        await failSource(
          sourceId,
          'We could not read this source. Try adding it again, or use a clearer photo.',
        );
      }
      console.error('source-ingest gave up:', error);
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data;

    /**
     * Progress is written onto the source document, which the Sources pane
     * already polls. Inngest realtime would push it instead, but it is not on
     * every plan and the brief allows polling, so this works either way.
     */
    const report = async (stage: string, percent: number, message: string): Promise<void> => {
      try {
        const sources = await sourcesCollection();
        await sources.updateOne({ _id: sourceId }, { $set: { progress: { stage, percent, message } } });
      } catch {
        // Progress is a nicety; never fail the job over it.
      }
    };

    await step.run('mark-processing', () => markProcessing(sourceId));
    await report('reading', 10, 'Reading your source');

    const loaded = await step.run('extract', async () => {
      const source = await readSource(sourceId);
      return loadSourceText(source);
    });

    await report('chunking', 35, 'Splitting it into pieces');

    const written = await step.run('chunk-and-embed', async () => {
      const source = await readSource(sourceId);
      const { text, chunks } = buildChunks(loaded);
      if (chunks.length === 0) throw new Error('This source has no readable text.');
      const { embedded } = await writeChunks(source, chunks);
      return { charCount: text.length, chunkCount: chunks.length, embedded, text };
    });

    await report('guide', 80, 'Writing the source guide');

    const guide = await step.run('source-guide', () => buildGuide(written.text));

    await step.run('mark-ready', async () => {
      const source = await readSource(sourceId);
      await markReady(source, written.charCount, guide);
    });

    await report('ready', 100, 'Ready');

    return {
      sourceId,
      chunks: written.chunkCount,
      characters: written.charCount,
      embedded: written.embedded,
    };
  },
);

/** A web page added as a source: fetch and strip it first, then the same path. */
export const sourceUrlIngest = inngest.createFunction(
  {
    id: 'source-url-ingest',
    name: 'Ingest a web page source',
    concurrency: [{ key: 'event.data.userId', limit: PER_LEARNER_CONCURRENCY }],
    throttle: GLOBAL_THROTTLE,
    retries: 2,
    triggers: [{ event: sourceUrlAdded }],
    onFailure: async ({ event }) => {
      const sourceId = (event.data.event.data as { sourceId?: string }).sourceId;
      if (sourceId) {
        await failSource(
          sourceId,
          'We could not read that page. It may need a login, or block automated readers.',
        );
      }
    },
  },
  async ({ event, step }) => {
    const { sourceId, url } = event.data;

    await step.run('mark-processing', () => markProcessing(sourceId));

    const text = await step.run('fetch-page', async () => {
      const readable = await fetchReadableText(url);
      // Stored so the shared pipeline below reads it like any pasted text.
      const sources = await sourcesCollection();
      await sources.updateOne({ _id: sourceId }, { $set: { rawText: readable } });
      return readable;
    });

    const written = await step.run('chunk-and-embed', async () => {
      const source = await readSource(sourceId);
      const { chunks } = buildChunks({ text });
      if (chunks.length === 0) throw new Error('That page had no readable text.');
      const { embedded } = await writeChunks(source, chunks);
      return { chunkCount: chunks.length, embedded };
    });

    const guide = await step.run('source-guide', () => buildGuide(text));

    await step.run('mark-ready', async () => {
      const source = await readSource(sourceId);
      await markReady(source, text.length, guide);
    });

    return { sourceId, chunks: written.chunkCount };
  },
);

import { inngest, sourceAudioUploaded, transcriptCompleted } from '@/inngest/client';
import { buildChunks, buildGuide, failSource, writeChunks } from '@/lib/notebooks/ingest';
import { notebooksCollection, sourcesCollection } from '@/lib/notebooks/schema';
import {
  acceptTranscript,
  fetchAssemblyTranscript,
  submitAssemblyJob,
} from '@/lib/speech/router';
import { downloadFromR2 } from '@/lib/r2';
import type { NotebookSource } from '@/types/notebook';

/**
 * A recording added as a source.
 *
 * Long audio does not fit in a request, so it is submitted to AssemblyAI with
 * a webhook and the function waits for the event that webhook sends. If the
 * transcript comes back as something other than confident English, Sunbird
 * gets the same audio, because it knows the local languages.
 */

const WEBHOOK_WAIT = '30m';

function webhookUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  const secret = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
  if (!base || !secret) return undefined;
  const origin = base.startsWith('http') ? base : `https://${base}`;
  return `${origin.replace(/\/+$/, '')}/api/webhooks/assemblyai?secret=${encodeURIComponent(secret)}`;
}

export const audioSourceTranscribe = inngest.createFunction(
  {
    id: 'audio-source-transcribe',
    name: 'Transcribe an audio source',
    concurrency: [{ key: 'event.data.userId', limit: 1 }],
    throttle: { limit: 10, period: '1m' },
    retries: 2,
    triggers: [{ event: sourceAudioUploaded }],
    onFailure: async ({ event }) => {
      const sourceId = (event.data.event.data as { sourceId?: string }).sourceId;
      if (sourceId) {
        await failSource(
          sourceId,
          'We could not transcribe that recording. Try again somewhere quieter.',
        );
      }
    },
  },
  async ({ event, step }) => {
    const { sourceId } = event.data;

    // Only the fields the later steps need: `step.run` serialises whatever it
    // returns, so a document would come back with its dates as strings.
    const source = await step.run('load-source', async () => {
      const sources = await sourcesCollection();
      const found = await sources.findOne({ _id: sourceId });
      if (!found) throw new Error(`Source ${sourceId} no longer exists.`);
      if (!found.r2Key) throw new Error('That recording has no file to read.');
      await sources.updateOne(
        { _id: sourceId },
        { $set: { status: 'processing', updatedAt: new Date() } },
      );
      return {
        r2Key: found.r2Key,
        notebookId: found.notebookId,
        language: found.language,
      };
    });

    // Key terms from the notebook's other sources, so subject words land.
    const keyterms = await step.run('key-terms', async () => {
      const sources = await sourcesCollection();
      const list = await sources
        .find({ notebookId: source.notebookId }, { projection: { guide: 1 } })
        .limit(50)
        .toArray();
      return Array.from(new Set(list.flatMap((entry) => entry.guide?.keyTopics ?? []))).slice(0, 60);
    });

    const hook = webhookUrl();

    const submitted = await step.run('submit-to-assemblyai', async () => {
      const file = await downloadFromR2(source.r2Key);
      const blob = new Blob([new Uint8Array(file.body)], { type: file.contentType });
      const transcriptId = await submitAssemblyJob(blob, {
        keyterms,
        ...(hook ? { webhookUrl: hook } : {}),
      });
      // The webhook arrives knowing only this id, so it has to be findable.
      const sources = await sourcesCollection();
      await sources.updateOne({ _id: sourceId }, { $set: { transcriptId } });
      return transcriptId;
    });

    let text = '';
    let accepted = false;

    if (hook) {
      // The webhook turns into this event, so the function sleeps rather than
      // burning a polling loop for a 40-minute recording.
      const done = await step.waitForEvent('await-transcript', {
        event: transcriptCompleted,
        timeout: WEBHOOK_WAIT,
        if: `async.data.transcriptId == "${submitted}"`,
      });

      if (done) {
        const result = await step.run('read-transcript', async () => {
          const key = process.env.ASSEMBLYAI_API_KEY;
          if (!key) throw new Error('AssemblyAI is not configured.');
          return fetchAssemblyTranscript(key, submitted);
        });
        text = (result.text ?? '').trim();
        accepted = acceptTranscript({
          text,
          languageCode: result.language_code,
          confidence: result.language_confidence,
        }).accept;
      }
    } else {
      // No webhook configured: poll once after a pause, which is enough for
      // the clip lengths a learner records on a phone.
      await step.sleep('let-it-run', '45s');
      const result = await step.run('poll-transcript', async () => {
        const key = process.env.ASSEMBLYAI_API_KEY;
        if (!key) throw new Error('AssemblyAI is not configured.');
        return fetchAssemblyTranscript(key, submitted);
      });
      text = (result.text ?? '').trim();
      accepted = acceptTranscript({
        text,
        languageCode: result.language_code,
        confidence: result.language_confidence,
      }).accept;
    }

    if (!accepted) {
      // Not confident English: Sunbird hears the local languages better.
      text = await step.run('fall-back-to-sunbird', async () => {
        const file = await downloadFromR2(source.r2Key);
        const blob = new Blob([new Uint8Array(file.body)], { type: file.contentType });
        const { transcribe } = await import('@/lib/speech/router');
        const result = await transcribe({
          audio: blob,
          language: source.language || 'auto',
          keyterms,
        });
        return result.text;
      });
    }

    if (!text.trim()) throw new Error('The recording produced no words.');

    const written = await step.run('chunk-and-embed', async () => {
      const sources = await sourcesCollection();
      const document = (await sources.findOne({ _id: sourceId })) as NotebookSource | null;
      if (!document) throw new Error(`Source ${sourceId} no longer exists.`);
      const { chunks } = buildChunks({ text });
      const { embedded } = await writeChunks(document, chunks);
      return { chunkCount: chunks.length, embedded };
    });

    const guide = await step.run('source-guide', () => buildGuide(text));

    await step.run('mark-ready', async () => {
      const [sources, notebooks] = await Promise.all([
        sourcesCollection(),
        notebooksCollection(),
      ]);
      await sources.updateOne(
        { _id: sourceId },
        {
          $set: {
            status: 'ready',
            charCount: text.length,
            updatedAt: new Date(),
            ...(guide ? { guide } : {}),
          },
          $unset: { error: '' },
        },
      );
      const count = await sources.countDocuments({ notebookId: source.notebookId });
      await notebooks.updateOne(
        { _id: source.notebookId },
        { $set: { sourceCount: count, updatedAt: new Date() } },
      );
    });

    return { sourceId, words: text.split(/\s+/).length, chunks: written.chunkCount };
  },
);

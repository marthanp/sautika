import { inngest, studioGenerateRequested, translateBatchRequested } from '@/inngest/client';
import { generateStudio, gather } from '@/lib/studio/generate';
import { translateStudioPayload, voicePayload } from '@/lib/studio/finish';
import { studioCollection } from '@/lib/notebooks/schema';
import type { StudioOutput } from '@/types/notebook';
import type { StudioPayload, StudioRequest } from '@/lib/studio/types';

/**
 * Building a Studio output.
 *
 * The order is deliberate: generate in English, then translate, then
 * synthesise the voice. Each is its own step, so a translation that fails does
 * not throw away the generation, and a retry does not regenerate what was
 * already produced.
 *
 * Progress is written onto the output document, which the Studio pane polls.
 */

const PER_LEARNER_CONCURRENCY = 1;

async function setProgress(
  outputId: string,
  stage: string,
  percent: number,
  message: string,
): Promise<void> {
  try {
    const studio = await studioCollection();
    await studio.updateOne(
      { _id: outputId },
      { $set: { progress: { stage, percent, message }, updatedAt: new Date() } },
    );
  } catch {
    // Progress is a nicety; never fail the job over it.
  }
}

export const studioGenerate = inngest.createFunction(
  {
    id: 'studio-generate',
    name: 'Build a Studio output',
    triggers: [{ event: studioGenerateRequested }],
    concurrency: [{ key: 'event.data.userId', limit: PER_LEARNER_CONCURRENCY }],
    // Matched to the LLM quotas rather than our own appetite.
    throttle: { limit: 12, period: '1m' },
    retries: 2,
    onFailure: async ({ event }) => {
      const outputId = (event.data.event.data as { outputId?: string }).outputId;
      if (!outputId) return;
      const studio = await studioCollection();
      await studio.updateOne(
        { _id: outputId },
        {
          $set: {
            status: 'failed',
            error: 'We could not build this. Try again, or tick different sources.',
            updatedAt: new Date(),
          },
          $unset: { progress: '' },
        },
      );
    },
  },
  async ({ event, step }) => {
    const { outputId } = event.data;

    const request = await step.run('load-request', async () => {
      const studio = await studioCollection();
      const output = (await studio.findOne({ _id: outputId })) as
        | (StudioOutput & { request?: StudioRequest })
        | null;
      if (!output) throw new Error(`Studio output ${outputId} no longer exists.`);
      if (!output.request) throw new Error('That Studio output has no request to build from.');

      await studio.updateOne(
        { _id: outputId },
        { $set: { status: 'running', updatedAt: new Date() } },
      );
      return output.request;
    });

    await setProgress(outputId, 'reading', 10, 'Reading your sources');

    const english = await step.run('generate-english', async () => {
      const context = await gather(request);
      return generateStudio(request, context) as Promise<StudioPayload>;
    });

    await setProgress(outputId, 'translating', 60, 'Putting it in your language');

    const translated = await step.run('translate', () =>
      translateStudioPayload(english as StudioPayload, request.language),
    );

    await setProgress(outputId, 'voicing', 80, 'Recording the voices');

    const voiced = await step.run('synthesise', () =>
      voicePayload(translated as StudioPayload, request.language),
    );

    await step.run('save', async () => {
      const studio = await studioCollection();
      await studio.updateOne(
        { _id: outputId },
        {
          $set: { status: 'ready', payload: voiced, updatedAt: new Date() },
          $unset: { progress: '', error: '' },
        },
      );
    });

    return { outputId, type: request.type };
  },
);

/**
 * A large translation job on its own, for a Studio output that was generated
 * in English and is being read in another language later.
 */
export const translateBatch = inngest.createFunction(
  {
    id: 'translate-batch',
    name: 'Translate a Studio output',
    triggers: [{ event: translateBatchRequested }],
    concurrency: [{ key: 'event.data.userId', limit: 1 }],
    // Sunbird's limit is the binding constraint here, not ours.
    throttle: { limit: 6, period: '1m' },
    retries: 2,
  },
  async ({ event, step }) => {
    const { outputId, targetLanguage } = event.data;

    const payload = await step.run('load', async () => {
      const studio = await studioCollection();
      const output = await studio.findOne({ _id: outputId });
      if (!output) throw new Error(`Studio output ${outputId} no longer exists.`);
      return output.payload as StudioPayload;
    });

    const translated = await step.run('translate', () =>
      translateStudioPayload(payload as StudioPayload, targetLanguage),
    );

    await step.run('save', async () => {
      const studio = await studioCollection();
      await studio.updateOne(
        { _id: outputId },
        { $set: { payload: translated, language: targetLanguage, updatedAt: new Date() } },
      );
    });

    return { outputId, language: targetLanguage };
  },
);

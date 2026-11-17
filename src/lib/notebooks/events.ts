/**
 * One seam between "something needs doing in the background" and whoever does
 * it.
 *
 * When Inngest is configured the work is handed to it: retries, concurrency
 * per learner and a 60-page PDF that outlives a serverless request. When it is
 * not, the same pipeline runs inline so a notebook still works on a bare
 * checkout with no extra accounts.
 *
 * The inline path is a fallback, not an equal: it is bounded by the route's
 * `maxDuration`, so a very large source can be left `processing` and picked up
 * later by `POST /api/sources/process`. Phase 6 fills in the Inngest side.
 */

import { ingestSource } from '@/lib/notebooks/ingest';

export type BackgroundRunner = 'inngest' | 'inline';

/** True when both Inngest keys are present. */
export function inngestConfigured(): boolean {
  return Boolean(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY);
}

export function backgroundRunner(): BackgroundRunner {
  return inngestConfigured() ? 'inngest' : 'inline';
}

/**
 * Queues a source for extraction, chunking, embedding and its guide.
 * Resolves as soon as the work is handed off, so the route can answer the
 * browser straight away.
 */
export async function requestSourceIngest(
  sourceId: string,
  userId: string,
  options: { kind?: string; url?: string } = {},
): Promise<{ runner: BackgroundRunner }> {
  if (inngestConfigured()) {
    try {
      const client = await import('@/inngest/client');

      // Each kind has its own function: a web page is fetched first, a
      // recording is transcribed first, everything else is read straight away.
      if (options.kind === 'url' && options.url) {
        await client.inngest.send(
          client.sourceUrlAdded.create({ sourceId, userId, url: options.url }),
        );
      } else if (options.kind === 'audio') {
        await client.inngest.send(client.sourceAudioUploaded.create({ sourceId, userId }));
      } else {
        await client.inngest.send(client.sourceUploaded.create({ sourceId, userId }));
      }
      return { runner: 'inngest' };
    } catch (error) {
      // A rejected event key or an unreachable Inngest would otherwise leave
      // the source sitting at `queued` for ever. Falling through to the
      // inline path means the learner still gets their source read.
      console.error('Could not hand the source to Inngest; running inline instead:', error);
    }
  }

  // Inline: start it and do not await, so the upload response is not held up.
  // Failures are recorded on the source document by ingestSource itself.
  void ingestSource(sourceId).catch((error: unknown) => {
    console.error(`Inline ingest of ${sourceId} failed:`, error);
  });
  return { runner: 'inline' };
}

/**
 * Queues a Studio output.
 *
 * Inline is a real fallback here, not a stub: the same generate → translate →
 * voice pipeline runs, just inside the request's lifetime. A long audio
 * overview can outlive that, which is what the row's `failed` status and the
 * retry button are for.
 */
export async function requestStudioGenerate(
  outputId: string,
  userId: string,
  type: string,
): Promise<{ runner: BackgroundRunner }> {
  if (inngestConfigured()) {
    try {
      const { inngest, studioGenerateRequested } = await import('@/inngest/client');
      await inngest.send(studioGenerateRequested.create({ outputId, userId, type }));
      return { runner: 'inngest' };
    } catch (error) {
      // Same reasoning as source ingestion: a queued row nobody picks up is
      // worse than a slower inline build.
      console.error('Could not hand the Studio job to Inngest; running inline instead:', error);
    }
  }

  void runStudioInline(outputId).catch((error: unknown) => {
    console.error(`Inline Studio build of ${outputId} failed:`, error);
  });
  return { runner: 'inline' };
}

/** The Inngest steps, run in order, for a deployment without Inngest. */
async function runStudioInline(outputId: string): Promise<void> {
  const { studioCollection } = await import('@/lib/notebooks/schema');
  const studio = await studioCollection();

  const output = await studio.findOne({ _id: outputId });
  const request = (output as { request?: unknown } | null)?.request;
  if (!request) throw new Error('That Studio output has no request to build from.');

  await studio.updateOne(
    { _id: outputId },
    { $set: { status: 'running', updatedAt: new Date() } },
  );

  try {
    const [{ gather, generateStudio }, { translateStudioPayload, voicePayload }] = await Promise.all([
      import('@/lib/studio/generate'),
      import('@/lib/studio/finish'),
    ]);

    const typed = request as import('@/lib/studio/types').StudioRequest;
    const context = await gather(typed);
    const english = await generateStudio(typed, context);
    const translated = await translateStudioPayload(english, typed.language);
    const voiced = await voicePayload(translated, typed.language);

    await studio.updateOne(
      { _id: outputId },
      {
        $set: { status: 'ready', payload: voiced, updatedAt: new Date() },
        $unset: { progress: '', error: '' },
      },
    );
  } catch (error) {
    const message = error instanceof Error && error.message
      ? error.message
      : 'We could not build this. Try again, or tick different sources.';
    await studio.updateOne(
      { _id: outputId },
      { $set: { status: 'failed', error: message.slice(0, 500), updatedAt: new Date() } },
    );
  }
}

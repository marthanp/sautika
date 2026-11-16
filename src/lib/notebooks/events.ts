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
): Promise<{ runner: BackgroundRunner }> {
  if (inngestConfigured()) {
    const { inngest, sourceUploaded } = await import('@/inngest/client');
    await inngest.send(sourceUploaded.create({ sourceId, userId }));
    return { runner: 'inngest' };
  }

  // Inline: start it and do not await, so the upload response is not held up.
  // Failures are recorded on the source document by ingestSource itself.
  void ingestSource(sourceId).catch((error: unknown) => {
    console.error(`Inline ingest of ${sourceId} failed:`, error);
  });
  return { runner: 'inline' };
}

/** Queues a Studio output. Phase 5 builds the generators behind this. */
export async function requestStudioGenerate(
  outputId: string,
  userId: string,
  type: string,
): Promise<{ runner: BackgroundRunner }> {
  if (inngestConfigured()) {
    const { inngest, studioGenerateRequested } = await import('@/inngest/client');
    await inngest.send(studioGenerateRequested.create({ outputId, userId, type }));
    return { runner: 'inngest' };
  }
  return { runner: 'inline' };
}

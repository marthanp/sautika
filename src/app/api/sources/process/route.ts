import type { NextRequest } from 'next/server';
import { guardUser, requireCronSecret } from '@/lib/api-guard';
import { ingestQueued, ingestSource } from '@/lib/notebooks/ingest';
import { sourcesCollection } from '@/lib/notebooks/schema';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BATCH = 5;

/**
 * Works through queued sources.
 *
 * Two callers:
 *  - a learner retrying their own failed or stuck source (`?id=`), signed in;
 *  - an operator clearing the backlog the migration left, with the backup
 *    secret in an Authorization header.
 *
 * This is the catch-up path. The normal route is Inngest (or the inline run
 * started by `POST /api/sources`), and when a very large source outlives a
 * request, this is what finishes it.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const sourceId = req.nextUrl.searchParams.get('id');

  // Operator mode: a batch across all learners.
  const secretError = requireCronSecret(req);
  if (!secretError) {
    const limit = Math.min(MAX_BATCH, Number(req.nextUrl.searchParams.get('limit') ?? MAX_BATCH) || MAX_BATCH);
    const results = sourceId ? [await ingestSource(sourceId)] : await ingestQueued(limit);
    return Response.json({ processed: results.length, results });
  }

  // Learner mode: only their own sources.
  const guard = await guardUser('sources-process', 20);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  if (sourceId) {
    const sources = await sourcesCollection();
    const source = await sources.findOne({ _id: sourceId, userId }, { projection: { _id: 1 } });
    if (!source) return Response.json({ error: 'Source not found.' }, { status: 404 });

    const result = await ingestSource(sourceId);
    return Response.json({ processed: 1, results: [result] });
  }

  const results = await ingestQueued(MAX_BATCH, userId);
  return Response.json({ processed: results.length, results });
}

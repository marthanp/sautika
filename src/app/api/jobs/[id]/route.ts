import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { sourcesCollection, studioCollection } from '@/lib/notebooks/schema';

export const runtime = 'nodejs';

/**
 * How far along a background job is.
 *
 * Inngest realtime would push this, but it is not on every plan, so progress
 * is written onto the row the job is building and read back here. One endpoint
 * covers both kinds of job: `id` is a source id or a Studio output id, and
 * only the owner can see either.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('jobs', 240);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const [sources, studio] = await Promise.all([sourcesCollection(), studioCollection()]);

  const source = (await sources.findOne(
    { _id: id, userId },
    { projection: { status: 1, error: 1, progress: 1, title: 1 } },
  )) as { status: string; error?: string; progress?: unknown; title?: string } | null;

  if (source) {
    return Response.json({
      kind: 'source',
      status: source.status,
      progress: source.progress ?? null,
      error: source.error ?? null,
      title: source.title ?? null,
    });
  }

  const output = (await studio.findOne(
    { _id: id, userId },
    { projection: { status: 1, error: 1, progress: 1, type: 1 } },
  )) as { status: string; error?: string; progress?: unknown; type?: string } | null;

  if (output) {
    return Response.json({
      kind: 'studio',
      status: output.status,
      progress: output.progress ?? null,
      error: output.error ?? null,
      type: output.type ?? null,
    });
  }

  return Response.json({ error: 'Job not found.' }, { status: 404 });
}

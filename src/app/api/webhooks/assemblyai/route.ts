import type { NextRequest } from 'next/server';
import { sourcesCollection } from '@/lib/notebooks/schema';

export const runtime = 'nodejs';

/**
 * AssemblyAI's "your transcript is done" callback.
 *
 * It turns into an Inngest event, which is what `audio-source-transcribe` is
 * waiting for, so a forty-minute recording costs one sleeping function instead
 * of a polling loop.
 *
 * The shared secret arrives as a query parameter because AssemblyAI calls a
 * plain URL with no custom headers. It is compared in constant time, and
 * nothing happens without it — this endpoint is public by necessity.
 */

function timingSafeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let index = 0; index < length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function POST(req: NextRequest): Promise<Response> {
  const expected = process.env.ASSEMBLYAI_WEBHOOK_SECRET;
  if (!expected) {
    console.error('AssemblyAI webhook called but ASSEMBLYAI_WEBHOOK_SECRET is not set.');
    return Response.json({ error: 'Not available.' }, { status: 503 });
  }

  const provided = req.nextUrl.searchParams.get('secret') ?? '';
  if (!provided || !timingSafeEqual(provided, expected)) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON body is required.' }, { status: 400 });
  }

  const payload = body as { transcript_id?: string; status?: string };
  const transcriptId = payload.transcript_id;
  if (!transcriptId) {
    return Response.json({ error: 'No transcript id.' }, { status: 400 });
  }

  // The job id is the only thing we trust from the request; everything else
  // about the source is looked up here.
  const sources = await sourcesCollection();
  const source = (await sources.findOne(
    { transcriptId },
    { projection: { userId: 1 } },
  )) as { _id: string; userId: string } | null;

  if (!source) {
    // Nothing is waiting for it: acknowledge so AssemblyAI stops retrying.
    console.warn(`AssemblyAI webhook for unknown transcript ${transcriptId}.`);
    return Response.json({ received: true });
  }

  try {
    const { inngest, transcriptCompleted } = await import('@/inngest/client');
    await inngest.send(
      transcriptCompleted.create({
        transcriptId,
        sourceId: String(source._id),
        userId: source.userId,
      }),
    );
  } catch (error) {
    console.error('Could not forward the AssemblyAI webhook to Inngest:', error);
    return Response.json({ error: 'Could not record that.' }, { status: 502 });
  }

  return Response.json({ received: true });
}

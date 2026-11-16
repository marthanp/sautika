import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { assertNotebookAccess, chunksCollection, sourcesCollection } from '@/lib/notebooks/schema';

export const runtime = 'nodejs';

/** Chunks returned in one read. A long book is paged through `?from=`. */
const PAGE_SIZE = 200;

/**
 * One source, with its chunks in order, for the reader panel.
 *
 * The chunks are the source's text: each one carries the character span it
 * came from, so the reader can render the whole source and scroll to the exact
 * passage a citation points at. Embeddings are never sent to the browser —
 * they are large and of no use there.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('source-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const sources = await sourcesCollection();
  const source = await sources.findOne({ _id: id }, { projection: { rawText: 0 } });
  if (!source) return Response.json({ error: 'Source not found.' }, { status: 404 });

  // A source is readable when its notebook is: the learner's own, or featured.
  const notebook = await assertNotebookAccess(userId, source.notebookId);
  if (!notebook) return Response.json({ error: 'Source not found.' }, { status: 404 });

  const from = Math.max(0, Number(req.nextUrl.searchParams.get('from') ?? 0) || 0);

  const chunks = await chunksCollection();
  const [list, total] = await Promise.all([
    chunks
      .find(
        { sourceId: id, ord: { $gte: from } },
        {
          projection: { embedding: 0 },
          sort: { ord: 1 },
          limit: PAGE_SIZE,
        },
      )
      .toArray(),
    chunks.countDocuments({ sourceId: id }),
  ]);

  return Response.json({
    source: {
      id: source._id,
      notebookId: source.notebookId,
      kind: source.kind,
      title: source.title,
      status: source.status,
      error: source.error,
      language: source.language,
      charCount: source.charCount,
      guide: source.guide,
      url: source.url,
      createdAt: source.createdAt,
    },
    chunks: list.map((chunk) => ({
      id: String(chunk._id),
      ord: chunk.ord,
      text: chunk.text,
      page: chunk.page,
      charStart: chunk.charStart,
      charEnd: chunk.charEnd,
    })),
    total,
    nextFrom: from + list.length < total ? from + list.length : null,
  });
}

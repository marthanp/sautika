import { chunksCollection, VECTOR_INDEX } from '@/lib/notebooks/schema';
import { embeddingsAvailable, embedQuery, EMBEDDING_DIMENSIONS } from '@/lib/notebooks/embed';
import type { SourceChunk } from '@/types/notebook';

/**
 * Finds the passages a question should be answered from.
 *
 * Two paths, and both are live:
 *  - `$vectorSearch` against the Atlas index when embeddings are configured
 *    and the index exists;
 *  - a `$text` keyword search otherwise, or when the vector stage errors
 *    (which is what Atlas does when the index has not been created yet).
 *
 * That means a notebook answers questions before anyone touches the Atlas UI,
 * and answers them better once the index is there.
 */

export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  ord: number;
  text: string;
  page?: number;
  charStart: number;
  charEnd: number;
  score: number;
}

export type RetrievalMode = 'vector' | 'keyword' | 'none';

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  mode: RetrievalMode;
}

/** Candidates Atlas scans before ranking; the docs suggest about 20x `k`. */
const CANDIDATE_MULTIPLIER = 20;

function toRetrieved(doc: SourceChunk & { score?: number }): RetrievedChunk {
  const chunk: RetrievedChunk = {
    chunkId: String(doc._id),
    sourceId: String(doc.sourceId),
    ord: doc.ord,
    text: doc.text,
    charStart: doc.charStart,
    charEnd: doc.charEnd,
    score: doc.score ?? 0,
  };
  if (doc.page !== undefined) chunk.page = doc.page;
  return chunk;
}

async function vectorSearch(
  userId: string,
  notebookId: string,
  sourceIds: string[],
  embedding: number[],
  k: number,
): Promise<RetrievedChunk[]> {
  const chunks = await chunksCollection();

  const filter: Record<string, unknown> = { userId, notebookId };
  if (sourceIds.length > 0) filter.sourceId = { $in: sourceIds };

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: 'embedding',
        queryVector: embedding,
        numCandidates: Math.max(k * CANDIDATE_MULTIPLIER, 100),
        limit: k,
        filter,
      },
    },
    {
      $project: {
        sourceId: 1,
        ord: 1,
        text: 1,
        page: 1,
        charStart: 1,
        charEnd: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const docs = await chunks.aggregate<SourceChunk & { score?: number }>(pipeline).toArray();
  return docs.map(toRetrieved);
}

async function keywordSearch(
  userId: string,
  notebookId: string,
  sourceIds: string[],
  query: string,
  k: number,
): Promise<RetrievedChunk[]> {
  const chunks = await chunksCollection();

  const filter: Record<string, unknown> = {
    userId,
    notebookId,
    $text: { $search: query },
  };
  if (sourceIds.length > 0) filter.sourceId = { $in: sourceIds };

  try {
    const docs = await chunks
      .find(filter, {
        projection: {
          sourceId: 1,
          ord: 1,
          text: 1,
          page: 1,
          charStart: 1,
          charEnd: 1,
          score: { $meta: 'textScore' },
        },
        sort: { score: { $meta: 'textScore' } },
        limit: k,
      })
      .toArray();
    if (docs.length > 0) return (docs as (SourceChunk & { score?: number })[]).map(toRetrieved);
  } catch (error) {
    // No text index yet, or a query the index cannot parse.
    console.warn('Keyword retrieval failed, falling back to the first chunks:', error);
  }

  // Last resort: the opening chunks of the selected sources. A grounded answer
  // from the start of a source beats "I could not find anything".
  const opening: Record<string, unknown> = { userId, notebookId };
  if (sourceIds.length > 0) opening.sourceId = { $in: sourceIds };
  const docs = await chunks
    .find(opening, {
      projection: { sourceId: 1, ord: 1, text: 1, page: 1, charStart: 1, charEnd: 1 },
      sort: { sourceId: 1, ord: 1 },
      limit: k,
    })
    .toArray();
  return docs.map(toRetrieved);
}

/**
 * Top `k` passages for `query`, restricted to this user's notebook and, when
 * `sourceIds` is given, to the sources the learner has ticked.
 */
export async function retrieve(
  userId: string,
  notebookId: string,
  sourceIds: string[],
  query: string,
  k = 8,
): Promise<RetrievalResult> {
  const trimmed = query.trim();
  if (!trimmed) return { chunks: [], mode: 'none' };

  if (embeddingsAvailable()) {
    try {
      const embedding = await embedQuery(trimmed);
      if (embedding && embedding.length === EMBEDDING_DIMENSIONS) {
        const chunks = await vectorSearch(userId, notebookId, sourceIds, embedding, k);
        if (chunks.length > 0) return { chunks, mode: 'vector' };
      }
    } catch (error) {
      // The usual cause is an Atlas index that has not been created yet.
      console.warn('Vector retrieval unavailable, using keyword search:', error);
    }
  }

  const chunks = await keywordSearch(userId, notebookId, sourceIds, trimmed, k);
  return { chunks, mode: chunks.length > 0 ? 'keyword' : 'none' };
}

/**
 * Numbers the retrieved passages for the prompt and gives back the mapping the
 * citation parser needs to turn `[n]` into a chunk.
 */
export function numberSources(chunks: RetrievedChunk[]): {
  block: string;
  map: Record<number, RetrievedChunk>;
} {
  const map: Record<number, RetrievedChunk> = {};
  const lines: string[] = [];

  chunks.forEach((chunk, index) => {
    const n = index + 1;
    map[n] = chunk;
    const where = chunk.page !== undefined ? ` (page ${chunk.page})` : '';
    lines.push(`[${n}]${where} ${chunk.text}`);
  });

  return { block: lines.join('\n\n'), map };
}

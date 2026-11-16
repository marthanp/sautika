/**
 * Embeddings for retrieval.
 *
 * Default provider is Gemini, using the `GEMINI_API_KEY` the project already
 * has. `EMBEDDING_PROVIDER=none` turns embeddings off, and every caller is
 * written to cope with that: retrieval falls back to keyword search, so a
 * notebook still answers questions without a vector index.
 *
 * Model and endpoint checked against aistudio.google.com/docs/embeddings
 * (November 2026): `gemini-embedding-2` is current, dimensionality is flexible
 * from 128 to 3072 with 3072 the default, and `task_type` is not supported on
 * that model, so the task goes in the text as a prefix.
 */

export type EmbeddingProvider = 'gemini' | 'none';

/**
 * One constant, and it must match `database/vector-index.json` and the Atlas
 * index itself. 768 keeps the stored vectors a quarter of the default size,
 * which matters for a free or shared Atlas tier.
 */
export const EMBEDDING_DIMENSIONS = 768;

const GEMINI_MODEL = process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-2';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Requests per batch call. Keeps a single call well inside the payload limit. */
const BATCH_SIZE = 50;
const TIMEOUT_MS = 30_000;

export function embeddingProvider(): EmbeddingProvider {
  const configured = (process.env.EMBEDDING_PROVIDER ?? 'gemini').trim().toLowerCase();
  if (configured === 'none') return 'none';
  if (configured === 'gemini' && geminiKey()) return 'gemini';
  // Anything unknown, or Gemini without a key, means no embeddings.
  return 'none';
}

/** True when retrieval can use vectors at all. */
export function embeddingsAvailable(): boolean {
  return embeddingProvider() !== 'none';
}

function geminiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
}

/**
 * Gemini's shorter embeddings are truncated from the full vector, so they need
 * normalising before a cosine comparison.
 */
function normalise(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const length = Math.sqrt(sum);
  if (!length || !Number.isFinite(length)) return vector;
  return vector.map((value) => value / length);
}

/** `gemini-embedding-2` takes the task as a prefix instead of a `task_type`. */
function withTask(text: string, task: 'document' | 'query'): string {
  return task === 'query'
    ? `task: search result | query: ${text}`
    : `task: search result | document: ${text}`;
}

async function geminiBatch(texts: string[], task: 'document' | 'query'): Promise<number[][]> {
  const key = geminiKey();
  if (!key) throw new Error('Gemini embeddings are not configured.');

  const response = await fetch(
    `${GEMINI_BASE}/${GEMINI_MODEL}:batchEmbedContents?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${GEMINI_MODEL}`,
          content: { parts: [{ text: withTask(text, task) }] },
          output_dimensionality: EMBEDDING_DIMENSIONS,
        })),
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );

  if (!response.ok) {
    // The key must never reach a log or a response body.
    throw new Error(`Gemini embeddings responded with status ${response.status}.`);
  }

  const data = (await response.json()) as { embeddings?: { values?: number[] }[] };
  const embeddings = data.embeddings ?? [];
  if (embeddings.length !== texts.length) {
    throw new Error(`Gemini returned ${embeddings.length} embeddings for ${texts.length} texts.`);
  }

  return embeddings.map((embedding, index) => {
    const values = embedding.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Gemini returned an empty embedding at position ${index}.`);
    }
    return normalise(values);
  });
}

/**
 * Embeds many texts, in batches. Returns null when embeddings are switched
 * off or unavailable, which tells the caller to use keyword retrieval.
 */
export async function embedMany(
  texts: string[],
  task: 'document' | 'query' = 'document',
): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  if (embeddingProvider() === 'none') return null;

  const out: number[][] = [];
  for (let index = 0; index < texts.length; index += BATCH_SIZE) {
    const batch = texts.slice(index, index + BATCH_SIZE);
    out.push(...(await geminiBatch(batch, task)));
  }
  return out;
}

/** Embeds one query. Returns null when embeddings are unavailable. */
export async function embedQuery(text: string): Promise<number[] | null> {
  const result = await embedMany([text], 'query');
  return result?.[0] ?? null;
}

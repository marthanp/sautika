import type { Collection } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

/**
 * Fixed-window rate limiting backed by MongoDB, so the ceiling is the same no
 * matter how many serverless instances Vercel starts. One document per window
 * per key, incremented atomically; expired documents are removed by a TTL
 * index rather than by us.
 *
 * The module-level limiter this replaces counted per instance, which meant the
 * real ceiling was `limit x instances` and was easy to get around.
 */

interface RateLimitDoc {
  _id: string;
  count: number;
  expiresAt: Date;
}

export interface RateLimitResult {
  /** False when the caller has used up the window. */
  allowed: boolean;
  /** Requests used inside the current window, including this one. */
  count: number;
  /** Seconds until the window resets, for the `Retry-After` header. */
  retryAfterSeconds: number;
}

let indexReady: Promise<void> | null = null;

async function collection(): Promise<Collection<RateLimitDoc>> {
  const database = await getDatabase();
  const rateLimits = database.collection<RateLimitDoc>('rate_limits');

  // Create the TTL index once per process; Mongo ignores a repeat definition.
  if (!indexReady) {
    indexReady = rateLimits
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'rate_limits_ttl' })
      .then(() => undefined)
      .catch((error: unknown) => {
        // A missing index only costs us stale documents, so do not fail the request.
        console.warn('rate_limits TTL index could not be created:', error);
        indexReady = null;
      });
  }
  await indexReady;

  return rateLimits;
}

/** The window a timestamp falls in, so every instance agrees on the boundary. */
export function windowKey(key: string, windowMs: number, now = Date.now()): string {
  const window = Math.floor(now / windowMs);
  return `${key}:${window}`;
}

/**
 * Counts one request against `key` and says whether it is allowed.
 *
 * Fails open: if Mongo is unreachable the request goes through, because a
 * learner should not be locked out of the app by a database hiccup.
 */
export async function consume(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  const windowEnd = (Math.floor(now / windowMs) + 1) * windowMs;
  const retryAfterSeconds = Math.max(1, Math.ceil((windowEnd - now) / 1000));

  try {
    const rateLimits = await collection();
    const doc = await rateLimits.findOneAndUpdate(
      { _id: windowKey(key, windowMs, now) },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowEnd) },
      },
      { upsert: true, returnDocument: 'after', projection: { count: 1 } },
    );

    const count = doc?.count ?? 1;
    return { allowed: count <= limit, count, retryAfterSeconds };
  } catch (error) {
    console.warn('Rate limit check skipped:', error);
    return { allowed: true, count: 0, retryAfterSeconds };
  }
}

/** The 429 the API routes send, with the same wording as before. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: 'You are going a little fast. Wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}

/** Convenience wrapper: returns a ready-to-send 429, or null when allowed. */
export async function enforce(key: string, limit: number, windowMs: number): Promise<Response | null> {
  const result = await consume(key, limit, windowMs);
  return result.allowed ? null : tooManyRequests(result.retryAfterSeconds);
}

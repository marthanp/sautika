import type { Collection } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

/**
 * A small shared key/value cache in MongoDB with a TTL index.
 *
 * It sits under the per-instance in-memory caches: an instance that has never
 * seen a key can still get a hit that another instance paid for, which is what
 * the in-memory-only translation cache could not do. Every call fails soft, so
 * a cache problem never becomes a request failure.
 */

interface CacheDoc<T> {
  _id: string;
  value: T;
  expiresAt: Date;
}

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

let indexReady: Promise<void> | null = null;

async function collection<T>(): Promise<Collection<CacheDoc<T>>> {
  const database = await getDatabase();
  const cache = database.collection<CacheDoc<T>>('kv_cache');

  if (!indexReady) {
    indexReady = cache
      .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'kv_cache_ttl' })
      .then(() => undefined)
      .catch((error: unknown) => {
        console.warn('kv_cache TTL index could not be created:', error);
        indexReady = null;
      });
  }
  await indexReady;

  return cache;
}

/** Returns the cached value, or null on a miss, an expiry or any failure. */
export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const cache = await collection<T>();
    const doc = await cache.findOne({ _id: key });
    if (!doc) return null;
    // Mongo's TTL sweep runs about once a minute, so check the date ourselves.
    if (doc.expiresAt.getTime() <= Date.now()) return null;
    return doc.value;
  } catch (error) {
    console.warn('kv_cache read skipped:', error);
    return null;
  }
}

/** Stores a value. Resolves even when the write fails. */
export async function kvSet<T>(key: string, value: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  try {
    const cache = await collection<T>();
    await cache.updateOne(
      { _id: key },
      { $set: { value, expiresAt: new Date(Date.now() + ttlMs) } },
      { upsert: true },
    );
  } catch (error) {
    console.warn('kv_cache write skipped:', error);
  }
}

/** Removes one key. Used by the circuit breaker in the LLM router. */
export async function kvDelete(key: string): Promise<void> {
  try {
    const cache = await collection<unknown>();
    await cache.deleteOne({ _id: key });
  } catch (error) {
    console.warn('kv_cache delete skipped:', error);
  }
}

/** A stable cache key from parts that may contain long or odd text. */
export function kvKey(namespace: string, ...parts: string[]): string {
  const raw = parts.join('|');
  if (raw.length <= 200) return `${namespace}:${raw}`;
  // Long inputs (a page of text to translate) are hashed so the key stays small.
  let hash = 0x811c9dc5;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${namespace}:${raw.length}:${(hash >>> 0).toString(36)}`;
}

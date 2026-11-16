import { auth } from '@clerk/nextjs/server';

export type Guarded<T> = { ok: true; value: T } | { ok: false; response: Response };

/**
 * Requires a signed-in Clerk session.
 * Returns the Clerk user id, or a ready-to-send 401 response.
 */
export async function requireUser(): Promise<Guarded<string>> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: Response.json({ error: 'Please sign in to use this feature.' }, { status: 401 }),
    };
  }
  return { ok: true, value: userId };
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Fixed-window rate limiter held in a module-level Map.
 *
 * This counts requests per serverless instance, so the effective ceiling on a
 * platform that runs several instances is `limit x instances`. It is enough to
 * stop a single client draining the Sunbird, OCR and LLM quotas, but it is not
 * a cluster-wide guarantee. Move this to Upstash Redis or Vercel KV (a shared
 * INCR with an expiry) once traffic justifies it.
 */
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function rateLimit(key: string, limit: number, windowMs: number): Response | null {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  existing.count += 1;
  if (existing.count <= limit) return null;

  const retryAfter = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return Response.json(
    { error: 'You are going a little fast. Wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } },
  );
}

/** Best-effort client IP from the proxy headers Vercel sets. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Sign-in check plus a per-user fixed-window rate limit. */
export async function guardUser(
  scope: string,
  limit: number,
  windowMs = 60_000,
): Promise<Guarded<string>> {
  const user = await requireUser();
  if (!user.ok) return user;

  const limited = rateLimit(`${scope}:${user.value}`, limit, windowMs);
  if (limited) return { ok: false, response: limited };

  return user;
}

function timingSafeEqual(a: string, b: string): boolean {
  // Compare over a fixed length so the loop count does not leak the secret's size.
  const length = Math.max(a.length, b.length);
  let mismatch = a.length === b.length ? 0 : 1;
  for (let i = 0; i < length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Guards the backup endpoints. Accepts `Authorization: Bearer <SYNC_SECRET or CRON_SECRET>`.
 * Returns null when the caller is allowed through.
 */
export function requireCronSecret(req: Request): Response | null {
  const secrets = [process.env.SYNC_SECRET, process.env.CRON_SECRET].filter(
    (secret): secret is string => typeof secret === 'string' && secret.length > 0,
  );

  if (secrets.length === 0) {
    return Response.json(
      { error: 'Backup sync is not configured. Set SYNC_SECRET or CRON_SECRET.' },
      { status: 503 },
    );
  }

  const header = req.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  // `some` short-circuits, but each comparison itself is constant-time.
  const allowed = token.length > 0 && secrets.some((secret) => timingSafeEqual(token, secret));
  if (!allowed) {
    return Response.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  return null;
}

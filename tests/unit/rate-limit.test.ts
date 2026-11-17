import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * A stand-in for the `rate_limits` collection: just enough of
 * findOneAndUpdate's upsert/$inc behaviour to exercise the limiter.
 */
const store = new Map<string, { count: number; expiresAt: Date }>();
let failNextRead = false;

const collection = {
  createIndex: vi.fn(async () => 'rate_limits_ttl'),
  findOneAndUpdate: vi.fn(
    async (
      filter: { _id: string },
      update: { $inc: { count: number }; $setOnInsert: { expiresAt: Date } },
      options: { upsert?: boolean },
    ) => {
      if (failNextRead) throw new Error('connection timed out');
      const existing = store.get(filter._id);
      if (!existing) {
        if (!options.upsert) return null;
        const created = { count: update.$inc.count, expiresAt: update.$setOnInsert.expiresAt };
        store.set(filter._id, created);
        return created;
      }
      existing.count += update.$inc.count;
      return existing;
    },
  ),
};

vi.mock('@/lib/mongodb', () => ({
  getDatabase: async () => {
    if (failNextRead) throw new Error('connection timed out');
    return { collection: () => collection };
  },
  getMongoClient: async () => {
    throw new Error('not used in this test');
  },
}));

const { consume, enforce, tooManyRequests, windowKey } = await import('@/lib/rate-limit');

describe('windowKey', () => {
  it('keeps one key for the whole window', () => {
    expect(windowKey('stt:user-1', 60_000, 1_000)).toBe(windowKey('stt:user-1', 60_000, 59_999));
  });

  it('changes key at the window boundary', () => {
    expect(windowKey('stt:user-1', 60_000, 59_999)).not.toBe(windowKey('stt:user-1', 60_000, 60_000));
  });

  it('keeps separate keys per caller', () => {
    expect(windowKey('stt:user-1', 60_000, 0)).not.toBe(windowKey('stt:user-2', 60_000, 0));
  });
});

describe('consume', () => {
  beforeEach(() => {
    store.clear();
    failNextRead = false;
  });

  it('allows requests up to the limit and blocks the next one', async () => {
    const results = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      results.push(await consume('tts:user-1', 3, 60_000, 1_000));
    }
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results.map((result) => result.count)).toEqual([1, 2, 3, 4]);
  });

  it('counts each caller separately', async () => {
    await consume('tts:user-1', 1, 60_000, 1_000);
    const other = await consume('tts:user-2', 1, 60_000, 1_000);
    expect(other.allowed).toBe(true);
  });

  it('starts a fresh count in the next window', async () => {
    await consume('ocr:user-1', 1, 60_000, 1_000);
    const blocked = await consume('ocr:user-1', 1, 60_000, 2_000);
    expect(blocked.allowed).toBe(false);

    const nextWindow = await consume('ocr:user-1', 1, 60_000, 61_000);
    expect(nextWindow.allowed).toBe(true);
    expect(nextWindow.count).toBe(1);
  });

  it('reports the seconds left until the window resets', async () => {
    const result = await consume('ocr:user-1', 5, 60_000, 30_000);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it('never reports a retry of zero seconds', async () => {
    const result = await consume('ocr:user-1', 5, 60_000, 59_999);
    expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('fails open when the database is unreachable', async () => {
    failNextRead = true;
    const result = await consume('notebook:user-1', 1, 60_000, 1_000);
    expect(result.allowed).toBe(true);
  });
});

describe('enforce', () => {
  beforeEach(() => {
    store.clear();
    failNextRead = false;
  });

  it('returns null while the caller is inside the limit', async () => {
    expect(await enforce('mcp:anon:1.2.3.4', 2, 60_000)).toBeNull();
  });

  it('returns a 429 with Retry-After once the limit is passed', async () => {
    await enforce('mcp:anon:5.6.7.8', 1, 60_000);
    const response = await enforce('mcp:anon:5.6.7.8', 1, 60_000);
    expect(response?.status).toBe(429);
    expect(Number(response?.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});

describe('tooManyRequests', () => {
  it('speaks to the learner, not about the quota', async () => {
    const body = (await tooManyRequests(12).json()) as { error: string };
    expect(body.error).toBe('You are going a little fast. Wait a moment and try again.');
  });
});

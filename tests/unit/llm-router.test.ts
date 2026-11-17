import { describe, expect, it, vi } from 'vitest';

/**
 * The router's job is to never let a request run past its route's time limit,
 * to prefer the right provider per tier, and to hedge when the leader is
 * slow. These tests cover the budget arithmetic and the ordering; the
 * streaming paths themselves are exercised by the chat-stream tests.
 */

vi.mock('@/lib/kv-cache', () => ({
  kvGet: vi.fn(async () => null),
  kvSet: vi.fn(async () => undefined),
  kvDelete: vi.fn(async () => undefined),
  kvKey: (namespace: string, ...parts: string[]) => `${namespace}:${parts.join('|')}`,
}));

const { Budget, orderFor, hedgeMs, budgetMs } = await import('@/lib/llm/router');
import type { StreamProvider } from '@/lib/llm/types';

function fake(name: string, configured = true): StreamProvider {
  return { name, configured: () => configured, open: async () => null };
}

describe('Budget', () => {
  it('gives an attempt the per-provider ceiling when there is plenty left', () => {
    const budget = new Budget(50_000, 1_000);
    expect(budget.forAttempt(25_000, 1_000)).toBe(25_000);
  });

  it('shrinks the last attempt to what the budget still allows', () => {
    const budget = new Budget(50_000, 0);
    // 40 s gone, so 10 s left: an attempt gets 10 s, not the 25 s ceiling.
    expect(budget.forAttempt(25_000, 40_000)).toBe(10_000);
  });

  it('refuses an attempt that could not say anything useful', () => {
    const budget = new Budget(50_000, 0);
    expect(budget.forAttempt(25_000, 49_500)).toBeNull();
  });

  it('reports the time left and when it has run out', () => {
    const budget = new Budget(10_000, 0);
    expect(budget.remaining(4_000)).toBe(6_000);
    expect(budget.expired(9_999)).toBe(false);
    expect(budget.expired(10_000)).toBe(true);
    expect(budget.remaining(99_999)).toBe(0);
  });

  it('never hands out more than the budget, however high the ceiling', () => {
    const budget = new Budget(5_000, 0);
    expect(budget.forAttempt(60_000, 0)).toBe(5_000);
  });

  /**
   * This is the bug the budget exists to prevent: two providers at 25 s each
   * against a route that dies at 60 s, so the fallbacks never ran.
   */
  it('keeps two slow attempts inside a 60 second route', () => {
    const budget = new Budget(50_000, 0);
    const first = budget.forAttempt(25_000, 0) ?? 0;
    const second = budget.forAttempt(25_000, first) ?? 0;
    expect(first + second).toBeLessThanOrEqual(50_000);
  });
});

describe('orderFor', () => {
  const providers = [
    fake('Anthropic Claude'),
    fake('Google Gemini'),
    fake('Groq'),
    fake('OpenRouter'),
  ];

  it('leads the fast tier with Anthropic, then Groq', () => {
    const order = orderFor('fast', providers).map((provider) => provider.name);
    expect(order.slice(0, 2)).toEqual(['Anthropic Claude', 'Groq']);
  });

  it('leads the deep tier with Anthropic, then Gemini', () => {
    const order = orderFor('deep', providers).map((provider) => provider.name);
    expect(order.slice(0, 2)).toEqual(['Anthropic Claude', 'Google Gemini']);
  });

  it('still includes providers the preference list does not name', () => {
    const order = orderFor('fast', providers).map((provider) => provider.name);
    expect(order).toContain('OpenRouter');
    expect(order).toHaveLength(providers.length);
  });

  it('leaves out a provider with no key', () => {
    const order = orderFor('fast', [...providers, fake('Mistral', false)]).map(
      (provider) => provider.name,
    );
    expect(order).not.toContain('Mistral');
  });

  it('honours an explicit order from the environment', () => {
    vi.stubEnv('LLM_ORDER_FAST', 'Groq, Google Gemini');
    try {
      const order = orderFor('fast', providers).map((provider) => provider.name);
      expect(order.slice(0, 2)).toEqual(['Groq', 'Google Gemini']);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ignores a name in the environment that is not configured', () => {
    vi.stubEnv('LLM_ORDER_FAST', 'Nonexistent, Groq');
    try {
      const order = orderFor('fast', providers).map((provider) => provider.name);
      expect(order[0]).toBe('Groq');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns nothing when no provider has a key', () => {
    expect(orderFor('fast', [fake('Groq', false)])).toEqual([]);
  });
});

describe('tuning knobs', () => {
  it('uses the documented defaults', () => {
    expect(hedgeMs()).toBe(2500);
    expect(budgetMs()).toBe(50_000);
  });

  it('reads overrides from the environment', () => {
    vi.stubEnv('LLM_HEDGE_MS', '800');
    vi.stubEnv('LLM_TOTAL_BUDGET_MS', '20000');
    try {
      expect(hedgeMs()).toBe(800);
      expect(budgetMs()).toBe(20_000);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('ignores a nonsense override rather than hanging on zero', () => {
    vi.stubEnv('LLM_HEDGE_MS', 'soon');
    vi.stubEnv('LLM_TOTAL_BUDGET_MS', '-5');
    try {
      expect(hedgeMs()).toBe(2500);
      expect(budgetMs()).toBe(50_000);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

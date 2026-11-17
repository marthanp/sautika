import { generateAIResponse } from '@/lib/llm-providers';
import { kvGet, kvSet } from '@/lib/kv-cache';
import { anthropicProvider } from '@/lib/llm/providers/anthropic';
import { geminiProvider } from '@/lib/llm/providers/gemini';
import { openAICompatibleProviders } from '@/lib/llm/providers/openai-compatible';
import type { StreamOptions, StreamProvider, TextStream, Tier } from '@/lib/llm/types';

/**
 * The LLM router.
 *
 * Adding a provider to the end of a sequential chain does not make anything
 * faster, so speed here comes from four things that are not "another key":
 *
 *  1. **Tier order.** `fast` leads with Anthropic's fast model then Groq;
 *     `deep` leads with Anthropic's deep model then Gemini. `LLM_ORDER_FAST`
 *     and `LLM_ORDER_DEEP` override both.
 *  2. **Hedging.** If the leader has not produced a token within
 *     `LLM_HEDGE_MS`, the next provider starts in parallel and whichever
 *     speaks first wins; the loser is aborted.
 *  3. **A global budget.** Every attempt gets
 *     `min(perProviderTimeout, budget remaining)`, so a route cannot run past
 *     its `maxDuration` and return a 504 before the fallbacks have had a turn.
 *     This is the bug that used to kill slow requests: two providers at 25 s
 *     each against a 60 s route.
 *  4. **A circuit breaker.** A provider that answers 429 or 5xx is skipped for
 *     60 seconds, recorded in the shared cache so every instance agrees.
 */

const DEFAULT_HEDGE_MS = 2500;
const DEFAULT_BUDGET_MS = 50_000;
/** No single attempt gets more than this, however much budget is left. */
const PER_ATTEMPT_CEILING_MS = 25_000;
const BREAKER_SECONDS = 60;
/** Leave enough budget that a last attempt can actually say something. */
const MIN_ATTEMPT_MS = 1500;

function envNumber(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

export function hedgeMs(): number {
  return envNumber('LLM_HEDGE_MS', DEFAULT_HEDGE_MS);
}

export function budgetMs(): number {
  return envNumber('LLM_TOTAL_BUDGET_MS', DEFAULT_BUDGET_MS);
}

/** Every provider the router knows, by name. */
function allProviders(): StreamProvider[] {
  return [anthropicProvider, geminiProvider, ...openAICompatibleProviders];
}

const DEFAULT_FAST_ORDER = ['Anthropic Claude', 'Groq', 'Google Gemini'];
const DEFAULT_DEEP_ORDER = ['Anthropic Claude', 'Google Gemini', 'OpenRouter'];

function envOrder(tier: Tier): string[] | null {
  const raw = process.env[tier === 'deep' ? 'LLM_ORDER_DEEP' : 'LLM_ORDER_FAST'];
  if (!raw) return null;
  const names = raw.split(',').map((part) => part.trim()).filter(Boolean);
  return names.length > 0 ? names : null;
}

/**
 * The providers to try, in order: the tier's leaders first, then everything
 * else that has a key, so a provider is never unreachable just because it is
 * not named in the preference list.
 */
export function orderFor(tier: Tier, providers = allProviders()): StreamProvider[] {
  const preferred = envOrder(tier) ?? (tier === 'deep' ? DEFAULT_DEEP_ORDER : DEFAULT_FAST_ORDER);
  const configured = providers.filter((provider) => provider.configured());

  const ranked: StreamProvider[] = [];
  for (const name of preferred) {
    const match = configured.find(
      (provider) => provider.name.toLowerCase() === name.toLowerCase() && !ranked.includes(provider),
    );
    if (match) ranked.push(match);
  }
  for (const provider of configured) {
    if (!ranked.includes(provider)) ranked.push(provider);
  }
  return ranked;
}

function breakerKey(name: string): string {
  return `breaker:${name}`;
}

/** True when this provider is in its cool-off window after a 429 or 5xx. */
export async function isTripped(name: string): Promise<boolean> {
  const until = await kvGet<number>(breakerKey(name));
  return typeof until === 'number' && until > Date.now();
}

/** Opens the breaker on a provider for a minute. */
export async function trip(name: string): Promise<void> {
  await kvSet(breakerKey(name), Date.now() + BREAKER_SECONDS * 1000, BREAKER_SECONDS * 1000);
}

/** A rate limit or a server fault is worth a cool-off; a bad request is not. */
function worthTripping(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status === 'number') return status === 429 || status >= 500;
  const message = error instanceof Error ? error.message : String(error);
  return /\b(429|5\d\d)\b|rate limit|overloaded|timeout|timed out/i.test(message);
}

/** Tracks what is left of the request's time budget. */
export class Budget {
  private readonly deadline: number;

  constructor(totalMs = budgetMs(), now = Date.now()) {
    this.deadline = now + totalMs;
  }

  remaining(now = Date.now()): number {
    return Math.max(0, this.deadline - now);
  }

  /** The time to give one attempt, or null when there is not enough left. */
  forAttempt(ceiling = PER_ATTEMPT_CEILING_MS, now = Date.now()): number | null {
    const left = this.remaining(now);
    if (left < MIN_ATTEMPT_MS) return null;
    return Math.min(ceiling, left);
  }

  expired(now = Date.now()): boolean {
    return this.remaining(now) <= 0;
  }
}

interface Attempt {
  provider: StreamProvider;
  controller: AbortController;
  stream: TextStream;
  /** The first token, already pulled so we know this provider is alive. */
  first: string;
  iterator: AsyncIterator<string>;
}

/**
 * Opens a provider and waits for its first token, so "it answered" means
 * tokens are really flowing and not just that the socket opened.
 */
async function race(
  provider: StreamProvider,
  options: StreamOptions,
  timeoutMs: number,
  parentSignal?: AbortSignal,
): Promise<Attempt | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = (): void => controller.abort();
  parentSignal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    const stream = await provider.open({ ...options, signal: controller.signal, timeoutMs });
    if (!stream) return null;

    const iterator = stream.tokens[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done || !first.value) return null;

    return { provider, controller, stream, first: first.value, iterator };
  } finally {
    clearTimeout(timer);
    parentSignal?.removeEventListener('abort', onParentAbort);
  }
}

/** Re-joins the first token with the rest of the stream. */
async function* rejoin(attempt: Attempt): AsyncGenerator<string> {
  yield attempt.first;
  while (true) {
    const next = await attempt.iterator.next();
    if (next.done) return;
    if (next.value) yield next.value;
  }
}

/**
 * Opens a stream from the best provider available.
 *
 * Tries the tier's leader; if it has not produced a token within the hedge
 * window, starts the next one alongside it and takes whichever speaks first.
 * Falls back through the rest, then to the non-streaming engine, so a learner
 * gets an answer as long as any provider at all is working.
 */
export async function openTextStream(options: StreamOptions): Promise<TextStream> {
  const tier = options.tier ?? 'fast';
  const budget = new Budget();
  const queue = orderFor(tier);

  const usable: StreamProvider[] = [];
  for (const provider of queue) {
    if (!(await isTripped(provider.name))) usable.push(provider);
  }
  // Everything is cooling off: rather than refuse, ignore the breaker.
  const candidates = usable.length > 0 ? usable : queue;

  let index = 0;
  const started: Promise<Attempt | null>[] = [];
  const names: string[] = [];

  while (index < candidates.length || started.length > 0) {
    // Start the next provider if there is one and there is budget for it.
    if (index < candidates.length) {
      const provider = candidates[index];
      const allowance = budget.forAttempt();
      if (allowance === null) break;

      started.push(
        race(provider, options, allowance, options.signal).catch((error: unknown) => {
          console.warn(`${provider.name} stream failed:`, error);
          if (worthTripping(error)) void trip(provider.name);
          return null;
        }),
      );
      names.push(provider.name);
      index += 1;
    }

    const hedge = index < candidates.length ? hedgeMs() : budget.remaining();
    const winner = await Promise.race([
      ...started.map((attempt, position) => attempt.then((value) => ({ value, position }))),
      new Promise<{ value: 'hedge'; position: -1 }>((resolve) =>
        setTimeout(() => resolve({ value: 'hedge', position: -1 }), Math.max(1, hedge)),
      ),
    ]);

    if (winner.value === 'hedge') {
      // Nobody has spoken yet. Start the next provider in parallel.
      if (index < candidates.length) continue;
      // No one left to start: wait for whatever is in flight.
      const settled = await Promise.all(started);
      const alive = settled.find((attempt): attempt is Attempt => attempt !== null);
      if (alive) return finish(alive, settled, tier);
      break;
    }

    if (winner.value) {
      const settled = await Promise.all(
        started.map((attempt) => attempt.catch(() => null)),
      );
      return finish(winner.value, settled, tier);
    }

    // That attempt failed. Drop it and carry on.
    started.splice(winner.position, 1);
    names.splice(winner.position, 1);
    if (started.length === 0 && index >= candidates.length) break;
  }

  // Nothing streamed. The non-streaming engine is the last resort, and
  // `buffered` tells the caller the answer did not arrive token by token.
  const result = await generateAIResponse({
    prompt: options.prompt,
    systemPrompt: options.systemPrompt,
    maxTokens: options.maxTokens ?? 1600,
    temperature: options.temperature,
    allowHeuristic: false,
  });

  return {
    provider: result.provider,
    tokens: (async function* one() {
      if (result.text) yield result.text;
    })(),
    buffered: true,
  };
}

/** Aborts the losing attempts and returns the winner, with its latency logged. */
function finish(winner: Attempt, all: (Attempt | null)[], tier: Tier): TextStream {
  for (const attempt of all) {
    if (attempt && attempt !== winner) attempt.controller.abort();
  }

  const startedAt = Date.now();
  const inner = rejoin(winner);

  return {
    provider: winner.stream.provider,
    buffered: false,
    citations: winner.stream.citations,
    tokens: (async function* logged() {
      try {
        for await (const token of inner) yield token;
      } finally {
        // Logged server-side so we can see which provider is fastest from Kampala.
        console.info(
          `[llm] tier=${tier} provider=${winner.stream.provider} latencyMs=${Date.now() - startedAt}`,
        );
      }
    })(),
  };
}

/** The providers that currently have a key, in the order this tier would try them. */
export function routerPlan(tier: Tier): string[] {
  return orderFor(tier).map((provider) => provider.name);
}

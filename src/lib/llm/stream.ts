/**
 * Kept as the import path the routes already use. The implementation moved
 * into `router.ts` when hedging, the time budget and the circuit breaker were
 * added, and the provider adapters into `providers/`.
 */

import { routerPlan } from '@/lib/llm/router';

export { openTextStream, routerPlan, Budget, orderFor, hedgeMs, budgetMs } from '@/lib/llm/router';
export type {
  SourceDocument,
  StreamOptions,
  StreamProvider,
  TextStream,
  Tier,
  ProviderCitation,
} from '@/lib/llm/types';

/** The providers that can stream, in `fast` order. Used by diagnostics. */
export function streamingProviders(): string[] {
  return routerPlan('fast');
}

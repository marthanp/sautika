/** Shared shapes for the LLM router and its providers. */

/**
 * Two tiers, because the work splits cleanly in two.
 *
 * `fast` answers chat, quizzes, flashcards and translation polishing, where a
 * learner is waiting. `deep` writes reports, audio and video scripts, mind
 * maps and slide decks over many sources, where quality matters more than the
 * first token.
 */
export type Tier = 'fast' | 'deep';

/** A passage sent to the model as a citable document. */
export interface SourceDocument {
  /** The `[n]` the prompt and the reply use. */
  n: number;
  title: string;
  text: string;
}

export interface StreamOptions {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  /**
   * Not sent to Anthropic models: a non-default `temperature` is rejected with
   * a 400 on Claude Haiku 5.5 and Claude Sonnet 5.5.
   */
  temperature?: number;
  tier?: Tier;
  /**
   * Retrieved passages. A provider that supports native citations sends these
   * as citable documents; the others get them numbered in the prompt and the
   * `[n]` markers are parsed back out.
   */
  documents?: SourceDocument[];
  /** Cancels the upstream request; used to abort a hedged loser. */
  signal?: AbortSignal;
  /** Time allowed for this one attempt. */
  timeoutMs?: number;
}

/** A citation the provider itself reported, rather than one parsed from `[n]`. */
export interface ProviderCitation {
  n: number;
  quote: string;
}

export interface TextStream {
  /** Which provider is answering, known before the first token. */
  provider: string;
  tokens: AsyncIterable<string>;
  /** True when the text arrived in one piece rather than token by token. */
  buffered: boolean;
  /**
   * Citations the provider reported natively, available once the stream has
   * been read to the end. Empty for providers without the feature, where the
   * `[n]` parser does the work instead.
   */
  citations?: () => ProviderCitation[];
}

/** What a provider adapter looks like to the router. */
export interface StreamProvider {
  name: string;
  /** False when the key is missing, so the router skips it without a request. */
  configured: () => boolean;
  /** True when the provider reports citation spans itself. */
  nativeCitations?: boolean;
  open: (options: StreamOptions) => Promise<TextStream | null>;
}

/**
 * Citation markers in a tutor reply.
 *
 * Replies cite their source as `[1]`, `[2]` and so on, pointing at the numbered
 * sources sent with the prompt. The UI needs three things from a reply: the
 * text without markers (for read-aloud), the pieces in order (for rendering
 * each marker as a button), and the set of sources actually cited.
 */

/** Matches `[1]` to `[99]`, and nothing else: `[note]` and `[2024]` are left alone. */
export const CITATION_PATTERN = /\[\d{1,2}\]/;
const CITATION_SPLIT = /(\[\d{1,2}\])/g;
const CITATION_EXACT = /^\[(\d{1,2})\]$/;

export type CitationPart =
  | { kind: 'text'; text: string }
  | { kind: 'citation'; text: string; n: number };

/** Drops the markers, for text that will be spoken rather than read. */
export function stripCitations(text: string): string {
  return text
    .replace(new RegExp(CITATION_SPLIT.source, 'g'), '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Splits a reply into text and citation parts, in order. Empty pieces from the
 * split are dropped, so a part is never rendered as an empty node.
 */
export function splitCitations(text: string): CitationPart[] {
  const parts: CitationPart[] = [];
  for (const piece of text.split(CITATION_SPLIT)) {
    if (!piece) continue;
    const match = CITATION_EXACT.exec(piece);
    if (match) {
      parts.push({ kind: 'citation', text: piece, n: Number(match[1]) });
    } else {
      parts.push({ kind: 'text', text: piece });
    }
  }
  return parts;
}

/**
 * The source numbers a reply cites, in first-mention order and without repeats.
 * `max` drops markers that point past the sources we actually sent, which a
 * model does invent.
 */
export function citedNumbers(text: string, max?: number): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const part of splitCitations(text)) {
    if (part.kind !== 'citation') continue;
    if (max !== undefined && (part.n < 1 || part.n > max)) continue;
    if (seen.has(part.n)) continue;
    seen.add(part.n);
    out.push(part.n);
  }
  return out;
}

/** True when the reply cites anything at all. */
export function hasCitations(text: string): boolean {
  return CITATION_PATTERN.test(text);
}

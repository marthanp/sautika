/**
 * Translating many short strings at once.
 *
 * A translated 5-question quiz used to fire 25 calls in parallel (5 items x 5
 * fields), which hits Sunbird's rate limit and sometimes returns a half
 * translated quiz. Here the strings are joined with numbered markers into one
 * request, split back out, and only a mismatched split falls back to per-item
 * calls.
 */

import { translateText } from '@/lib/translation';

/** Unlikely to appear in curriculum text, and survives a translation intact. */
const MARKER = (index: number): string => `[[${index}]]`;
const MARKER_PATTERN = /\[\[(\d{1,3})\]\]/g;
/** Keeps one request inside what the providers handle comfortably. */
const MAX_CHARS_PER_REQUEST = 3500;

/** Splits the strings into groups small enough for one request each. */
function group(values: string[], maxChars = MAX_CHARS_PER_REQUEST): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  let size = 0;

  values.forEach((value, index) => {
    const cost = value.length + 8;
    if (current.length > 0 && size + cost > maxChars) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push(index);
    size += cost;
  });

  if (current.length > 0) groups.push(current);
  return groups;
}

/** Pulls the numbered pieces back out of a translated block. */
export function splitMarked(translated: string, expected: number[]): string[] | null {
  const found = new Map<number, string>();
  const matches = [...translated.matchAll(MARKER_PATTERN)];
  if (matches.length === 0) return null;

  matches.forEach((match, position) => {
    const index = Number(match[1]);
    const start = (match.index ?? 0) + match[0].length;
    const end = position + 1 < matches.length ? matches[position + 1].index ?? translated.length : translated.length;
    found.set(index, translated.slice(start, end).trim());
  });

  // Every string must have come back, or the split is not trustworthy.
  const out: string[] = [];
  for (const index of expected) {
    const value = found.get(index);
    if (value === undefined || value === '') return null;
    out.push(value);
  }
  return out;
}

/**
 * Translates every string, in as few requests as possible.
 *
 * Blank strings are passed through untouched. A group whose markers do not
 * come back intact is retried one string at a time, and a string that still
 * fails keeps its original text rather than disappearing from the quiz.
 */
export async function translateMany(
  values: string[],
  source: string,
  target: string,
): Promise<string[]> {
  if (source === target) return [...values];

  const out = [...values];
  const translatable = values
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value.trim().length > 0);

  if (translatable.length === 0) return out;

  for (const indexes of group(translatable.map((entry) => entry.value))) {
    const batch = indexes.map((position) => translatable[position]);
    const block = batch.map((entry, position) => `${MARKER(position)} ${entry.value}`).join('\n');

    try {
      const result = await translateText(block, source, target);
      const pieces = splitMarked(result.text, batch.map((_, position) => position));

      if (pieces && pieces.length === batch.length) {
        batch.forEach((entry, position) => {
          out[entry.index] = pieces[position];
        });
        continue;
      }

      console.warn('Batched translation did not split cleanly; falling back per item.');
    } catch (error) {
      console.warn('Batched translation failed; falling back per item:', error);
    }

    // Per-item fallback, in series so the rate limit is not the next problem.
    for (const entry of batch) {
      try {
        const single = await translateText(entry.value, source, target);
        out[entry.index] = single.text;
      } catch (error) {
        console.warn('Could not translate one string; keeping the original:', error);
      }
    }
  }

  return out;
}

/**
 * Translates the fields of a list of objects in one pass, which is the shape
 * quizzes and flashcards actually need.
 */
export async function translateFields<T extends object>(
  items: T[],
  fields: (keyof T)[],
  source: string,
  target: string,
): Promise<T[]> {
  const flat: string[] = [];
  const positions: { item: number; field: keyof T; sub?: number }[] = [];

  items.forEach((item, itemIndex) => {
    for (const field of fields) {
      const value = item[field] as unknown;
      if (typeof value === 'string') {
        flat.push(value);
        positions.push({ item: itemIndex, field });
      } else if (Array.isArray(value)) {
        value.forEach((entry, subIndex) => {
          if (typeof entry === 'string') {
            flat.push(entry);
            positions.push({ item: itemIndex, field, sub: subIndex });
          }
        });
      }
    }
  });

  const translated = await translateMany(flat, source, target);

  const out = items.map((item) => ({ ...item }));
  positions.forEach((position, index) => {
    const target_ = out[position.item];
    if (position.sub === undefined) {
      (target_ as Record<string, unknown>)[position.field as string] = translated[index];
      return;
    }
    const list = (target_ as Record<string, unknown>)[position.field as string];
    if (Array.isArray(list)) list[position.sub] = translated[index];
  });

  return out;
}

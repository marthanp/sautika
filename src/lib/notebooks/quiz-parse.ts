/**
 * Turns a model's reply into quiz items.
 *
 * Models wrap JSON in prose, fences or both, and drop fields. This pulls the
 * array out of whatever arrived and keeps only items a learner can actually
 * answer: a question, a correct answer and at least two wrong options.
 */

export interface QuizItem {
  q: string;
  a: string;
  d: [string, string];
  e: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseQuizItems(raw: string): QuizItem[] {
  const text = raw.replace(/```json|```/g, '');
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const items: QuizItem[] = [];
  for (const entry of parsed) {
    if (!isRecord(entry)) continue;
    const { q, a, d, e } = entry;
    if (typeof q !== 'string' || !q.trim()) continue;
    if (typeof a !== 'string' || !a.trim()) continue;
    if (!Array.isArray(d) || d.length < 2) continue;
    const wrong = d.filter((option): option is string => typeof option === 'string' && option.trim().length > 0);
    if (wrong.length < 2) continue;
    items.push({
      q: q.trim(),
      a: a.trim(),
      d: [wrong[0].trim(), wrong[1].trim()],
      e: typeof e === 'string' && e.trim() ? e.trim() : '',
    });
  }
  return items;
}

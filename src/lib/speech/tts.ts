/**
 * Reading a long answer aloud.
 *
 * Sunbird synthesises one chunk at a time, and the old route simply cut the
 * text at 600 characters, so a long answer was never read in full. Here the
 * text is split into sentence-sized pieces on the server and returned as an
 * ordered list of audio URLs, which the client plays in sequence. The same
 * segments drive the sentence highlighting that dyslexia mode uses.
 */

import { hasSunbirdTts, isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

/** Comfortably inside Sunbird's per-request limit, with room for long words. */
export const MAX_SEGMENT_CHARS = 420;
/** A whole reply, not a book: enough for any answer a learner will hear. */
export const MAX_TOTAL_CHARS = 12_000;

export interface SpeechSegment {
  /** Position in the playlist, from 0. */
  ord: number;
  text: string;
  /** Offsets into the submitted text, for highlighting while it plays. */
  charStart: number;
  charEnd: number;
  audioUrl?: string;
  error?: string;
}

/**
 * Splits text into speakable segments at sentence ends, falling back to a
 * clause or a word boundary for a sentence that is too long on its own.
 *
 * Each segment is a span of the original text, so the client can highlight
 * exactly what is being spoken.
 */
export function splitForSpeech(text: string, maxChars = MAX_SEGMENT_CHARS): SpeechSegment[] {
  const trimmed = text.slice(0, MAX_TOTAL_CHARS);
  if (!trimmed.trim()) return [];

  const segments: SpeechSegment[] = [];
  // Sentence ends, keeping the punctuation with the sentence it closes.
  const pattern = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
  let match: RegExpExecArray | null;
  const sentences: { start: number; end: number }[] = [];

  while ((match = pattern.exec(trimmed)) !== null) {
    if (!match[0].trim()) continue;
    sentences.push({ start: match.index, end: match.index + match[0].length });
    if (pattern.lastIndex === match.index) pattern.lastIndex += 1;
  }

  const push = (start: number, end: number): void => {
    let from = start;
    let to = end;
    while (from < to && /\s/.test(trimmed[from])) from += 1;
    while (to > from && /\s/.test(trimmed[to - 1])) to -= 1;
    if (to <= from) return;
    segments.push({
      ord: segments.length,
      text: trimmed.slice(from, to),
      charStart: from,
      charEnd: to,
    });
  };

  let bufferStart: number | null = null;
  let bufferEnd = 0;

  for (const sentence of sentences) {
    const length = sentence.end - sentence.start;

    // A single sentence longer than the limit has to be cut inside itself.
    if (length > maxChars) {
      if (bufferStart !== null) {
        push(bufferStart, bufferEnd);
        bufferStart = null;
      }
      let from = sentence.start;
      while (sentence.end - from > maxChars) {
        const limit = from + maxChars;
        const window = trimmed.slice(from, limit);
        const clause = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '));
        const space = window.lastIndexOf(' ');
        const cut = clause > maxChars * 0.4 ? from + clause + 1
          : space > maxChars * 0.4 ? from + space
            : limit;
        push(from, cut);
        from = cut;
      }
      push(from, sentence.end);
      continue;
    }

    if (bufferStart === null) {
      bufferStart = sentence.start;
      bufferEnd = sentence.end;
      continue;
    }

    if (sentence.end - bufferStart <= maxChars) {
      bufferEnd = sentence.end;
      continue;
    }

    push(bufferStart, bufferEnd);
    bufferStart = sentence.start;
    bufferEnd = sentence.end;
  }

  if (bufferStart !== null) push(bufferStart, bufferEnd);

  return segments;
}

/** Synthesises one segment, returning null rather than throwing. */
async function synthesise(text: string, language: string): Promise<string | null> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) return null;

  const baseUrl = (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
  try {
    const response = await fetch(`${baseUrl}/tasks/audio/speech`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({ text, language, response_mode: 'url' }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.warn('Sunbird text-to-speech responded with status', response.status);
      return null;
    }
    const result = (await response.json()) as { audio_url?: unknown };
    return typeof result.audio_url === 'string' ? result.audio_url : null;
  } catch (error) {
    console.warn('Sunbird text-to-speech failed for one segment:', error);
    return null;
  }
}

/**
 * Turns text into an ordered playlist. Segments are synthesised a few at a
 * time: all at once would hit Sunbird's rate limit on a long answer.
 */
export async function speak(text: string, language: string): Promise<SpeechSegment[]> {
  const normalised = normalizeSunbirdLanguage(language);
  // Narrowed before the voice check, which only accepts a known language code.
  if (!isSunbirdLanguage(normalised) || !hasSunbirdTts(normalised)) return [];

  const segments = splitForSpeech(text);
  const batchSize = 3;

  for (let index = 0; index < segments.length; index += batchSize) {
    const batch = segments.slice(index, index + batchSize);
    await Promise.all(
      batch.map(async (segment) => {
        const url = await synthesise(segment.text, normalised);
        if (url) segment.audioUrl = url;
        else segment.error = 'This part could not be read aloud.';
      }),
    );
  }

  return segments;
}

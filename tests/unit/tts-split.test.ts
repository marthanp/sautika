import { describe, expect, it } from 'vitest';
import { MAX_SEGMENT_CHARS, splitForSpeech } from '@/lib/speech/tts';

/**
 * A long answer used to be cut at 600 characters and never read in full.
 * These cover the splitter that replaced the cap: every segment must be an
 * exact span of the text, so the client can highlight what it is speaking.
 */
describe('splitForSpeech', () => {
  it('returns nothing for empty text', () => {
    expect(splitForSpeech('')).toEqual([]);
    expect(splitForSpeech('   \n ')).toEqual([]);
  });

  it('keeps a short answer as one segment', () => {
    const segments = splitForSpeech('Plants need sunlight to make food.');
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('Plants need sunlight to make food.');
    expect(segments[0].ord).toBe(0);
  });

  it('every segment is an exact slice of the text', () => {
    const text = `${'Plants need sunlight. '.repeat(60)}And that is how it works!`;
    for (const segment of splitForSpeech(text)) {
      expect(text.slice(segment.charStart, segment.charEnd)).toBe(segment.text);
    }
  });

  it('numbers segments in order', () => {
    const segments = splitForSpeech('One. Two. Three. '.repeat(80));
    expect(segments.length).toBeGreaterThan(1);
    expect(segments.map((segment) => segment.ord)).toEqual(segments.map((_, index) => index));
  });

  it('keeps segments within the limit', () => {
    const segments = splitForSpeech('A fairly ordinary sentence about plants. '.repeat(50));
    for (const segment of segments) {
      expect(segment.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
    }
  });

  it('packs several short sentences into one segment', () => {
    // Three tiny sentences should not become three requests.
    const segments = splitForSpeech('One. Two. Three.');
    expect(segments).toHaveLength(1);
  });

  it('splits a single over-long sentence rather than dropping any of it', () => {
    const long = `${'water '.repeat(200)}flows`;
    const segments = splitForSpeech(long);
    expect(segments.length).toBeGreaterThan(1);
    for (const segment of segments) {
      expect(segment.text.length).toBeLessThanOrEqual(MAX_SEGMENT_CHARS);
    }
    // Nothing is lost: the words all survive the split.
    const rejoined = segments.map((segment) => segment.text).join(' ');
    expect(rejoined.split(/\s+/).length).toBe(long.split(/\s+/).length);
  });

  it('reads the whole answer, well past the old 600 character cap', () => {
    const text = 'Photosynthesis turns light into food. '.repeat(60);
    const segments = splitForSpeech(text);
    const covered = segments.reduce(
      (total, segment) => total + (segment.charEnd - segment.charStart),
      0,
    );
    expect(text.length).toBeGreaterThan(600);
    // Allowing for the whitespace between segments that is not spoken.
    expect(covered).toBeGreaterThan(text.trim().length * 0.95);
  });

  it('treats a line break as a sentence end', () => {
    const segments = splitForSpeech('First idea\nSecond idea', 12);
    expect(segments.length).toBeGreaterThan(1);
  });

  it('never emits an empty or whitespace-only segment', () => {
    for (const segment of splitForSpeech('One.   \n\n   Two.    Three!   ')) {
      expect(segment.text.trim()).not.toBe('');
      expect(segment.charEnd).toBeGreaterThan(segment.charStart);
    }
  });
});

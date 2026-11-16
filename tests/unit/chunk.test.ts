import { describe, expect, it } from 'vitest';
import { chunkPages, chunkText, MAX_CHARS, TARGET_CHARS } from '@/lib/notebooks/chunk';

const paragraph = (words: number, word = 'photosynthesis'): string =>
  Array.from({ length: words }, () => word).join(' ');

describe('chunkText', () => {
  it('returns nothing for empty or blank text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  \t ')).toEqual([]);
  });

  it('keeps a short source as one chunk', () => {
    const chunks = chunkText('Plants make food from sunlight.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toMatchObject({ ord: 0, charStart: 0, text: 'Plants make food from sunlight.' });
  });

  it('every chunk is an exact slice of the source', () => {
    const text = [
      '# Photosynthesis',
      paragraph(90),
      paragraph(90, 'chlorophyll'),
      '## Respiration',
      paragraph(120, 'mitochondria'),
    ].join('\n\n');

    for (const chunk of chunkText(text)) {
      expect(text.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
    }
  });

  it('numbers chunks in reading order', () => {
    const text = Array.from({ length: 6 }, (_, index) => paragraph(60, `word${index}`)).join('\n\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.map((chunk) => chunk.ord)).toEqual(chunks.map((_, index) => index));
  });

  it('starts a new chunk at a markdown heading', () => {
    const text = `Intro paragraph about plants.\n\n## Water\n\nPlants need water.`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[1].text.startsWith('## Water')).toBe(true);
  });

  it('starts a new chunk at an ALL CAPS heading', () => {
    const text = `Some opening text here.\n\nCHAPTER TWO: THE WATER CYCLE\n\nWater evaporates.`;
    const chunks = chunkText(text);
    expect(chunks.some((chunk) => chunk.text.startsWith('CHAPTER TWO'))).toBe(true);
  });

  it('keeps chunks near the target size', () => {
    const text = Array.from({ length: 20 }, () => paragraph(40)).join('\n\n');
    for (const chunk of chunkText(text)) {
      expect(chunk.text.length).toBeLessThanOrEqual(TARGET_CHARS + MAX_CHARS);
    }
  });

  it('cuts a single over-long paragraph instead of keeping it whole', () => {
    const text = `${paragraph(600)}.`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHARS + 200);
    }
  });

  it('prefers a sentence end when cutting a long paragraph', () => {
    // Sentences shorter than the cut size, which is the realistic case.
    const sentence = `${paragraph(8)}. `;
    const chunks = chunkText(sentence.repeat(40), { maxChars: 500, targetChars: 400 });
    // At least most cuts should land after a full stop.
    const endsAtSentence = chunks.filter((chunk) => /\.\s*$/.test(chunk.text)).length;
    expect(endsAtSentence).toBeGreaterThan(chunks.length / 2);
  });

  it('repeats the tail of the previous chunk as overlap', () => {
    const text = Array.from({ length: 8 }, (_, index) => paragraph(50, `block${index}`)).join('\n\n');
    const chunks = chunkText(text, { overlapChars: 120 });
    expect(chunks.length).toBeGreaterThan(1);
    // A later chunk starts before the previous one ended.
    expect(chunks[1].charStart).toBeLessThan(chunks[0].charEnd);
  });

  it('never overlaps the first chunk', () => {
    const chunks = chunkText(Array.from({ length: 5 }, () => paragraph(60)).join('\n\n'));
    expect(chunks[0].charStart).toBe(0);
  });

  it('does not open a chunk in the middle of a word', () => {
    const text = Array.from({ length: 8 }, (_, index) => paragraph(50, `block${index}`)).join('\n\n');
    for (const chunk of chunkText(text)) {
      if (chunk.charStart === 0) continue;
      expect(/^\s/.test(chunk.text)).toBe(false);
      expect(/\s/.test(text[chunk.charStart - 1])).toBe(true);
    }
  });

  it('leaves page undefined when the source has no pages', () => {
    expect(chunkText('One short note.')[0].page).toBeUndefined();
  });

  it('tags chunks with the page they start on', () => {
    const chunks = chunkText('Page one text.\n\nPage two text.', {
      targetChars: 10,
      pages: [
        { page: 1, charStart: 0, charEnd: 16 },
        { page: 2, charStart: 16, charEnd: 31 },
      ],
    });
    expect(chunks[0].page).toBe(1);
    expect(chunks[chunks.length - 1].page).toBe(2);
  });
});

describe('chunkPages', () => {
  it('joins pages and keeps each chunk a slice of the joined text', () => {
    const { text, chunks } = chunkPages([
      { page: 1, text: paragraph(60, 'alpha') },
      { page: 2, text: paragraph(60, 'beta') },
      { page: 3, text: paragraph(60, 'gamma') },
    ]);

    expect(chunks.length).toBeGreaterThan(0);
    for (const chunk of chunks) {
      expect(text.slice(chunk.charStart, chunk.charEnd)).toBe(chunk.text);
      expect(chunk.page).toBeGreaterThanOrEqual(1);
    }
  });

  it('attributes the first chunk to page 1', () => {
    const { chunks } = chunkPages([
      { page: 1, text: 'First page.' },
      { page: 2, text: 'Second page.' },
    ]);
    expect(chunks[0].page).toBe(1);
  });

  it('handles a single page', () => {
    const { text, chunks } = chunkPages([{ page: 7, text: 'Only page.' }]);
    expect(text).toBe('Only page.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].page).toBe(7);
  });

  it('returns nothing for no pages', () => {
    expect(chunkPages([]).chunks).toEqual([]);
  });
});

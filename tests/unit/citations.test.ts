import { describe, expect, it } from 'vitest';
import { citedNumbers, hasCitations, splitCitations, stripCitations } from '@/lib/notebooks/citations';

describe('splitCitations', () => {
  it('splits text and markers in order', () => {
    expect(splitCitations('Plants need light [1] and water [2].')).toEqual([
      { kind: 'text', text: 'Plants need light ' },
      { kind: 'citation', text: '[1]', n: 1 },
      { kind: 'text', text: ' and water ' },
      { kind: 'citation', text: '[2]', n: 2 },
      { kind: 'text', text: '.' },
    ]);
  });

  it('reads two-digit markers', () => {
    expect(splitCitations('See [12].')[1]).toEqual({ kind: 'citation', text: '[12]', n: 12 });
  });

  it('leaves brackets that are not citations alone', () => {
    const parts = splitCitations('In [2024] the [note] said [1].');
    expect(parts.filter((part) => part.kind === 'citation')).toEqual([
      { kind: 'citation', text: '[1]', n: 1 },
    ]);
  });

  it('drops the empty pieces the split produces', () => {
    expect(splitCitations('[1][2]')).toEqual([
      { kind: 'citation', text: '[1]', n: 1 },
      { kind: 'citation', text: '[2]', n: 2 },
    ]);
  });

  it('returns nothing for an empty string', () => {
    expect(splitCitations('')).toEqual([]);
  });
});

describe('stripCitations', () => {
  it('removes markers and collapses the gaps they leave', () => {
    expect(stripCitations('Water boils at 100C [1]  and freezes at 0C [2].')).toBe(
      'Water boils at 100C and freezes at 0C .',
    );
  });

  it('leaves text without markers unchanged', () => {
    expect(stripCitations('No markers here.')).toBe('No markers here.');
  });
});

describe('citedNumbers', () => {
  it('lists each cited source once, in first-mention order', () => {
    expect(citedNumbers('A [2] B [1] C [2] D [3]')).toEqual([2, 1, 3]);
  });

  it('drops markers that point past the sources we sent', () => {
    expect(citedNumbers('A [1] B [9]', 3)).toEqual([1]);
  });

  it('returns nothing when there are no citations', () => {
    expect(citedNumbers('Nothing cited.')).toEqual([]);
  });
});

describe('hasCitations', () => {
  it('is true only for a real marker', () => {
    expect(hasCitations('Grounded [1].')).toBe(true);
    expect(hasCitations('Ungrounded.')).toBe(false);
    expect(hasCitations('In [2024].')).toBe(false);
  });
});

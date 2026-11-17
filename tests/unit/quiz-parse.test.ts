import { describe, expect, it } from 'vitest';
import { parseQuizItems } from '@/lib/notebooks/quiz-parse';

const ONE_GOOD_ITEM = JSON.stringify([
  { q: 'What is 2 + 2?', a: '4', d: ['3', '5'], e: 'Two added to two makes four [1].' },
]);

describe('parseQuizItems', () => {
  it('reads a clean JSON array', () => {
    const items = parseQuizItems(ONE_GOOD_ITEM);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      q: 'What is 2 + 2?',
      a: '4',
      d: ['3', '5'],
      e: 'Two added to two makes four [1].',
    });
  });

  it('reads through a fenced code block', () => {
    expect(parseQuizItems('```json\n' + ONE_GOOD_ITEM + '\n```')).toHaveLength(1);
  });

  it('reads through prose on both sides', () => {
    const raw = `Sure! Here is your quiz:\n${ONE_GOOD_ITEM}\nGood luck with revision.`;
    expect(parseQuizItems(raw)).toHaveLength(1);
  });

  it('returns nothing when there is no array', () => {
    expect(parseQuizItems('I cannot build a quiz from these notes.')).toEqual([]);
  });

  it('returns nothing for malformed JSON', () => {
    expect(parseQuizItems('[{ "q": "Broken", "a": }]')).toEqual([]);
  });

  it('returns nothing when the JSON is an object, not an array', () => {
    expect(parseQuizItems('{"q":"What is 2 + 2?","a":"4","d":["3","5"]}')).toEqual([]);
  });

  it('drops items with a missing or blank question', () => {
    const raw = JSON.stringify([
      { q: '   ', a: '4', d: ['3', '5'] },
      { a: '4', d: ['3', '5'] },
      { q: 'Kept?', a: 'Yes', d: ['No', 'Maybe'] },
    ]);
    expect(parseQuizItems(raw).map((item) => item.q)).toEqual(['Kept?']);
  });

  it('drops items with fewer than two usable wrong answers', () => {
    const raw = JSON.stringify([
      { q: 'One wrong only', a: 'A', d: ['B'] },
      { q: 'Blank wrong answers', a: 'A', d: ['', '  '] },
      { q: 'Wrong answers are numbers', a: 'A', d: [1, 2] },
    ]);
    expect(parseQuizItems(raw)).toEqual([]);
  });

  it('keeps the first two wrong answers when the model sends more', () => {
    const raw = JSON.stringify([{ q: 'Q', a: 'A', d: ['B', 'C', 'D', 'E'] }]);
    expect(parseQuizItems(raw)[0].d).toEqual(['B', 'C']);
  });

  it('trims whitespace and defaults a missing explanation to an empty string', () => {
    const raw = JSON.stringify([{ q: '  Q  ', a: '  A  ', d: ['  B  ', '  C  '] }]);
    expect(parseQuizItems(raw)[0]).toEqual({ q: 'Q', a: 'A', d: ['B', 'C'], e: '' });
  });

  it('ignores non-object entries mixed into the array', () => {
    const raw = `[null, 42, "text", ${ONE_GOOD_ITEM.slice(1, -1)}]`;
    expect(parseQuizItems(raw)).toHaveLength(1);
  });
});

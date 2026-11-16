import { describe, expect, it } from 'vitest';
import { looseMatch } from '@/app/(app)/notebook/NotebooksHome';

/**
 * Notebook search has to forgive a misspelling: a learner with dyslexia, or
 * anyone typing on a cracked phone screen, should still find their notebook.
 */
describe('looseMatch', () => {
  it('matches everything when the query is empty', () => {
    expect(looseMatch('Mathematics notes', '')).toBe(true);
    expect(looseMatch('Mathematics notes', '   ')).toBe(true);
  });

  it('matches a plain substring, ignoring case', () => {
    expect(looseMatch('Mathematics notes', 'math')).toBe(true);
    expect(looseMatch('Mathematics notes', 'MATH')).toBe(true);
    expect(looseMatch('Mathematics notes', 'notes')).toBe(true);
  });

  it('forgives a misspelling by matching letters in order', () => {
    expect(looseMatch('Mathematics notes', 'mathz')).toBe(false);
    expect(looseMatch('Mathematics notes', 'mthmtcs')).toBe(true);
    expect(looseMatch('Social Studies', 'socstud')).toBe(true);
  });

  it('ignores spaces in the query', () => {
    expect(looseMatch('Social Studies', 'soc stud')).toBe(true);
  });

  it('rejects a query whose letters are out of order', () => {
    expect(looseMatch('Mathematics', 'scitamehtam')).toBe(false);
  });

  it('rejects a query with letters that are not there', () => {
    expect(looseMatch('Mathematics notes', 'biology')).toBe(false);
    expect(looseMatch('Agriculture', 'zzz')).toBe(false);
  });

  it('does not match a letter twice from the same position', () => {
    // "aa" needs two separate a's, and "Lab" has only one.
    expect(looseMatch('Lab', 'aa')).toBe(false);
    expect(looseMatch('Banana', 'aaa')).toBe(true);
  });
});

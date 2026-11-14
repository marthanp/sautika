/**
 * Course search that survives speech.
 *
 * A voice query arrives as a whole sentence — "I want to learn about fractions"
 * or "computers for senior three" — so a substring match over the title finds
 * nothing. This turns the sentence into tokens, expands class names, maps
 * subject words onto the catalogue's categories, and scores each course.
 */

import type { Course } from '@/types';

/** Words that carry no meaning for a course search. */
const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'i',
  'im',
  'me',
  'my',
  'we',
  'you',
  'to',
  'for',
  'of',
  'on',
  'in',
  'at',
  'is',
  'are',
  'and',
  'or',
  'it',
  'please',
  'want',
  'wants',
  'wanna',
  'need',
  'learn',
  'learning',
  'study',
  'studying',
  'teach',
  'show',
  'find',
  'about',
  'course',
  'courses',
  'lesson',
  'lessons',
  'class',
  'classes',
  'topic',
  'subject',
  'something',
  'help',
]);

/** Subject words a learner says, mapped onto the words the catalogue uses. */
const SYNONYMS: Record<string, string> = {
  maths: 'math',
  mathematics: 'math',
  arithmetic: 'math',
  numbers: 'math',
  number: 'math',
  counting: 'math',
  english: 'languages',
  swahili: 'languages',
  kiswahili: 'languages',
  luganda: 'languages',
  reading: 'languages',
  literacy: 'languages',
  language: 'languages',
  biology: 'science',
  chemistry: 'science',
  physics: 'science',
  health: 'science',
  ict: 'digital',
  computer: 'digital',
  computers: 'digital',
  computing: 'digital',
  coding: 'digital',
  internet: 'digital',
  technology: 'digital',
  sst: 'social',
  history: 'social',
  geography: 'social',
  civics: 'social',
  economics: 'social',
};

const WORD_NUMBERS: Record<string, string> = {
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
};

const TITLE_WEIGHT = 3;
const CATEGORY_WEIGHT = 2;
const LEVEL_WEIGHT = 2;
const LESSON_WEIGHT = 1.5;
const DESCRIPTION_WEIGHT = 1;

/** A token like `swahili|languages`: either side may match. */
function forms(token: string): string[] {
  const [original, mapped] = token.split('|');
  return mapped ? [original, mapped] : [original];
}

function isClassToken(token: string): boolean {
  return /^(primary|senior) \d$/.test(token);
}

/**
 * Turns a spoken or typed query into search tokens.
 *
 * - `P.4`, `P4`, `primary four` all become the single token `primary 4`.
 * - `S.3`, `S3`, `senior three` become `senior 3`.
 * - Stopwords are dropped.
 * - A subject word is kept as `original|mapped`, so both forms can match.
 */
export function normaliseQuery(query: string): string[] {
  const cleaned = query
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  // p.4 / p4 / s.3 / s3 -> primary 4 / senior 3
  const expanded = cleaned
    .replace(/\bp\.?\s?([1-7])\b/g, 'primary $1')
    .replace(/\bs\.?\s?([1-6])\b/g, 'senior $1');

  const words = expanded.split(' ').filter(Boolean);
  const tokens: string[] = [];

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index].replace(/\.+$/, '');
    if (!word) continue;

    // Keep a class as one token: "primary four" -> "primary 4".
    if (word === 'primary' || word === 'senior') {
      const nextRaw = words[index + 1]?.replace(/\.+$/, '') ?? '';
      const next = WORD_NUMBERS[nextRaw] ?? (/^[1-7]$/.test(nextRaw) ? nextRaw : '');
      if (next) {
        tokens.push(`${word} ${next}`);
        index += 1;
        continue;
      }
    }

    if (STOPWORDS.has(word)) continue;
    if (word.length < 2) continue;

    const mapped = SYNONYMS[word];
    tokens.push(mapped && mapped !== word ? `${word}|${mapped}` : word);
  }

  return tokens;
}

function haystack(course: Course): {
  title: string;
  category: string;
  level: string;
  lessons: string;
  description: string;
} {
  return {
    title: course.title.toLowerCase(),
    category: course.cat.toLowerCase(),
    level: course.level.toLowerCase(),
    lessons: course.lessons.map((lesson) => lesson.title).join(' ').toLowerCase(),
    description: (course.description ?? '').toLowerCase(),
  };
}

/**
 * Scores one course against already-normalised tokens.
 *
 * A class token is a hard filter: ask for Senior 3 and a Senior 1 course
 * scores nothing, however well its title matches.
 */
export function scoreCourse(course: Course, tokens: string[]): number {
  if (!tokens.length) return 0;
  const fields = haystack(course);

  let score = 0;
  let matched = 0;

  for (const token of tokens) {
    if (isClassToken(token)) {
      if (!fields.level.includes(token)) return 0;
      score += LEVEL_WEIGHT;
      matched += 1;
      continue;
    }

    let best = 0;
    for (const form of forms(token)) {
      if (fields.title.includes(form)) best = Math.max(best, TITLE_WEIGHT);
      if (fields.category.includes(form)) best = Math.max(best, CATEGORY_WEIGHT);
      if (fields.level.includes(form)) best = Math.max(best, LEVEL_WEIGHT);
      if (fields.lessons.includes(form)) best = Math.max(best, LESSON_WEIGHT);
      if (fields.description.includes(form)) best = Math.max(best, DESCRIPTION_WEIGHT);
    }
    if (best > 0) {
      score += best;
      matched += 1;
    }
  }

  // Half the words must land, so a long sentence cannot match on one stray word.
  if (matched * 2 < tokens.length) return 0;
  return score;
}

/** Filters and ranks courses for a query. An empty query returns the list unchanged. */
export function searchCourses(courses: Course[], query: string): Course[] {
  const tokens = normaliseQuery(query);
  if (!tokens.length) return courses;

  return courses
    .map((course, index) => ({ course, index, score: scoreCourse(course, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.course);
}

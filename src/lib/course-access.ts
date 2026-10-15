import type { Course } from '@/types';

type CourseLevel = { level?: unknown; levelGroup?: unknown };

function classKey(value: string): string | null {
  const normalized = value.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (normalized === 'baby class' || normalized === 'middle class' || normalized === 'top class') {
    return normalized;
  }

  const primary = /^(?:p|primary)\s*(\d+)$/.exec(normalized);
  if (primary && Number(primary[1]) >= 1 && Number(primary[1]) <= 7) {
    return `primary-${primary[1]}`;
  }

  const senior = /^(?:s|senior)\s*(\d+)$/.exec(normalized);
  if (senior && Number(senior[1]) >= 1 && Number(senior[1]) <= 6) {
    return `senior-${senior[1]}`;
  }

  return null;
}

function rangeContainsClass(range: string, selectedClass: string): boolean {
  const normalized = range.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const primary = /^primary ([1-7]) to ([1-7])$/.exec(normalized)
    ?? /^p([1-7]) to p([1-7])$/.exec(normalized);
  if (primary && selectedClass.startsWith('primary-')) {
    const grade = Number(selectedClass.slice('primary-'.length));
    return grade >= Number(primary[1]) && grade <= Number(primary[2]);
  }

  const senior = /^senior ([1-6]) to ([1-6])$/.exec(normalized)
    ?? /^s([1-6]) to s([1-6])$/.exec(normalized);
  if (senior && selectedClass.startsWith('senior-')) {
    const grade = Number(selectedClass.slice('senior-'.length));
    return grade >= Number(senior[1]) && grade <= Number(senior[2]);
  }

  if (['baby class to top class', 'baby to top class'].includes(normalized)) {
    return ['baby class', 'middle class', 'top class'].includes(selectedClass);
  }
  if (normalized === 'o-level') return /^senior-[1-4]$/.test(selectedClass);
  if (normalized === 'a-level') return /^senior-[5-6]$/.test(selectedClass);
  return false;
}

export function isCourseAvailableForClass(course: CourseLevel, educationLevel: string): boolean {
  const selectedClass = classKey(educationLevel);
  if (!selectedClass) return educationLevel.trim().toLowerCase() === 'not specified';

  const courseLevel = typeof course.level === 'string' ? course.level : '';
  const courseGroup = typeof course.levelGroup === 'string' ? course.levelGroup : '';
  if (classKey(courseLevel) === selectedClass || rangeContainsClass(courseLevel, selectedClass)) {
    return true;
  }

  // A specific course level takes precedence over its broader catalog group.
  return classKey(courseLevel) === null &&
    !rangeContainsClass(courseLevel, selectedClass) &&
    rangeContainsClass(courseGroup, selectedClass);
}

export function coursesForClass(courses: Course[], educationLevel: string): Course[] {
  return courses.filter((course) => isCourseAvailableForClass(course, educationLevel));
}

export function isKnownEducationLevel(value: unknown): value is string {
  return typeof value === 'string' &&
    (classKey(value) !== null || value.trim().toLowerCase() === 'not specified');
}

import type { Course } from '@/types';

type CourseLevel = { level?: unknown };

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

export function isCourseAvailableForClass(course: CourseLevel, educationLevel: string): boolean {
  const selectedClass = classKey(educationLevel);
  const courseLevel = typeof course.level === 'string' ? course.level : '';
  return selectedClass !== null && classKey(courseLevel) === selectedClass;
}

export function coursesForClass(courses: Course[], educationLevel: string): Course[] {
  return courses.filter((course) => isCourseAvailableForClass(course, educationLevel));
}

export function isKnownEducationLevel(value: unknown): value is string {
  return typeof value === 'string' &&
    (classKey(value) !== null || value.trim().toLowerCase() === 'not specified');
}

export function resolveEducationLevel(metadataLevel: unknown, profileLevel: unknown): string {
  if (isKnownEducationLevel(metadataLevel)) return metadataLevel;
  if (isKnownEducationLevel(profileLevel)) return profileLevel;
  return 'Not specified';
}

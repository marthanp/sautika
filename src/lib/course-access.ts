import type { Course } from '@/types';
import { COURSES } from '@/data/courses';

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
  // If not specified or All, don't lock the learner out - all courses are available
  if (!educationLevel || educationLevel === 'Not specified' || educationLevel === 'All') {
    return true;
  }
  const selectedClass = classKey(educationLevel);
  if (!selectedClass) return true;
  const courseLevel = typeof course.level === 'string' ? course.level : '';
  const cKey = classKey(courseLevel);
  // General/all-level courses (like "Beginner to Intermediate") are available to everyone
  if (!cKey) return true;
  return cKey === selectedClass;
}

export function coursesForClass(courses: Course[], educationLevel: string): Course[] {
  const base = (courses && courses.length > 0) ? courses : COURSES;
  const filtered = base.filter((course) => isCourseAvailableForClass(course, educationLevel));
  // Guarantee fallback to full catalog so learning library is never stuck or empty
  return filtered.length > 0 ? filtered : base;
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

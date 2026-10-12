import type { Category } from '@/types';
import type { Subject } from '@/lib/data';

export const SUBJECT_BY_CATEGORY: Record<Category, Subject> = {
  Science: 'Science',
  Math: 'Mathematics',
  Languages: 'English',
  'Digital Literacy': 'Life Skills',
  'Social Studies': 'Social Studies',
};

export const IMAGE_BY_CATEGORY: Record<Category, string> = {
  Science: 'course-science.jpg',
  Math: 'course-math.jpg',
  Languages: 'course-english.jpg',
  'Digital Literacy': 'course-life.jpg',
  'Social Studies': 'course-social.jpg',
};

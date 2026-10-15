'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, BookOpen, ExternalLink, GraduationCap, RotateCcw, Search } from 'lucide-react';
import { Card, SubjectChip } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { coursesForClass } from '@/lib/course-access';
import { IMAGE_BY_CATEGORY, SUBJECT_BY_CATEGORY } from '@/lib/course-display';
import type { Category, LevelGroup } from '@/types';

const LEVEL_GROUPS: { id: 'All' | LevelGroup; label: string; badge: string }[] = [
  { id: 'All', label: 'All Levels', badge: 'All' },
  { id: 'Baby class to top class', label: 'Baby to Top Class', badge: 'Nursery' },
  { id: 'P.1 to P.4', label: 'P.1 to P.4', badge: 'Lower Primary' },
  { id: 'P.5 to P.7', label: 'P.5 to P.7', badge: 'Upper Primary' },
  { id: 'S.1 to S.4', label: 'S.1 to S.4', badge: 'O-Level' },
  { id: 'S.5 to S.6', label: 'S.5 to S.6', badge: 'A-Level' },
];

const SUBJECT_FILTERS: ('All' | Category)[] = [
  'All',
  'Science',
  'Math',
  'Languages',
  'Social Studies',
  'Digital Literacy',
];

const SUB_CLASSES_BY_GROUP: Record<LevelGroup, string[]> = {
  'Baby class to top class': ['Baby Class', 'Middle Class', 'Top Class'],
  'P.1 to P.4': ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4'],
  'P.5 to P.7': ['Primary 5', 'Primary 6', 'Primary 7'],
  'S.1 to S.4': ['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4'],
  'S.5 to S.6': ['Senior 5', 'Senior 6'],
};

export default function CoursesExplorer() {
  const searchParams = useSearchParams();
  const [levelGroup, setLevelGroup] = useState<'All' | LevelGroup>('All');
  const [subClass, setSubClass] = useState<string>('All');
  const [subject, setSubject] = useState<'All' | Category>('All');

  const paramQ = searchParams?.get('q') ?? '';
  const [prevParamQ, setPrevParamQ] = useState(paramQ);
  const [searchQuery, setSearchQuery] = useState(paramQ);

  if (paramQ !== prevParamQ) {
    setPrevParamQ(paramQ);
    setSearchQuery(paramQ);
  }

  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const courses = useMemo(
    () => coursesForClass(data?.courses ?? [], profile.educationLevel),
    [data?.courses, profile.educationLevel],
  );
  const progressByCourse = useMemo(
    () => new Map((data?.courseProgress ?? []).map((item) => [item.courseId, item])),
    [data?.courseProgress],
  );

  const availableSubClasses = useMemo(() => {
    if (levelGroup === 'All') return [];
    return SUB_CLASSES_BY_GROUP[levelGroup] ?? [];
  }, [levelGroup]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      // Level Group matching
      if (levelGroup !== 'All') {
        const matchesGroup =
          course.levelGroup === levelGroup ||
          (levelGroup === 'Baby class to top class' &&
            ['Baby Class', 'Middle Class', 'Top Class'].includes(course.level)) ||
          (levelGroup === 'P.1 to P.4' &&
            ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 1 to 4', 'Beginner to Intermediate'].includes(course.level)) ||
          (levelGroup === 'P.5 to P.7' &&
            ['Primary 5', 'Primary 6', 'Primary 7', 'Primary 5 to 7'].includes(course.level)) ||
          (levelGroup === 'S.1 to S.4' &&
            ['Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'O-Level'].includes(course.level)) ||
          (levelGroup === 'S.5 to S.6' &&
            ['Senior 5', 'Senior 6', 'A-Level'].includes(course.level));
        if (!matchesGroup) return false;
      }

      // Sub-class filter matching
      if (subClass !== 'All') {
        if (!course.level.toLowerCase().includes(subClass.toLowerCase())) return false;
      }

      // Subject filter matching
      if (subject !== 'All') {
        if (course.cat !== subject) return false;
      }

      // Search term matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = course.title.toLowerCase().includes(q);
        const matchesLevel = course.level.toLowerCase().includes(q);
        const matchesCat = course.cat.toLowerCase().includes(q);
        const matchesDesc = (course.description ?? '').toLowerCase().includes(q);
        const matchesAuthor = (course.author ?? '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesLevel && !matchesCat && !matchesDesc && !matchesAuthor) {
          return false;
        }
      }

      return true;
    });
  }, [courses, levelGroup, subClass, subject, searchQuery]);

  const resetFilters = () => {
    setLevelGroup('All');
    setSubClass('All');
    setSubject('All');
    setSearchQuery('');
  };

  return (
    <div className="space-y-5">
      {/* Search Input Bar */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[260px] flex-1">
          <span className="sr-only">Search courses</span>
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by topic, class, or keyword..."
            className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-4 text-[14px] shadow-sm placeholder:text-slate-400 focus:border-navy focus:outline-none"
          />
        </label>
        {(searchQuery || levelGroup !== 'All' || subClass !== 'All' || subject !== 'All') && (
          <button
            type="button"
            onClick={resetFilters}
            className="flex h-11 items-center gap-1.5 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* 1. Level Group Category Tabs (Baby class to top class, P.1 to P.4, P.5 to P.7, S.1 to S.4, S.5 to S.6) */}
      <div className="border-b border-line pb-1">
        <p className="mb-2.5 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-slate-500">
          <GraduationCap className="h-4 w-4 text-sun" /> Class Categories
        </p>
        <div
          role="tablist"
          aria-label="Education level categories"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none"
        >
          {LEVEL_GROUPS.map(({ id, label, badge }) => {
            const isSelected = levelGroup === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => {
                  setLevelGroup(id);
                  setSubClass('All');
                }}
                className={`flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[13.5px] font-bold transition sm:px-5 ${
                  isSelected
                    ? 'border-sun bg-sun text-navy shadow-sm'
                    : 'border-line bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    isSelected ? 'bg-navy/15 text-navy' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sub-Class Level Chips (e.g. Baby Class, Middle Class, Top Class, P.1, P.2, etc.) */}
      {availableSubClasses.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[12px] font-semibold text-slate-500">Specific Class:</span>
          <button
            type="button"
            onClick={() => setSubClass('All')}
            className={`h-8 rounded-full border px-3 text-[12px] font-semibold transition ${
              subClass === 'All'
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Classes
          </button>
          {availableSubClasses.map((sc) => (
            <button
              key={sc}
              type="button"
              onClick={() => setSubClass(sc)}
              className={`h-8 rounded-full border px-3 text-[12px] font-semibold transition ${
                subClass === sc
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {sc}
            </button>
          ))}
        </div>
      )}

      {/* 3. Subject Filter Chips */}
      <div role="group" aria-label="Subject filter" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {SUBJECT_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={subject === s}
            onClick={() => setSubject(s)}
            className={`h-8 shrink-0 rounded-lg border px-3 text-[12.5px] font-semibold transition ${
              subject === s
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-line bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-[13px] text-slate-500">
        <span>
          Showing <b>{filteredCourses.length}</b> courses
          {levelGroup !== 'All' ? ` in ${levelGroup}` : ''}
          {subject !== 'All' ? ` (${subject})` : ''}
        </span>
        <span className="text-[12px] text-slate-400">Materials sourced from Sharebility Uganda</span>
      </div>

      {/* Course Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => {
          const subjectMeta = SUBJECT_BY_CATEGORY[course.cat];
          const progress = progressByCourse.get(course.id);
          const completedCount = progress?.completedLessonIndexes?.length ?? 0;
          const totalLessons = course.lessons.length;
          const progressPct = totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0;

          return (
            <Card key={course.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
              <div className="relative h-[130px] overflow-hidden">
                <Image
                  src={`/images/${IMAGE_BY_CATEGORY[course.cat]}`}
                  alt=""
                  fill
                  sizes="340px"
                  className="object-cover"
                />
                <SubjectChip
                  label={course.cat}
                  color={SUBJECTS[subjectMeta]?.color || '#16A34A'}
                />
                {course.levelGroup && (
                  <span className="absolute bottom-3 left-3 rounded-full bg-navy/85 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur">
                    {course.levelGroup}
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[19px] font-extrabold leading-snug text-ink">{course.title}</h3>
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {course.emoji}
                  </span>
                </div>

                <p className="mt-1.5 text-[13px] font-semibold text-blue-700">
                  {course.level} • {course.cat}
                </p>

                {course.description && (
                  <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600">
                    {course.description}
                  </p>
                )}

                {course.sourceUrl && (
                  <a
                    href={course.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-navy hover:underline"
                  >
                    <span>Source: Sharebility</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                <div className="mt-auto pt-4">
                  {completedCount > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                        <span>Progress</span>
                        <span>{progressPct}% ({completedCount}/{totalLessons})</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-sun"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                      <BookOpen className="h-4 w-4 text-slate-400" />
                      {totalLessons} lessons
                    </span>
                    <Link
                      href={`/learning?course=${encodeURIComponent(course.id)}`}
                      aria-label={`Open course ${course.title}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-sun px-4 text-[13px] font-bold text-navy shadow-sm transition hover:bg-sun-dark"
                    >
                      <span>{completedCount > 0 ? 'Continue' : 'Learn'}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-4xl">📚</p>
            <h4 className="mt-3 text-[18px] font-bold text-navy">No courses match your criteria</h4>
            <p className="mt-1 text-sm text-slate-500">
              Try adjusting your class level filter, subject, or search term.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-sun px-5 text-sm font-bold text-navy"
            >
              <RotateCcw className="h-4 w-4" /> Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Check, ChevronDown, Clock, Sparkles, Trophy, X } from 'lucide-react';
import { Card, Coin, Ring } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/providers/LearnerDataSync';
import { coursesForClass } from '@/lib/course-access';
import { COURSES } from '@/data/courses';
import { useApp } from '@/store/useApp';
import LessonView from './LessonView';

export default function LearningPage() {
  const searchParams = useSearchParams();
  const requestedCourseId = searchParams?.get('course') ?? null;
  const { data, refresh } = useLearnerAccount();
  const profile = useLearnerProfile();
  const startCourse = useApp((state) => state.startCourse);
  const activeAppCourseId = useApp((state) => state.activeCourse);
  const [completionError, setCompletionError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);

  // Combine server courses with guaranteed client-side curriculum so library is never empty
  const allCourses = useMemo(() => {
    return (data?.courses && data.courses.length > 0) ? data.courses : COURSES;
  }, [data?.courses]);

  const classCourses = useMemo(() => {
    return coursesForClass(allCourses, profile.educationLevel);
  }, [allCourses, profile.educationLevel]);

  const availableCourses = useMemo(() => {
    return classCourses.length > 0 ? classCourses : allCourses;
  }, [classCourses, allCourses]);

  // Robust course selection
  const course = useMemo(() => {
    if (requestedCourseId) {
      return allCourses.find((item) => item.id === requestedCourseId);
    }
    if (activeAppCourseId) {
      const saved = allCourses.find((item) => item.id === activeAppCourseId);
      if (saved) return saved;
    }
    return availableCourses[0] ?? allCourses[0] ?? COURSES[0];
  }, [requestedCourseId, activeAppCourseId, availableCourses, allCourses]);

  useEffect(() => {
    if (course) startCourse(course.id);
  }, [course, startCourse]);

  // If a specific course was requested in URL but doesn't exist anywhere
  if (requestedCourseId && !course) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 shadow-xs sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
          Course not found
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          The requested course is not available. Explore the courses in your learning library below:
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableCourses.map((c) => (
            <Link
              key={c.id}
              href={`/learning?course=${encodeURIComponent(c.id)}`}
              className="flex flex-col rounded-xl border border-line bg-slate-50/60 p-4 transition hover:border-sun hover:bg-amber-50/30"
            >
              <span className="text-xs font-bold text-blue-700">{c.cat} · {c.level}</span>
              <span className="mt-1 font-bold text-slate-900 line-clamp-1">{c.title}</span>
              <span className="mt-2 text-xs text-slate-500">{c.lessons.length} lessons</span>
            </Link>
          ))}
        </div>
        <Link
          href="/courses"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />Back to All Courses
        </Link>
      </div>
    );
  }

  // Active course is guaranteed
  const activeCourse = course ?? COURSES[0];

  if (!activeCourse.lessons.length) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
        <h1 className="text-xl sm:text-2xl font-bold">{activeCourse.title}</h1>
        <p className="mt-2 text-sm text-slate-600">Lessons for this course are being prepared.</p>
        <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Back to courses
        </Link>
      </div>
    );
  }

  const progress = data?.courseProgress?.find((item) => item.courseId === activeCourse.id);
  const requestedLessonIndex = Number(searchParams?.get('lesson') ?? progress?.currentLessonIndex ?? 0);
  const lessonIndex = Math.min(
    Math.max(Number.isSafeInteger(requestedLessonIndex) ? requestedLessonIndex : 0, 0),
    activeCourse.lessons.length - 1,
  );
  const lesson = activeCourse.lessons[lessonIndex];
  const completedLessons = progress?.completedLessonIndexes ?? [];
  const isCompleted = completedLessons.includes(lessonIndex);
  const progressPercent = Math.round((completedLessons.length / activeCourse.lessons.length) * 100);

  async function completeLesson() {
    setIsCompleting(true);
    setCompletionError('');
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lessonComplete', courseId: activeCourse.id, lessonIndex }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? 'Could not save lesson progress.');
      }
      await refresh();
    } catch (error) {
      useApp.getState().completeLesson(activeCourse.id, lessonIndex, 10);
      useApp.getState().touchStreak();
      void refresh().catch(() => null);
      const msg = error instanceof Error ? error.message : 'Could not save lesson progress.';
      if (msg.toLowerCase().includes('mongodb') || msg.toLowerCase().includes('connect') || msg.toLowerCase().includes('sync')) {
        setCompletionError('Lesson marked complete locally. Progress will sync when connection is restored.');
      } else {
        setCompletionError(msg);
      }
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6">
      {/* Breadcrumb & Course Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs sm:text-[13.5px]">
          <Link href="/courses" className="flex items-center gap-1.5 font-bold text-navy hover:underline">
            <ArrowLeft className="h-4 w-4" />Back to Courses
          </Link>
          <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
          <span className="truncate text-slate-500 font-medium">{activeCourse.cat}</span>
        </nav>

        {/* Quick Course Switcher Dropdown Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLibraryModal((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-xs transition hover:border-sun hover:bg-amber-50/50 dark:border-white/10 dark:bg-navy-2/90 dark:text-slate-100"
          >
            <BookOpen className="h-3.5 w-3.5 text-sun" />
            <span>Library Courses ({availableCourses.length})</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>

          {/* Dropdown Menu of Available Courses */}
          {showLibraryModal && (
            <div className="absolute right-0 top-full z-40 mt-2 w-80 max-h-96 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-2xl backdrop-blur dark:bg-navy-2 dark:border-white/15">
              <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs font-bold text-navy dark:border-white/10 dark:text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-sun" />
                  <span>Your Learning Library</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-line/60 dark:divide-white/5 py-1">
                {availableCourses.map((c) => {
                  const isSelected = c.id === activeCourse.id;
                  return (
                    <Link
                      key={c.id}
                      href={`/learning?course=${encodeURIComponent(c.id)}`}
                      onClick={() => setShowLibraryModal(false)}
                      className={`flex flex-col rounded-xl px-3 py-2.5 text-xs transition ${
                        isSelected
                          ? 'bg-amber-50 text-navy font-bold dark:bg-amber-950/40 dark:text-amber-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate font-semibold">{c.title}</span>
                        <span className="shrink-0 text-[10px] text-slate-400">{c.level}</span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{c.cat} · {c.lessons.length} lessons</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Course Header */}
      <div>
        <span className="inline-block max-w-full truncate rounded-full bg-[#E5EFFE] px-3.5 py-1 text-xs font-bold text-blue-700">
          {activeCourse.cat} · {activeCourse.level}
        </span>
        <h1 className="mt-2 break-words text-2xl font-extrabold leading-tight text-slate-900 sm:text-[30px]">
          {activeCourse.title}
        </h1>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 sm:text-[13.5px]">
          Work through the lesson activities, practise what you learn, and complete the quiz to save your progress.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-[13px] text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold">
            <BookOpen className="h-4 w-4 text-slate-400" />Lesson {lessonIndex + 1} of {activeCourse.lessons.length}
          </span>
          <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />Self-paced
          </span>
        </div>
      </div>

      {completionError ? (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs sm:text-sm text-red-800">
          {completionError}
        </p>
      ) : null}

      {/* Lesson View */}
      <LessonView
        courseId={activeCourse.id}
        lesson={lesson}
        lessonIndex={lessonIndex}
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        onComplete={completeLesson}
      />

      {/* Bottom info strip: Keep Learning + Course Progress in flex row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        <div className="flex flex-1 items-start gap-3.5 rounded-2xl bg-[#E9F3FD] p-4 sm:p-5">
          <Trophy className="h-9 w-9 shrink-0 text-sun mt-0.5" />
          <div className="min-w-0 flex-1">
            <b className="block text-[15px] text-navy">Keep learning!</b>
            <p className="mt-0.5 text-xs leading-snug text-slate-600">Completing a lesson earns 10 coins &amp; 10 XP.</p>
            <div className="mt-3 flex items-center gap-2 border-t border-blue-100/80 pt-2.5 text-xs font-medium text-slate-600">
              <Coin size={18} />
              <span className="min-w-0 truncate">Rewards saved to learner account</span>
            </div>
          </div>
        </div>

        <Card className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-navy">
            <ChartNoAxesColumn className="h-5 w-5 shrink-0 text-blue-600" />Course Progress
          </h2>
          <div className="flex items-center gap-4">
            <Ring v={progressPercent} size={72} stroke={7}>
              <span className="text-[16px] font-extrabold">{progressPercent}%</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 sm:text-[13.5px]">
                {completedLessons.length} of {activeCourse.lessons.length} completed
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Progress saved automatically</p>
            </div>
          </div>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {activeCourse.lessons.map((item, index) => {
              const complete = completedLessons.includes(index);
              return (
                <li key={`${activeCourse.id}-${index}`}>
                  <Link
                    href={`/learning?course=${encodeURIComponent(activeCourse.id)}&lesson=${index}`}
                    aria-current={index === lessonIndex ? 'step' : undefined}
                    className={`flex min-h-[42px] min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-[12.5px] font-medium transition ${
                      index === lessonIndex ? 'bg-[#FFF3D0] text-navy font-bold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10px] font-bold ${complete ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>
                      {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 line-clamp-2 leading-snug">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}

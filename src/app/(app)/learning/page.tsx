'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Check, Clock, Trophy } from 'lucide-react';
import { Card, Coin, Ring } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/providers/LearnerDataSync';
import { coursesForClass } from '@/lib/course-access';
import { useApp } from '@/store/useApp';
import LessonView from './LessonView';

export default function LearningPage() {
  const searchParams = useSearchParams();
  const requestedCourseId = searchParams.get('course');
  const { data, refresh } = useLearnerAccount();
  const profile = useLearnerProfile();
  const startCourse = useApp((state) => state.startCourse);
  const [completionError, setCompletionError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const courses = coursesForClass(data?.courses ?? [], profile.educationLevel);
  const course = courses.find((item) => item.id === requestedCourseId) ?? (requestedCourseId ? undefined : courses[0]);

  useEffect(() => {
    if (course) startCourse(course.id);
  }, [course, startCourse]);

  if (requestedCourseId && !course) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-xl sm:text-2xl font-bold">This course isn&apos;t available for your class.</h1>
        <p className="mt-2 text-sm text-slate-600">Browse courses selected for {profile.educationLevel}.</p>
        <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Back to courses
        </Link>
      </div>
    );
  }

  if (!course) {
    return <p className="rounded-2xl border border-line bg-white p-6 text-sm text-slate-600">Loading your learning library…</p>;
  }
  const activeCourse = course;

  if (!activeCourse.lessons.length) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-xl sm:text-2xl font-bold">{activeCourse.title}</h1>
        <p className="mt-2 text-sm text-slate-600">Lessons for this course are being prepared.</p>
        <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
          <ArrowLeft className="h-4 w-4" />Back to courses
        </Link>
      </div>
    );
  }

  const progress = data?.courseProgress.find((item) => item.courseId === activeCourse.id);
  const requestedLessonIndex = Number(searchParams.get('lesson') ?? progress?.currentLessonIndex ?? 0);
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
    <div className="mx-auto flex max-w-[860px] flex-col gap-5">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs sm:text-[13.5px]">
        <Link href="/courses" className="flex items-center gap-1.5 font-bold text-navy hover:underline">
          <ArrowLeft className="h-4 w-4" />Back to Courses
        </Link>
        <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
        <span className="truncate text-slate-500 font-medium">{activeCourse.cat}</span>
      </nav>

      {/* ── Course Header ── */}
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

      {/* ── Lesson Content (full width) ── */}
      <LessonView
        courseId={activeCourse.id}
        lesson={lesson}
        lessonIndex={lessonIndex}
        isCompleted={isCompleted}
        isCompleting={isCompleting}
        onComplete={completeLesson}
      />

      {/* ── Bottom info strip: Keep Learning + Course Progress ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
        {/* Keep Learning card */}
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

        {/* Course Progress card */}
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
          {/* Lesson list */}
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

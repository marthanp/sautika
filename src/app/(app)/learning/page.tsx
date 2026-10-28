'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Check, Clock, Trophy } from 'lucide-react';
import { Card, Coin, Ring } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
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
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs sm:text-[13.5px]">
          <Link href="/courses" className="flex items-center gap-1.5 font-bold text-navy hover:underline">
            <ArrowLeft className="h-4 w-4" />Back to Courses
          </Link>
          <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
          <span className="truncate text-slate-500 font-medium">{activeCourse.cat}</span>
        </nav>
        <div className="mt-3 sm:mt-4">
          <span className="inline-block max-w-full truncate rounded-full bg-[#E5EFFE] px-3.5 py-1 text-xs font-bold text-blue-700">
            {activeCourse.cat} · {activeCourse.level}
          </span>
          <h1 className="mt-2.5 break-words text-2xl font-extrabold leading-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
            {activeCourse.title}
          </h1>
          <p className="mt-2 max-w-[650px] text-xs leading-relaxed text-slate-600 sm:text-[14px]">
            Work through the lesson activities, practise what you learn, and complete the quiz to save your progress.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-[13px] text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold">
              <BookOpen className="h-4 w-4 text-slate-500" />Lesson {lessonIndex + 1} of {activeCourse.lessons.length}
            </span>
            <span className="hidden h-3.5 w-px bg-slate-300 sm:block" />
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />Self-paced
            </span>
          </div>
        </div>
        {completionError ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs sm:text-sm text-red-800">{completionError}</p> : null}
        <LessonView
          courseId={activeCourse.id}
          lesson={lesson}
          lessonIndex={lessonIndex}
          isCompleted={isCompleted}
          isCompleting={isCompleting}
          onComplete={completeLesson}
        />
      </div>
      <aside className="min-w-0 space-y-4 xl:col-span-4">
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2.5 text-[16px] sm:text-[17px] font-extrabold text-navy">
            <ChartNoAxesColumn className="h-6 w-6 shrink-0 text-blue-600" />Course Progress
          </h2>
          <div className="mt-3.5 flex items-center gap-3.5 border-b border-line pb-4">
            <Ring v={progressPercent} size={84} stroke={8}><span className="text-[18px] sm:text-[20px] font-extrabold">{progressPercent}%</span></Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-[14px] font-bold text-slate-800">{completedLessons.length} of {activeCourse.lessons.length} completed</p>
              <p className="mt-0.5 text-xs text-slate-500">Progress saved automatically</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1">
            {activeCourse.lessons.map((item, index) => {
              const complete = completedLessons.includes(index);
              return (
                <li key={`${activeCourse.id}-${index}`}>
                  <Link
                    href={`/learning?course=${encodeURIComponent(activeCourse.id)}&lesson=${index}`}
                    aria-current={index === lessonIndex ? 'step' : undefined}
                    className={`flex min-h-[44px] min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-[13px] font-medium transition ${
                      index === lessonIndex ? 'bg-[#FFF3D0] text-navy font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 text-[10.5px] font-bold ${complete ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>
                      {complete ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 break-words line-clamp-2 leading-snug">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="rounded-2xl bg-[#E9F3FD] p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <Trophy className="h-10 w-10 shrink-0 text-sun" />
            <div className="min-w-0 flex-1">
              <b className="block text-[17px] text-navy">Keep learning!</b>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">Completing a lesson earns 10 coins &amp; 10 XP.</p>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2.5 border-t border-blue-100/80 pt-3 text-xs font-medium text-slate-700">
            <Coin size={22} />
            <span className="min-w-0 flex-1 truncate">Rewards saved to learner account</span>
          </div>
        </div>
      </aside>
    </div>
  );
}

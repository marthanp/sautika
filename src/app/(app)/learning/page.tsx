'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Check, Clock, Trophy } from 'lucide-react';
import { Card, Coin, Ring } from '@/components/ui';
import { useLearnerAccount } from '@/components/LearnerDataSync';
import { useApp } from '@/store/useApp';
import LessonView from './LessonView';

export default function LearningPage() {
  const searchParams = useSearchParams();
  const requestedCourseId = searchParams.get('course');
  const { data, refresh } = useLearnerAccount();
  const startCourse = useApp((state) => state.startCourse);
  const [completionError, setCompletionError] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const courses = data?.courses ?? [];
  const course = courses.find((item) => item.id === requestedCourseId) ?? courses[0];

  useEffect(() => {
    if (course) startCourse(course.id);
  }, [course, startCourse]);

  if (!course) {
    return <p className="rounded-2xl border border-line bg-white p-6 text-slate-600">Loading your learning library…</p>;
  }

  if (!course.lessons.length) {
    return (
      <div className="rounded-2xl border border-line bg-white p-6">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        <p className="mt-2 text-slate-600">Lessons for this course are being prepared.</p>
        <Link href="/courses" className="mt-4 inline-flex items-center gap-2 font-semibold text-blue-700"><ArrowLeft className="h-4 w-4" />Back to courses</Link>
      </div>
    );
  }

  const progress = data?.courseProgress.find((item) => item.courseId === course.id);
  const requestedLessonIndex = Number(searchParams.get('lesson') ?? progress?.currentLessonIndex ?? 0);
  const lessonIndex = Math.min(
    Math.max(Number.isSafeInteger(requestedLessonIndex) ? requestedLessonIndex : 0, 0),
    course.lessons.length - 1,
  );
  const lesson = course.lessons[lessonIndex];
  const completedLessons = progress?.completedLessonIndexes ?? [];
  const isCompleted = completedLessons.includes(lessonIndex);
  const progressPercent = Math.round((completedLessons.length / course.lessons.length) * 100);

  async function completeLesson() {
    setIsCompleting(true);
    setCompletionError('');
    try {
      const response = await fetch('/api/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lessonComplete', courseId: course.id, lessonIndex }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? 'Could not save lesson progress.');
      }
      await refresh();
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : 'Could not save lesson progress.');
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-[14px]">
          <Link href="/courses" className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back to Courses</Link>
          <span className="hidden h-4 w-px bg-slate-300 sm:block" /><span className="text-slate-600">{course.cat}</span>
        </nav>
        <div className="mt-4">
          <span className="inline-block rounded-full bg-[#E5EFFE] px-4 py-1.5 text-[14px] font-bold text-blue-700">{course.cat} · {course.level}</span>
          <h1 className="mt-4 text-[31px] font-extrabold leading-[1.15] sm:text-[38px]">{course.title}</h1>
          <p className="mt-4 max-w-[650px] text-[15px] leading-relaxed text-slate-500 sm:text-[16px]">Work through the lesson activities, practise what you learn, and complete the quiz to save your progress.</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-slate-600">
            <span className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Lesson {lessonIndex + 1} of {course.lessons.length}</span>
            <span className="hidden h-5 w-px bg-slate-300 sm:block" /><span className="flex items-center gap-2"><Clock className="h-5 w-5" />Self-paced</span>
          </div>
        </div>
        {completionError ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{completionError}</p> : null}
        <LessonView
          courseId={course.id}
          lesson={lesson}
          lessonIndex={lessonIndex}
          isCompleted={isCompleted}
          isCompleting={isCompleting}
          onComplete={completeLesson}
        />
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <Card className="p-6">
          <h2 className="flex items-center gap-3 text-[18px] font-extrabold"><ChartNoAxesColumn className="h-7 w-7 text-blue-600" />Course Progress</h2>
          <div className="mt-4 flex items-center gap-4">
            <Ring v={progressPercent} size={104} stroke={9}><span className="text-[22px]">{progressPercent}%</span></Ring>
            <div className="flex-1"><p className="text-[17px] font-semibold">{completedLessons.length} of {course.lessons.length} lessons completed</p><p className="mt-2 text-sm text-slate-500">Progress is saved to your account.</p></div>
          </div>
          <ul className="mt-5 space-y-1">
            {course.lessons.map((item, index) => {
              const complete = completedLessons.includes(index);
              return (
                <li key={`${course.id}-${index}`}>
                  <Link
                    href={`/learning?course=${encodeURIComponent(course.id)}&lesson=${index}`}
                    aria-current={index === lessonIndex ? 'step' : undefined}
                    className={`flex min-h-[50px] items-center gap-3 rounded-lg px-2 text-[14px] font-medium ${index === lessonIndex ? 'bg-[#FFF3D0]' : 'hover:bg-slate-50'}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${complete ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>{complete ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}</span>
                    <span className="flex-1">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
        <div className="rounded-2xl bg-[#E9F3FD] p-6">
          <div className="flex items-center gap-4"><Trophy className="h-12 w-12 shrink-0 text-sun" /><div><b className="text-[21px]">Keep learning!</b><p className="mt-1 text-[14px] leading-snug text-slate-600">Completing a lesson earns 10 coins and 10 XP.</p></div></div>
          <div className="mt-4 flex items-center gap-3 border-t border-blue-100 pt-4 text-[14px] font-medium"><Coin size={26} /><span className="flex-1">Rewards are saved to your learner account</span></div>
        </div>
      </aside>
    </div>
  );
}

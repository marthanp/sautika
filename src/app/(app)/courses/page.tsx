'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowRight, BookOpen, ChartNoAxesColumn, GraduationCap, Star } from 'lucide-react';
import { Bar, Card, Ring } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { SUBJECT_BY_CATEGORY } from '@/lib/course-display';
import { coursesForClass } from '@/lib/course-access';
import type { Category } from '@/types';
import CoursesExplorer from './CoursesExplorer';

export default function CoursesPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const courses = coursesForClass(data?.courses ?? [], profile.educationLevel);
  const progressByCourse = new Map((data?.courseProgress ?? []).map((item) => [item.courseId, item]));
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  const completedLessons = courses.reduce(
    (total, course) => total + (progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0),
    0,
  );
  const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const categoryProgress = new Map<Category, { done: number; total: number }>();
  for (const course of courses) {
    const current = categoryProgress.get(course.cat) ?? { done: 0, total: 0 };
    current.total += course.lessons.length;
    current.done += progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
    categoryProgress.set(course.cat, current);
  }

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-slate-500 sm:text-[13px]"><GraduationCap className="h-4 w-4 text-sun-dark" />OUR COURSES</p>
            <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900 sm:text-[34px] lg:text-[38px]">Explore Courses</h1>
            <p className="mt-0.5 text-xs text-slate-500 sm:text-[14px]">Choose a subject and start your learning journey.</p>
          </div>
          <div className="relative flex w-full max-w-[340px] items-center gap-3.5 overflow-hidden rounded-2xl bg-[#FEF8DE] p-4 sm:p-5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sun sm:h-14 sm:w-14">
              <BookOpen className="h-6 w-6 text-navy sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[17px] sm:text-[19px] leading-tight">Keep Learning!</b>
              <p className="mt-0.5 truncate text-[11.5px] text-slate-600 sm:text-xs">Small steps lead to big dreams.</p>
              <Link href="/learning" className="mt-2.5 inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sun px-3 text-xs font-bold text-navy shadow-xs transition hover:bg-sun-dark">
                Continue Learning <ArrowRight className="h-3 w-3 shrink-0" />
              </Link>
            </div>
            <Image src="/images/promo-plant.png" alt="" width={70} height={70} className="absolute bottom-0 right-1 hidden h-auto w-16 sm:block opacity-75" />
          </div>
        </div>
        <Suspense fallback={<p className="py-8 text-center text-slate-500">Loading courses…</p>}>
          <div className="mt-5">
            <CoursesExplorer />
          </div>
        </Suspense>
      </div>
      <aside className="min-w-0 space-y-4 xl:col-span-3">
        <Card className="p-4 sm:p-5">
          <h2 className="flex items-center gap-2.5 text-[16px] sm:text-[17px] font-extrabold">
            <ChartNoAxesColumn className="h-6 w-6 shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">Your Progress</span>
              <span className="block text-[11px] font-medium text-slate-500 truncate">Making great progress!</span>
            </span>
          </h2>
          <div className="mt-4 flex items-center gap-3.5 border-b border-line pb-4 sm:gap-4 sm:pb-5">
            <Ring v={completion} size={84} stroke={8}>
              <span className="text-[20px] font-extrabold">{completion}%</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <b className="block text-sm sm:text-[15px]">Overall Progress</b>
              <p className="mt-0.5 text-xs text-slate-500">{completedLessons} of {totalLessons} completed</p>
            </div>
          </div>
          <ul className="mt-4 space-y-3.5">
            {Array.from(categoryProgress, ([category, values]) => {
              const subject = SUBJECT_BY_CATEGORY[category];
              const { icon: Icon, color } = SUBJECTS[subject];
              const percent = values.total ? Math.round((values.done / values.total) * 100) : 0;
              return (
                <li key={category} className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white shadow-xs" style={{ background: color }}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center justify-between gap-1.5 text-xs font-bold">
                      <span className="truncate">{category}</span>
                      <span className="shrink-0 font-medium text-slate-500">{values.done}/{values.total}</span>
                    </p>
                    <Bar v={percent} color={color} className="mt-1 h-1.5" />
                  </div>
                </li>
              );
            })}
          </ul>
          <Link href="/progress" className="mt-5 flex items-center gap-2.5 rounded-xl bg-[#EAF4FE] p-3 text-xs transition hover:bg-blue-100/80">
            <Star className="h-5 w-5 shrink-0 text-blue-600" />
            <span className="min-w-0 flex-1">
              <b className="block text-[13px] text-blue-700 leading-tight">You&apos;re doing great!</b>
              <span className="block text-[11px] text-slate-600 leading-tight">Complete lessons to earn coins.</span>
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-blue-600" />
          </Link>
        </Card>
      </aside>
    </div>
  );
}

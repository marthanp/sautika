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
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="flex items-center gap-2 text-[13px] font-bold"><GraduationCap className="h-5 w-5 text-sun" />OUR COURSES</p>
            <h1 className="mt-1 text-[32px] font-extrabold leading-tight sm:text-[40px]">Explore Courses</h1>
            <p className="mt-1 text-[15px] text-slate-500 sm:text-[17px]">Choose a subject and start your learning journey.</p>
          </div>
          <div className="relative flex w-full max-w-[355px] items-center gap-4 overflow-hidden rounded-2xl bg-[#FEF8DE] p-5">
            <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full bg-sun sm:h-[68px] sm:w-[68px]"><BookOpen className="h-7 w-7 text-white sm:h-8 sm:w-8" /></span>
            <div className="min-w-0"><b className="text-[20px] sm:text-[22px]">Keep Learning!</b><p className="mt-0.5 text-[12px] text-slate-600 sm:text-[13px]">Small steps every day lead to big dreams.</p>
              <Link href="/learning" className="mt-3 inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sun px-2.5 text-[12px] font-bold sm:gap-2 sm:px-4 sm:text-[13px]">Continue Learning <ArrowRight className="h-3.5 w-3.5 shrink-0" /></Link></div>
            <Image src="/images/promo-plant.png" alt="" width={70} height={70} className="absolute bottom-0 right-1 hidden h-auto w-[70px] sm:block" />
          </div>
        </div>
        <Suspense fallback={<p className="py-8 text-center text-slate-500">Loading courses…</p>}>
          <CoursesExplorer />
        </Suspense>
      </div>
      <aside className="min-w-0 space-y-4 xl:col-span-3 xl:mt-1">
        <Card className="p-6">
          <h2 className="flex items-center gap-3 text-[18px] font-extrabold"><ChartNoAxesColumn className="h-8 w-8 text-blue-600" /><span>Your Learning Progress<span className="block text-[12px] font-medium text-slate-500">Keep going! You&apos;re making great progress.</span></span></h2>
          <div className="mt-5 flex items-center gap-5 border-b border-line pb-5"><Ring v={completion} size={104} stroke={9}><span className="text-[26px]">{completion}%</span></Ring><div><b className="text-[16px]">Overall Progress</b><p className="mt-1 text-[12px] text-slate-500">{completedLessons} of {totalLessons} lessons completed</p></div></div>
          <ul className="mt-5 space-y-5">
            {Array.from(categoryProgress, ([category, values]) => {
              const subject = SUBJECT_BY_CATEGORY[category];
              const { icon: Icon, color } = SUBJECTS[subject];
              const percent = values.total ? Math.round((values.done / values.total) * 100) : 0;
              return (
                <li key={category} className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full text-white" style={{ background: color }}><Icon className="h-5 w-5" /></span>
                  <div className="flex-1"><p className="flex justify-between text-[13px] font-bold">{category}<span className="font-medium text-slate-500">{values.done}/{values.total}</span></p><Bar v={percent} color={color} className="mt-1.5 h-1.5" /></div></li>
              );
            })}
          </ul>
          <Link href="/progress" className="mt-6 flex items-center gap-3 rounded-xl bg-[#EAF4FE] p-4 text-[12.5px]"><Star className="h-6 w-6 shrink-0 text-blue-600" /><span><b className="block text-[14px] text-blue-700">You&apos;re doing great!</b>Complete more lessons to earn coins and keep your streak alive.</span><ArrowRight className="h-4 w-4 shrink-0 text-blue-600" /></Link>
        </Card>
      </aside>
    </div>
  );
}

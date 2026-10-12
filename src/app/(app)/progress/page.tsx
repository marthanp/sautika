'use client';

import Image from 'next/image';
import { ArrowRight, BookOpen, Calendar, Clock, Flame, Sprout, Star, Target, Trophy } from 'lucide-react';
import { Bar, Card, Coin, ViewAll } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { SUBJECT_BY_CATEGORY } from '@/lib/course-display';

export default function ProgressPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const courses = data?.courses ?? [];
  const progressByCourse = new Map((data?.courseProgress ?? []).map((item) => [item.courseId, item]));
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  const completedLessons = courses.reduce(
    (total, course) => total + (progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0),
    0,
  );
  const completedCourses = courses.filter((course) => {
    const progress = progressByCourse.get(course.id);
    return course.lessons.length > 0 && (progress?.completedLessonIndexes.length ?? 0) >= course.lessons.length;
  }).length;
  const completion = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <p className="text-[19px] font-bold">Hello, {profile?.firstName || 'Learner'}! 👋</p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight sm:text-[36px] lg:text-[40px]">Your Learning Progress</h1>
        <p className="mt-2 text-[16px] text-slate-500">Track your progress, celebrate your achievements, and keep going!</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-[#EEF5FE] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white"><BookOpen className="h-5 w-5" /></span>Courses Completed</p><p className="mt-4 text-[34px] font-extrabold">{completedCourses} <span className="text-[22px] font-medium text-slate-500">/ {courses.length}</span></p><div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar v={courses.length ? (completedCourses / courses.length) * 100 : 0} color="#2F6BFF" /></div><span className="text-[12px] font-bold text-blue-600">{courses.length ? Math.round((completedCourses / courses.length) * 100) : 0}%</span></div></div>
          <div className="rounded-2xl border border-amber-100 bg-[#FEF8E8] p-5"><p className="flex items-center gap-3 text-[14px] font-semibold"><Star className="h-9 w-9 fill-sun text-sun" />Learner Coins</p><p className="mt-4 flex items-center justify-between text-[34px] font-extrabold">{profile?.coins ?? 0}<Coin size={36} /></p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-600">Earn coins by completing lessons</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-[#EAF8F0] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><Flame className="h-9 w-9 fill-blue-500 text-blue-600" />Current Streak</p><p className="mt-4 text-[34px] font-extrabold">{profile?.streak ?? 0} days</p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700"><Calendar className="h-4 w-4" />Keep it up!</p></div>
          <div className="rounded-2xl border border-violet-100 bg-[#F4EFFE] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white"><Target className="h-5 w-5" /></span>Overall Progress</p><p className="mt-4 text-[34px] font-extrabold">{completion}%</p><div className="mt-3"><Bar v={completion} color="#6D4DFF" /></div><p className="mt-2 text-[12px] text-slate-600">{completedLessons} of {totalLessons} lessons</p></div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[19px] font-extrabold"><BookOpen className="h-6 w-6 text-blue-600" />Course Progress</h2><ViewAll>View Courses</ViewAll></div>
            <ul className="mt-5 space-y-5">{courses.map((course) => {
              const subject = SUBJECT_BY_CATEGORY[course.cat];
              const { icon: Icon, color } = SUBJECTS[subject];
              const done = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
              const percent = course.lessons.length ? Math.round((done / course.lessons.length) * 100) : 0;
              return (
                <li key={course.id} className="flex items-center gap-4"><span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><Icon className="h-6 w-6" /></span>
                  <div className="flex-1"><p className="text-[14px] font-semibold">{course.title}</p><Bar v={percent} color={color} className="mt-2 h-2" /></div><b className="w-10 text-[13px]">{percent}%</b><span className="hidden w-[80px] text-[12px] text-slate-500 sm:block">{done}/{course.lessons.length}</span></li>
              );
            })}{!courses.length ? <li className="text-sm text-slate-500">Course progress will appear here as you learn.</li> : null}</ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[19px] font-extrabold"><Clock className="h-6 w-6" />Recent Activity</h2><ViewAll /></div>
            <ul className="mt-3 divide-y divide-line">{(data?.activity ?? []).map((activity) => (
              <li key={activity.id} className="flex items-center gap-3 py-3.5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-600 text-white">{activity.type === 'lesson' ? <BookOpen className="h-5 w-5" /> : <Star className="h-5 w-5" />}</span><span className="flex-1 text-[14px] font-semibold leading-tight">{activity.title}<span className="mt-1 block text-[12px] font-normal text-slate-500">{new Date(activity.date).toLocaleDateString()}</span></span>
                <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${activity.amount < 0 ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700'}`}>{activity.type === 'lesson' ? `+${activity.amount} XP` : `${activity.amount > 0 ? '+' : ''}${activity.amount} coins`}</span></li>
            ))}{!data?.activity.length ? <li className="py-4 text-sm text-slate-500">Your learning and coin activity will appear here.</li> : null}</ul>
          </Card>
        </div>
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="relative aspect-[392/256] overflow-hidden rounded-2xl">
          <Image src="/images/progress-banner.jpg" alt="Aisha looking at the mountains at sunset. Small steps today, big dreams tomorrow." fill sizes="(min-width: 1280px) 30vw, 100vw" priority className="object-cover" />
        </div>
        <div className="rounded-2xl bg-[#FEF6DC] p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Trophy className="h-7 w-7 text-sun" />Your Achievements</h2><ViewAll /></div>
          <p className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">Achievements will appear here as you complete learning milestones.</p></div>
        <div className="flex items-center gap-4 rounded-2xl bg-[#E9F3FD] p-5"><Sprout className="h-9 w-9 shrink-0 text-emerald-600" /><div className="flex-1"><b className="text-[16px]">You&apos;re making great progress!</b><p className="mt-1 text-[13px] leading-snug text-slate-600">Keep learning, {profile?.firstName || 'Learner'}. Your efforts are building a brighter future.</p></div><ArrowRight className="h-4 w-4 text-blue-600" /></div>
      </aside>
    </div>
  );
}

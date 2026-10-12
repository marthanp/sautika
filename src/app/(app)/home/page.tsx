'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronRight, NotepadText, Play, Sprout, Star } from 'lucide-react';
import { Bar, Card, Ring, SubjectChip } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { IMAGE_BY_CATEGORY, SUBJECT_BY_CATEGORY } from '@/lib/course-display';

const TILES = [
  { href: '/courses', title: 'Courses', text: 'Explore subjects, choose a course and start your learning journey.', bg: 'bg-[#EFF6FE]', disc: 'bg-[#1769E8]', tc: 'text-[#1757C8]', icon: BookOpen },
  { href: '/learning', title: 'Learning', text: 'Watch, listen and interact with AI tutor in your language.', bg: 'bg-[#FCF6E8]', disc: 'bg-[#FFC400]', tc: 'text-navy', icon: Play },
  { href: '/notebook', title: 'Notebook', text: 'Save notes, key points and review anytime.', bg: 'bg-[#F5F0FE]', disc: 'bg-[#9B4DF5]', tc: 'text-[#6D28D9]', icon: NotepadText },
] as const;

export default function HomePage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const courses = data?.courses ?? [];
  const progressByCourse = new Map((data?.courseProgress ?? []).map((item) => [item.courseId, item]));
  const today = new Date().toDateString();
  const lessonsCompletedToday = (data?.activity ?? []).filter((activity) =>
    activity.type === 'lesson' && new Date(activity.date).toDateString() === today,
  ).length;

  return (
    <div className="mx-auto max-w-[1330px] space-y-5 sm:space-y-6">
      <section className="relative min-h-[260px] overflow-hidden rounded-3xl border border-line bg-[#FBF7EE] sm:min-h-[300px]">
        <div className="absolute inset-y-0 right-0 w-full opacity-40 md:w-1/2 md:opacity-100">
          <Image src="/images/home-hero.jpg" alt="Aisha smiling, looking up" fill priority sizes="60vw" className="object-cover object-right [mask-image:linear-gradient(to_right,transparent_35%,#000_100%)]" />
        </div>
        <div className="relative max-w-[560px] p-5 sm:p-8 md:max-w-[64%] md:p-10">
          <p className="text-[18px] font-semibold sm:text-[20px]">Hello, {profile?.firstName || 'Learner'}! 👋</p>
          <h1 className="mt-3 text-[30px] font-extrabold leading-[1.15] tracking-tight sm:text-[36px] md:text-[46px]">Small steps today,<br /><span className="text-sun">big dreams tomorrow.</span></h1>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:mt-5 sm:text-[17px]">Keep learning, stay curious, and reach your goals.<br />You&apos;re doing great!</p>
          <Link href="/rewards" className="mt-5 inline-flex max-w-full items-center gap-2.5 rounded-full bg-[#FFF0C5] px-4 py-2.5 text-[14px] font-semibold sm:gap-3 sm:text-[16px]"><Star className="h-5 w-5 shrink-0 fill-sun text-sun sm:h-6 sm:w-6" /><span className="whitespace-nowrap">You have <b>{profile?.coins ?? 0}</b> learner coins</span><ChevronRight className="h-4 w-4 shrink-0" /></Link>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-3">
        {TILES.map(({ href, title, text, bg, disc, tc, icon: Icon }) => (
          <Link key={title} href={href} className={`flex min-w-0 flex-col items-start gap-4 rounded-2xl border border-line p-5 sm:p-6 2xl:flex-row 2xl:items-center 2xl:gap-5 ${bg}`}>
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-white sm:h-[76px] sm:w-[76px] ${disc}`}><Icon className={`h-7 w-7 sm:h-9 sm:w-9 ${title === 'Learning' ? 'fill-white' : ''}`} strokeWidth={1.8} /></span>
            <span className="min-w-0 flex-1"><b className={`block text-[22px] leading-tight sm:text-[24px] ${tc}`}>{title}</b><span className="mt-1 block text-[14px] leading-snug text-slate-600 sm:text-[15px]">{text}</span></span>
            <span className={`grid h-9 w-9 shrink-0 place-items-center self-end rounded-full text-white 2xl:self-auto ${disc}`}><ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-9">
          <div className="flex items-end justify-between">
            <div><h2 className="text-[26px] font-extrabold">Continue Learning</h2><p className="mt-1 text-[15px] text-slate-600">Pick up where you left off or explore something new.</p></div>
            <Link href="/courses" className="hidden items-center gap-1 text-[13px] font-bold sm:inline-flex">View All Courses <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {courses.slice(0, 4).map((course) => {
              const subject = SUBJECT_BY_CATEGORY[course.cat];
              const done = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
              const total = course.lessons.length;
              return (
              <Card key={course.id} className="overflow-hidden">
                <div className="relative h-[117px]"><Image src={`/images/${IMAGE_BY_CATEGORY[course.cat]}`} alt="" fill sizes="260px" className="object-cover" /><SubjectChip label={course.cat} color={SUBJECTS[subject].color} /></div>
                <div className="p-4">
                  <h3 className="text-[17px] font-extrabold">{course.title}</h3>
                  <p className="mt-1 text-[14px] text-slate-500">{course.level} • {course.cat}</p>
                  <div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar v={total ? (done / total) * 100 : 0} className="h-1.5" /><p className="mt-2 text-[12px] text-slate-500">{done}/{total} lessons</p></div>
                    <Link href={`/learning?course=${encodeURIComponent(course.id)}`} aria-label={`Continue ${course.title}`} className="grid h-9 w-9 place-items-center rounded-full bg-sun"><Play className="h-4 w-4 fill-navy text-navy" /></Link></div>
                </div>
              </Card>
              );
            })}
            {!courses.length ? <p className="text-sm text-slate-500">Your course library is loading.</p> : null}
          </div>
        </div>
        <div className="space-y-4 xl:col-span-3 xl:mt-[56px]">
          <div className="flex items-center justify-between rounded-2xl bg-[#E7FBF2] p-5"><div><Sprout className="h-7 w-7 text-emerald-600" /><b className="mt-2 block text-[15px]">Today&apos;s Goal</b><span className="text-[13px] text-slate-600">Complete 1 lesson</span></div><Ring v={Math.min(lessonsCompletedToday, 1) * 100} size={74} stroke={6} color="#0E9F6E"><span className="text-[15px]">{Math.min(lessonsCompletedToday, 1)}/1</span></Ring></div>
          <div className="rounded-2xl bg-[#F0FCF8] p-5"><b className="text-[40px] leading-none">“</b><p className="mt-1 text-[16px] font-medium leading-snug">The future belongs to those who keep learning.”</p><p className="mt-3 text-[13px] text-slate-600">— Sautika</p></div>
        </div>
      </section>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, CirclePlay, Sprout } from 'lucide-react';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import VoiceCourseSearch from '@/components/VoiceCourseSearch';
import { SUBJECTS } from '@/lib/data';
import { IMAGE_BY_CATEGORY, SUBJECT_BY_CATEGORY } from '@/lib/course-display';

export default function StudyHubContent() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const progressByCourse = new Map(data.courseProgress.map((progress) => [progress.courseId, progress]));
  const courses = [...data.courses]
    .sort((a, b) => {
      const getPriority = (courseId: string, lessonCount: number) => {
        const completed = progressByCourse.get(courseId)?.completedLessonIndexes.length ?? 0;
        if (completed > 0 && completed < lessonCount) return 0;
        return completed >= lessonCount && lessonCount > 0 ? 2 : 1;
      };
      return getPriority(a.id, a.lessons.length) - getPriority(b.id, b.lessons.length);
    })
    .slice(0, 4);
  const today = new Date().toDateString();
  const lessonsCompletedToday = data.activity.filter(
    (activity) =>
      activity.type === 'lesson' &&
      activity.title.startsWith('Completed') &&
      new Date(activity.date).toDateString() === today,
  ).length;
  const dailyGoalProgress = Math.min(lessonsCompletedToday, 1);

  return (
    <div className="mx-auto max-w-[1330px]">
      <h1 className="text-[32px] font-extrabold leading-tight sm:text-[40px]">Study Hub</h1>
      <section className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FBF7EE] p-5 sm:p-6" aria-label="Welcome">
        <div>
          <p className="text-[21px] font-bold sm:text-[24px]">Welcome, {profile.firstName || 'Learner'}! 👋</p>
          <p className="mt-1 text-[15px] text-slate-600">Ready to learn something new today?</p>
        </div>
        <VoiceCourseSearch />
      </section>

      <div className="mt-7 grid gap-6 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-9" aria-labelledby="continue-learning">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="continue-learning" className="text-[25px] font-extrabold sm:text-[30px]">Continue Learning</h2>
              <p className="mt-1 text-[15px] text-slate-500 sm:text-[17px]">Pick up where you left off or explore something new.</p>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-1.5 whitespace-nowrap pb-1 text-[14px] font-bold text-navy hover:underline">
              View All Courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
              {courses.map((course) => {
                const completed = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
                const total = course.lessons.length;
                const subject = SUBJECT_BY_CATEGORY[course.cat];
                const subjectColor = SUBJECTS[subject]?.color ?? '#1769E8';

                return (
                  <article key={course.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_16px_rgba(20,50,100,0.05)]">
                    <Link href={`/learning?course=${encodeURIComponent(course.id)}`} className="group relative block h-[150px] overflow-hidden">
                      <Image
                        src={`/images/${IMAGE_BY_CATEGORY[course.cat]}`}
                        alt=""
                        fill
                        sizes="(min-width: 1536px) 230px, (min-width: 640px) 45vw, 100vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[13px] font-bold shadow-sm" style={{ color: subjectColor }}>
                        {course.cat}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <Link href={`/learning?course=${encodeURIComponent(course.id)}`} className="text-[19px] font-extrabold leading-snug text-ink hover:underline">
                        {course.title}
                      </Link>
                      <p className="mt-1.5 text-[14px] leading-snug text-slate-500">{course.level} • {course.cat}</p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
                        <span className="text-[13px] text-slate-500">{completed}/{total} lessons</span>
                        <Link
                          href={`/learning?course=${encodeURIComponent(course.id)}`}
                          aria-label={`${completed > 0 ? 'Continue' : 'Start'} ${course.title}`}
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-navy transition hover:bg-sun-dark"
                        >
                          <CirclePlay className="h-6 w-6 fill-navy" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
              <p className="mt-3 font-bold text-navy">Your courses are getting ready.</p>
              <Link href="/courses" className="mt-3 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                Browse courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-5 xl:col-span-3 xl:pt-[76px]">
          <section className="rounded-2xl bg-[#E7F9F1] p-6" aria-labelledby="daily-goal">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Sprout className="h-8 w-8 text-emerald-600" />
                <h2 id="daily-goal" className="mt-3 text-[18px] font-extrabold">Today&apos;s Goal</h2>
                <p className="mt-1 text-[15px] leading-relaxed text-slate-600">Complete 1 lesson</p>
              </div>
              <div
                role="progressbar"
                aria-label="Today's lesson goal"
                aria-valuenow={dailyGoalProgress}
                aria-valuemin={0}
                aria-valuemax={1}
                className="grid h-[88px] w-[88px] shrink-0 place-items-center rounded-full border-[9px] border-[#DCEFE8] text-[19px] font-extrabold text-navy"
              >
                {dailyGoalProgress}/1
              </div>
            </div>
          </section>

          <figure className="rounded-2xl bg-[#EFFBF7] p-6">
            <blockquote className="text-[20px] font-medium leading-snug text-navy">
              <span aria-hidden="true" className="mb-2 block text-4xl font-extrabold leading-none">&ldquo;</span>
              The future belongs to those who keep learning.
            </blockquote>
            <figcaption className="mt-4 text-[15px] text-slate-600">— Sautika</figcaption>
          </figure>
        </aside>
      </div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, CirclePlay, Sprout } from 'lucide-react';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import VoiceCourseSearch from '@/components/VoiceCourseSearch';
import { SUBJECTS } from '@/lib/data';
import { coursesForClass } from '@/lib/course-access';
import { IMAGE_BY_CATEGORY, SUBJECT_BY_CATEGORY } from '@/lib/course-display';

export default function StudyHubContent() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const progressByCourse = new Map(data.courseProgress.map((progress) => [progress.courseId, progress]));
  const courses = [...coursesForClass(data.courses, profile.educationLevel)]
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
      <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-[34px] lg:text-[38px]">Study Hub</h1>
      <section className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FBF7EE] p-4 sm:p-6" aria-label="Welcome">
        <div className="min-w-0 flex-1">
          <p className="text-[19px] font-bold text-slate-900 truncate sm:text-[23px]">Welcome, {profile.firstName || 'Learner'}! 👋</p>
          <p className="mt-1 text-xs text-slate-600 sm:text-[14px]">Ready to learn something new today?</p>
        </div>
        <VoiceCourseSearch />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-12">
        <section className="min-w-0 xl:col-span-9" aria-labelledby="continue-learning">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="continue-learning" className="text-[22px] font-extrabold text-slate-900 sm:text-[26px]">Continue Learning</h2>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-[14px]">Pick up where you left off or explore something new.</p>
            </div>
            <Link href="/courses" className="inline-flex items-center gap-1.5 whitespace-nowrap pb-1 text-[13px] font-bold text-navy hover:underline sm:text-[14px]">
              View All Courses <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {courses.length > 0 ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
              {courses.map((course) => {
                const completed = progressByCourse.get(course.id)?.completedLessonIndexes.length ?? 0;
                const total = course.lessons.length;
                const subject = SUBJECT_BY_CATEGORY[course.cat];
                const subjectColor = SUBJECTS[subject]?.color ?? '#1769E8';

                return (
                  <article key={course.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_2px_16px_rgba(20,50,100,0.05)] transition hover:shadow-md">
                    <Link href={`/learning?course=${encodeURIComponent(course.id)}`} className="group relative block h-[140px] overflow-hidden sm:h-[150px]">
                      <Image
                        src={`/images/${IMAGE_BY_CATEGORY[course.cat]}`}
                        alt=""
                        fill
                        sizes="(min-width: 1536px) 230px, (min-width: 640px) 45vw, 100vw"
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 max-w-[calc(100%-24px)] truncate rounded-full bg-white px-3 py-1 text-[12px] font-bold shadow-sm" style={{ color: subjectColor }}>
                        {course.cat}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4 sm:p-5">
                      <Link href={`/learning?course=${encodeURIComponent(course.id)}`} className="line-clamp-2 break-words text-[17px] font-extrabold leading-snug text-ink hover:underline">
                        {course.title}
                      </Link>
                      <p className="mt-1.5 truncate text-[12.5px] leading-snug text-slate-500 sm:text-[13px]">{course.level} • {course.cat}</p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                        <span className="whitespace-nowrap text-xs font-medium text-slate-500">{completed}/{total} lessons</span>
                        <Link
                          href={`/learning?course=${encodeURIComponent(course.id)}`}
                          aria-label={`${completed > 0 ? 'Continue' : 'Start'} ${course.title}`}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sun text-navy transition hover:bg-sun-dark"
                        >
                          <CirclePlay className="h-5 w-5 fill-navy" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
              <p className="mt-3 font-bold text-navy">
                {profile.educationLevel === 'Not specified'
                  ? 'Your class is not set on your learner profile.'
                  : `Courses for ${profile.educationLevel} are getting ready.`}
              </p>
              <Link href="/courses" className="mt-3 inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline">
                Browse courses <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </section>

        <aside className="space-y-4 xl:col-span-3">
          <section className="rounded-2xl bg-[#E7F9F1] p-5 sm:p-6" aria-labelledby="daily-goal">
            <div className="flex items-center justify-between gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <Sprout className="h-7 w-7 shrink-0 text-emerald-600 sm:h-8 sm:w-8" />
                <h2 id="daily-goal" className="mt-2.5 truncate text-[17px] font-extrabold text-slate-900 sm:text-[18px]">Today&apos;s Goal</h2>
                <p className="mt-0.5 truncate text-xs text-slate-600 sm:text-[13.5px]">Complete 1 lesson</p>
              </div>
              <div
                role="progressbar"
                aria-label="Today's lesson goal"
                aria-valuenow={dailyGoalProgress}
                aria-valuemin={0}
                aria-valuemax={1}
                className="grid h-[78px] w-[78px] shrink-0 place-items-center rounded-full border-[8px] border-[#DCEFE8] text-[17px] font-extrabold text-navy sm:h-[88px] sm:w-[88px] sm:border-[9px] sm:text-[19px]"
              >
                {dailyGoalProgress}/1
              </div>
            </div>
          </section>

          <figure className="rounded-2xl bg-[#EFFBF7] p-5 sm:p-6">
            <blockquote className="break-words text-[17px] font-medium leading-snug text-navy sm:text-[19px]">
              <span aria-hidden="true" className="mb-1 block text-3xl font-extrabold leading-none sm:text-4xl">&ldquo;</span>
              The future belongs to those who keep learning.
            </blockquote>
            <figcaption className="mt-3 text-xs text-slate-600 sm:text-[13.5px]">— Sautika</figcaption>
          </figure>
        </aside>
      </div>
    </div>
  );
}

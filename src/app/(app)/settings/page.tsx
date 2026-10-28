'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  Download,
  KeyRound,
  Settings,
  Shield,
  Sprout,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Bar, Ring } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { coursesForClass } from '@/lib/course-access';
import SettingsPanel from './SettingsPanel';

const ACTIONS = [
  ['Change Password', KeyRound],
  ['Manage Notifications', Bell],
  ['Download Offline Content', Download],
] as const;

export default function SettingsPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const [modalType, setModalType] = useState<string | null>(null);

  const courses = coursesForClass(data?.courses ?? [], profile.educationLevel);
  const courseIds = new Set(courses.map((course) => course.id));
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  const completedLessons = (data?.courseProgress ?? [])
    .filter((progress) => courseIds.has(progress.courseId))
    .reduce((total, progress) => total + progress.completedLessonIndexes.length, 0);
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleAction = (title: string) => {
    if (title === 'Manage Notifications') {
      window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'Notifications' }));
    } else if (title === 'Change Password') {
      setModalType('password');
    } else if (title === 'Download Offline Content') {
      setModalType('offline');
    }
  };

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex items-center gap-4">
        <Settings aria-hidden="true" className="h-12 w-12 fill-navy text-navy" />
        <div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[38px]">Settings</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">Manage your account, preferences, and learning experience.</p>
        </div>
      </div>
      <SettingsPanel />

      <aside aria-label="Account overview and quick actions" className="mt-6 grid auto-rows-fr min-w-0 grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3">
        <div className="relative flex h-full min-h-[220px] flex-col justify-between overflow-hidden rounded-2xl border border-sun/25 bg-gradient-to-br from-sun/30 via-[#FEF1CF] to-sun/10 p-5 shadow-sm transition-all duration-200 hover:shadow-md lg:min-h-0">
          <div className="relative z-10 flex items-start gap-3 pr-14 sm:pr-16">
            <Sprout aria-hidden="true" className="mt-0.5 h-9 w-9 shrink-0 text-sun-dark" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900">Keep Going, {profile?.firstName || 'Learner'}!</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">Small steps every day lead to big dreams.</p>
            </div>
          </div>
          <Image
            src="/images/settings-art.png"
            alt=""
            width={102}
            height={105}
            className="absolute bottom-0 right-0 hidden h-auto w-24 sm:block"
          />
        </div>

        <section className="flex h-full min-w-0 flex-col justify-between rounded-2xl border border-slate-100/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <h2 className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-slate-900">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sun/20 text-navy">
                <Target aria-hidden="true" className="h-5 w-5" />
              </span>
              <span>Learning Goals</span>
            </h2>
            <Link href="/progress" className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-navy transition-colors hover:text-sun-dark">
              View Progress <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-5 flex min-w-0 items-center gap-4">
            <Ring v={progressPercent} size={84} stroke={8}>
              <span className="text-xl font-bold leading-none text-slate-900">{progressPercent}%</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold tracking-tight text-slate-900">Lesson completion</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                {completedLessons} of {totalLessons} lessons completed
              </p>
              <div className="mt-3">
                <Bar v={progressPercent} color="#12A36B" />
              </div>
            </div>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col justify-between rounded-2xl border border-slate-100/80 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
          <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sun/20 text-navy">
              <Zap aria-hidden="true" className="h-5 w-5" />
            </span>
            Quick Actions
          </h2>
          <ul className="mt-3 grid gap-1">
            {ACTIONS.map(([t, I]) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => handleAction(t)}
                  className="flex w-full min-w-0 items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sun/20 text-navy">
                    <I aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm font-medium leading-relaxed text-slate-700">{t}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />
                </button>
              </li>
            ))}
          </ul>
        </section>

      </aside>

      {/* Action Modals */}
      {modalType === 'password' && (
        <div role="dialog" aria-modal aria-label="Change Password" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Shield className="h-5 w-5 text-blue-600" /> Account Password
              </h3>
              <button aria-label="Close" onClick={() => setModalType(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Your credentials and sign-in methods are managed securely through Clerk authentication. To reset your password, visit the sign-in portal or consult your administrator.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-[13px] text-slate-700">
              <b>Primary Email:</b> {profile?.email || 'Learner Account'}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="h-11 flex-1 rounded-xl border border-line font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'offline' && (
        <div role="dialog" aria-modal aria-label="Offline Content" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Download className="h-5 w-5 text-emerald-600" /> Offline Content
              </h3>
              <button aria-label="Close" onClick={() => setModalType(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              All 37 curriculum courses across Baby Class to S.6 and 6,485 Sharebility resources are cached on your device.
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-4 text-[13px] text-emerald-900">
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> Baby class to top class: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> P.1 to P.4 curriculum: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> P.5 to P.7 curriculum: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> S.1 to S.4 O-Level: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> S.5 to S.6 A-Level: Available offline</p>
            </div>
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="mt-5 h-11 w-full rounded-xl bg-sun font-bold text-navy hover:bg-sun-dark"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

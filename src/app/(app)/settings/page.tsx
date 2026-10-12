'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  KeyRound,
  Lightbulb,
  Settings,
  Shield,
  Sprout,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { Bar, Card, Ring, ViewAll } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import SettingsPanel from './SettingsPanel';

const ACTIONS = [
  ['Change Password', KeyRound],
  ['Manage Notifications', Bell],
  ['Download Offline Content', Download],
  ['Contact Support', CircleHelp],
] as const;

export default function SettingsPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const [modalType, setModalType] = useState<string | null>(null);

  const totalLessons = data?.courses.reduce((total, course) => total + course.lessons.length, 0) ?? 0;
  const completedLessons = data?.courseProgress.reduce((total, progress) => total + progress.completedLessonIndexes.length, 0) ?? 0;
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleAction = (title: string) => {
    if (title === 'Manage Notifications') {
      window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'Notifications' }));
    } else if (title === 'Contact Support') {
      window.dispatchEvent(new CustomEvent('switch-settings-tab', { detail: 'Help & Support' }));
    } else if (title === 'Change Password') {
      setModalType('password');
    } else if (title === 'Download Offline Content') {
      setModalType('offline');
    }
  };

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="flex items-center gap-4">
          <Settings className="h-12 w-12 fill-navy text-navy" />
          <div>
            <h1 className="text-[38px] font-extrabold leading-none text-navy">Settings</h1>
            <p className="mt-1 text-[15px] text-slate-500">Manage your account, preferences, and learning experience.</p>
          </div>
        </div>
        <SettingsPanel />
      </div>

      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="relative flex min-h-[104px] items-center gap-4 overflow-hidden rounded-2xl bg-[#FEF1CF] p-5">
          <Sprout className="h-10 w-10 text-sun" />
          <div>
            <b className="text-[20px] text-navy">Keep Going, {profile?.firstName || 'Learner'}!</b>
            <p className="text-[12.5px] text-slate-600">Small steps every day lead to big dreams.</p>
          </div>
          <Image
            src="/images/settings-art.png"
            alt=""
            width={102}
            height={105}
            className="absolute bottom-0 right-0 hidden h-auto w-[100px] sm:block"
          />
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-3 text-[18px] font-extrabold text-navy">
              <Target className="h-7 w-7 text-blue-600" />Learning Goals
            </h2>
            <ViewAll href="/progress">View Progress</ViewAll>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <Ring v={progressPercent} size={96} stroke={9}>
              <span className="text-[22px]">{progressPercent}%</span>
            </Ring>
            <div className="flex-1">
              <b className="text-[16px] text-navy">Lesson completion</b>
              <p className="mt-1 text-[12px] text-slate-500">
                {completedLessons} of {totalLessons} lessons completed
              </p>
              <div className="mt-3">
                <Bar v={progressPercent} color="#12A36B" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-3 text-[18px] font-extrabold text-navy">
            <Zap className="h-6 w-6 text-blue-600" />Quick Actions
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {ACTIONS.map(([t, I]) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => handleAction(t)}
                  className="flex w-full items-center gap-4 py-3.5 text-left transition hover:text-blue-600"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700">
                    <I className="h-5 w-5" />
                  </span>
                  <span className="flex-1 text-[14.5px] font-medium">{t}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="rounded-2xl bg-[#EAF3FE] p-5">
          <div className="flex items-start gap-4">
            <Lightbulb className="h-8 w-8 text-sun" />
            <div>
              <b className="text-[16px] text-navy">Need help?</b>
              <p className="mt-1 text-[13px] text-slate-600">Our support team is here for you anytime.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleAction('Contact Support')}
            className="mt-4 flex h-11 items-center gap-3 rounded-xl border border-blue-200 bg-white px-5 text-[14px] font-bold text-blue-700 shadow-sm transition hover:bg-blue-50"
          >
            Get Support <ArrowRight className="h-4 w-4" />
          </button>
        </div>
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

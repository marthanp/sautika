'use client';

import Image from 'next/image';
import { ArrowRight, Bell, ChevronRight, CircleHelp, Download, KeyRound, Lightbulb, Settings, Sprout, Target, Zap } from 'lucide-react';
import { Bar, Card, Ring, ViewAll } from '@/components/ui';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import SettingsPanel from './SettingsPanel';

const ACTIONS = [['Change Password', KeyRound], ['Manage Notifications', Bell], ['Download Offline Content', Download], ['Contact Support', CircleHelp]] as const;

export default function SettingsPage() {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const totalLessons = data?.courses.reduce((total, course) => total + course.lessons.length, 0) ?? 0;
  const completedLessons = data?.courseProgress.reduce((total, progress) => total + progress.completedLessonIndexes.length, 0) ?? 0;
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="flex items-center gap-4"><Settings className="h-12 w-12 fill-navy text-navy" /><div><h1 className="text-[38px] font-extrabold leading-none">Settings</h1><p className="mt-1 text-[15px] text-slate-500">Manage your account, preferences and learning experience.</p></div></div>
        <SettingsPanel />
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="relative flex min-h-[104px] items-center gap-4 overflow-hidden rounded-2xl bg-[#FEF1CF] p-5"><Sprout className="h-10 w-10 text-sun" /><div><b className="text-[20px]">Keep Going, {profile?.firstName || 'Learner'}!</b><p className="text-[12.5px] text-slate-600">Small steps every day lead to big dreams.</p></div><Image src="/images/settings-art.png" alt="" width={102} height={105} className="absolute bottom-0 right-0 hidden h-auto w-[100px] sm:block" /></div>
        <Card className="p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Target className="h-7 w-7 text-blue-600" />Learning Goals</h2><ViewAll /></div>
          <div className="mt-4 flex items-center gap-5"><Ring v={progressPercent} size={96} stroke={9}><span className="text-[22px]">{progressPercent}%</span></Ring><div className="flex-1"><b className="text-[16px]">Lesson completion</b><p className="mt-1 text-[12px] text-slate-500">{completedLessons} of {totalLessons} lessons completed</p><div className="mt-3"><Bar v={progressPercent} color="#12A36B" /></div></div></div></Card>
        <Card className="p-5"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Zap className="h-6 w-6 text-blue-600" />Quick Actions</h2>
          <ul className="mt-2 divide-y divide-line">{ACTIONS.map(([t, I]) => <li key={t}><button className="flex w-full items-center gap-4 py-3.5 text-left"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700"><I className="h-5 w-5" /></span><span className="flex-1 text-[14.5px] font-medium">{t}</span><ChevronRight className="h-4 w-4" /></button></li>)}</ul></Card>
        <div className="rounded-2xl bg-[#EAF3FE] p-5"><div className="flex items-start gap-4"><Lightbulb className="h-8 w-8 text-sun" /><div><b className="text-[16px]">Need help?</b><p className="mt-1 text-[13px] text-slate-600">Our support team is here for you.</p></div></div><button className="mt-4 flex h-11 items-center gap-3 rounded-xl border border-blue-200 bg-white px-5 text-[14px] font-bold text-blue-700">Get Support <ArrowRight className="h-4 w-4" /></button></div>
      </aside>
    </div>
  );
}

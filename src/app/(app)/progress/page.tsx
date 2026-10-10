import Image from 'next/image';
import { ArrowRight, BookOpen, Calendar, Clock, Flame, Sprout, Star, Target, Trophy, TrendingUp } from 'lucide-react';
import { Bar, Card, Coin, ViewAll } from '@/components/ui';
import { ACHIEVEMENTS, PROGRESS_ACTIVITY, SUBJECTS, SUBJECT_PROGRESS } from '@/lib/data';

export default function ProgressPage() {
  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <p className="text-[19px] font-bold">Hello, Aisha! 👋</p>
        <h1 className="mt-1 text-[30px] font-extrabold leading-tight sm:text-[36px] lg:text-[40px]">Your Learning Progress</h1>
        <p className="mt-2 text-[16px] text-slate-500">Track your progress, celebrate your achievements, and keep going!</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-blue-100 bg-[#EEF5FE] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-600 text-white"><BookOpen className="h-5 w-5" /></span>Courses Completed</p><p className="mt-4 text-[34px] font-extrabold">3 <span className="text-[22px] font-medium text-slate-500">/ 12</span></p><div className="mt-3 flex items-center gap-3"><div className="flex-1"><Bar v={25} color="#2F6BFF" /></div><span className="text-[12px] font-bold text-blue-600">25%</span></div></div>
          <div className="rounded-2xl border border-amber-100 bg-[#FEF8E8] p-5"><p className="flex items-center gap-3 text-[14px] font-semibold"><Star className="h-9 w-9 fill-sun text-sun" />Total Coins Earned</p><p className="mt-4 flex items-center justify-between text-[34px] font-extrabold">320<Coin size={36} /></p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-600"><TrendingUp className="h-4 w-4" />+50 from last week</p></div>
          <div className="rounded-2xl border border-emerald-100 bg-[#EAF8F0] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><Flame className="h-9 w-9 fill-blue-500 text-blue-600" />Current Streak</p><p className="mt-4 text-[34px] font-extrabold">5 days</p><p className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700"><Calendar className="h-4 w-4" />Keep it up!</p></div>
          <div className="rounded-2xl border border-violet-100 bg-[#F4EFFE] p-5"><p className="flex items-center gap-3 text-[14px] font-bold"><span className="grid h-10 w-10 place-items-center rounded-full bg-violet-600 text-white"><Target className="h-5 w-5" /></span>Overall Progress</p><p className="mt-4 text-[34px] font-extrabold">68%</p><div className="mt-3"><Bar v={68} color="#6D4DFF" /></div><p className="mt-2 text-[12px] text-slate-600">You&apos;re doing great!</p></div>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[19px] font-extrabold"><BookOpen className="h-6 w-6 text-blue-600" />Subject Progress</h2><ViewAll>View Details</ViewAll></div>
            <ul className="mt-5 space-y-5">{SUBJECT_PROGRESS.map(([s, v, l]) => { const { icon: I, color } = SUBJECTS[s]; return (
              <li key={s} className="flex items-center gap-4"><span className="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><I className="h-6 w-6" /></span>
                <div className="flex-1"><p className="text-[14px] font-semibold">{s}</p><Bar v={v} color={color} className="mt-2 h-2" /></div><b className="w-10 text-[13px]">{v}%</b><span className="hidden w-[80px] text-[12px] text-slate-500 sm:block">{l}</span></li>); })}</ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[19px] font-extrabold"><Clock className="h-6 w-6" />Recent Activity</h2><ViewAll /></div>
            <ul className="mt-3 divide-y divide-line">{PROGRESS_ACTIVITY.map((a) => { const { icon: I, color } = SUBJECTS[a.subject]; return (
              <li key={a.title} className="flex items-center gap-3 py-3.5"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}><I className="h-5 w-5" /></span><span className="flex-1 text-[14px] font-semibold leading-tight">{a.title}<span className="mt-1 block text-[12px] font-normal text-slate-500">{a.sub}</span></span>
                <span className={`rounded-full px-3 py-1 text-[12px] font-bold ${a.tag === 'In progress' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{a.tag}</span></li>); })}</ul>
          </Card>
        </div>
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="relative aspect-[392/256] overflow-hidden rounded-2xl">
          <Image src="/images/progress-banner.jpg" alt="Aisha looking at the mountains at sunset. Small steps today, big dreams tomorrow." fill sizes="(min-width: 1280px) 30vw, 100vw" priority className="object-cover" />
        </div>
        <div className="rounded-2xl bg-[#FEF6DC] p-5"><div className="flex items-center justify-between"><h2 className="flex items-center gap-3 text-[18px] font-extrabold"><Trophy className="h-7 w-7 text-sun" />Your Achievements</h2><ViewAll /></div>
          <ul className="mt-4 grid grid-cols-2 gap-3">{ACHIEVEMENTS.map((a) => <li key={a.title} className="rounded-xl bg-white p-4 text-center shadow-sm"><span className="text-[40px] leading-none">{a.emoji}</span><b className="mt-2 block text-[14px]">{a.title}</b><span className="block text-[11.5px] leading-snug text-slate-500">{a.text}</span><span className="mt-2 block text-[11.5px] text-slate-500">{a.date}</span></li>)}</ul></div>
        <div className="flex items-center gap-4 rounded-2xl bg-[#E9F3FD] p-5"><Sprout className="h-9 w-9 shrink-0 text-emerald-600" /><div className="flex-1"><b className="text-[16px]">You&apos;re making great progress!</b><p className="mt-1 text-[13px] leading-snug text-slate-600">Keep learning, Aisha. Your efforts are building a brighter future.</p></div><ArrowRight className="h-4 w-4 text-blue-600" /></div>
      </aside>
    </div>
  );
}

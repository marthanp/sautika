import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChartNoAxesColumn, ChevronRight, Clock, Play, Trophy } from 'lucide-react';
import { Card, Coin, Ring } from '@/components/ui';
import { LESSONS } from '@/lib/data';
import LessonView from './LessonView';

export default function LearningPage() {
  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-3 text-[14px]"><Link href="/courses" className="flex items-center gap-2"><ArrowLeft className="h-4 w-4" />Back to Courses</Link><span className="hidden h-4 w-px bg-slate-300 sm:block" /><span className="text-slate-600">Mathematics</span></nav>
        <div className="mt-4 grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <span className="inline-block rounded-full bg-[#E5EFFE] px-4 py-1.5 text-[14px] font-bold text-blue-700">Mathematics</span>
            <h1 className="mt-5 text-[31px] font-extrabold leading-[1.15] sm:text-[38px]">Addition and Subtraction of Whole Numbers</h1>
            <p className="mt-4 max-w-[460px] text-[15px] leading-relaxed text-slate-500 sm:text-[16px]">Learn how to add and subtract whole numbers using real-life examples from your daily life.</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[14px] text-slate-600"><span className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Lesson 3 of 12</span><span className="hidden h-5 w-px bg-slate-300 sm:block" /><span className="flex items-center gap-2"><Clock className="h-5 w-5" />12 minutes</span><span className="hidden h-5 w-px bg-slate-300 sm:block" /><span className="flex items-center gap-2"><ChartNoAxesColumn className="h-5 w-5" />Beginner</span></div>
          </div>
          <Image src="/images/lesson-hero.jpg" alt="Aisha smiling while writing in her notebook" width={439} height={261} priority className="h-auto w-full rounded-2xl object-cover lg:col-span-5" />
        </div>
        <LessonView />
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <Card className="p-6">
          <h2 className="flex items-center gap-3 text-[18px] font-extrabold"><ChartNoAxesColumn className="h-7 w-7 text-blue-600" />Lesson Progress</h2>
          <div className="mt-4 flex items-center gap-4"><Ring v={25} size={104} stroke={9}><span className="text-[22px]">25%</span></Ring><div className="flex-1"><p className="text-[17px] font-semibold">3 of 12 lessons completed</p><div className="mt-3 h-2 rounded-full bg-slate-200"><i className="block h-full w-1/4 rounded-full bg-sun" /></div></div></div>
          <ul className="mt-5">{LESSONS.map((l, i) => (
            <li key={l} className={`flex h-[50px] items-center gap-3 rounded-lg px-2 text-[15px] font-medium ${i === 0 ? 'bg-[#FFF3D0]' : ''}`}>
              <span className={`grid h-6 w-6 place-items-center rounded-full border-2 ${i === 0 ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300'}`}>{i === 0 && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span><span className="flex-1">{l}</span>
              {i === 0 ? <span className="grid h-7 w-7 place-items-center rounded-full bg-sun"><Play className="h-3.5 w-3.5 fill-navy text-navy" /></span> : <span className="h-6 w-6 rounded-full border border-slate-200" />}</li>))}</ul>
          <Link href="/courses" className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-blue-600">View All Lessons <ArrowRight className="h-4 w-4" /></Link>
        </Card>
        <div className="rounded-2xl bg-[#E9F3FD] p-6"><div className="flex items-center gap-4"><Trophy className="h-12 w-12 shrink-0 text-sun" /><div><b className="text-[21px]">You&apos;re doing great!</b><p className="mt-1 text-[14px] leading-snug text-slate-600">Every lesson you complete brings you closer to your goals.</p></div></div>
          <div className="mt-4 flex items-center gap-3 border-t border-blue-100 pt-4 text-[14px] font-medium"><Coin size={26} /><span className="flex-1">+ 10 coins earned</span><ChevronRight className="h-4 w-4" /></div></div>
      </aside>
    </div>
  );
}

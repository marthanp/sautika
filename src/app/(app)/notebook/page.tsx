import Image from 'next/image';
import { ArrowRight, Cloud, FolderOpen, Lightbulb, NotebookText, Plus, Sparkles, Upload, BookOpen } from 'lucide-react';
import { Card, ViewAll } from '@/components/ui';
import { NOTES, SUBJECTS } from '@/lib/data';
import NotebookBoard from './NotebookBoard';

const FEATURES = [{ icon: Cloud, a: 'Save Notes', b: 'Anytime', c: '#2F6BFF' }, { icon: BookOpen, a: 'Organize by', b: 'Subject', c: '#1F63F5' }, { icon: Sparkles, a: 'Quick Review', b: 'Later', c: '#2F6BFF' }];

export default function NotebookPage() {
  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="relative">
          <p className="flex items-center gap-2 text-[13px] font-bold"><FolderOpen className="h-5 w-5 text-blue-600" />NOTEBOOK</p>
          <h1 className="mt-2 text-[31px] font-extrabold leading-tight sm:text-[38px]">Your Learning Notebook</h1>
          <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-slate-500 sm:text-[16px]">Save your notes, key points and summaries. Keep everything in one place for easy review.</p>
          <ul className="mt-5 flex flex-wrap gap-5 sm:gap-8">{FEATURES.map(({ icon: I, a, b, c }) => <li key={a} className="flex min-w-[140px] items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E8F0FE]"><I className="h-6 w-6" style={{ color: c }} /></span><span className="text-[13px] leading-tight text-slate-600"><b className="block text-navy">{a}</b>{b}</span></li>)}</ul>
          <Image src="/images/notebook-art.png" alt="" width={365} height={190} className="absolute right-0 top-0 hidden h-auto w-[300px] xl:block" />
        </div>
        <NotebookBoard />
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="rounded-2xl bg-[#FEF6DC] p-5"><div className="flex items-start gap-3"><Lightbulb className="h-8 w-8 text-sun" /><div><b className="text-[17px]">Quick Actions</b><p className="text-[13px] text-slate-600">Create a new note or upload your work.</p></div></div>
          <button className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-sun text-[16px] font-bold"><Plus className="h-5 w-5" />New Note</button>
          <button className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[16px] font-bold"><Upload className="h-5 w-5" />Upload File</button></div>
        <div className="rounded-2xl bg-[#EAF3FE] p-5"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><NotebookText className="h-6 w-6" /></span><div><b className="text-[17px]">Study Smarter</b><p className="mt-1 text-[13.5px] leading-snug text-slate-600">Turn your notes into quizzes and practise what you&apos;ve learned.</p></div></div>
          <a href="/learning" className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-bold text-blue-600">Create Quiz <ArrowRight className="h-4 w-4" /></a></div>
        <Card className="p-5">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-[17px] font-extrabold"><NotebookText className="h-5 w-5" />Recent Notes</h2><ViewAll /></div>
          <ul className="mt-3 divide-y divide-line">{NOTES.slice(0, 5).map((n) => { const { icon: I, color } = SUBJECTS[n.subject]; return (
            <li key={n.id} className="flex items-center gap-3 py-3"><span className="grid h-11 w-11 place-items-center rounded-full text-white" style={{ background: color }}><I className="h-5 w-5" /></span><span className="flex-1 text-[14.5px] font-semibold leading-tight">{n.title}<span className="block text-[12.5px] font-normal text-slate-500">{n.date}</span></span><span className="text-slate-400">⋮</span></li>); })}</ul>
        </Card>
      </aside>
    </div>
  );
}

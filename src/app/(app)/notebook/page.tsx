'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Cloud, FolderOpen, Lightbulb, NotebookText, Plus, Sparkles, Upload, BookOpen } from 'lucide-react';
import NotebookBoard from './NotebookBoard';
import RecentNotes from './RecentNotes';

const FEATURES = [
  { icon: Cloud, a: 'Save Notes', b: 'Anytime', c: '#2F6BFF' },
  { icon: BookOpen, a: 'Organize by', b: 'Subject', c: '#1F63F5' },
  { icon: Sparkles, a: 'Quick Review', b: 'Later', c: '#2F6BFF' },
];

export default function NotebookPage() {
  const triggerNewNote = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-new-note'));
    }
  };

  const triggerUpload = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('upload-note-file'));
    }
  };

  return (
    <div className="mx-auto grid max-w-[1330px] gap-6 xl:grid-cols-12">
      <div className="min-w-0 xl:col-span-8">
        <div className="relative">
          <p className="flex items-center gap-2 text-[13px] font-bold text-navy">
            <FolderOpen className="h-5 w-5 text-blue-600" /> NOTEBOOK
          </p>
          <h1 className="mt-2 text-[31px] font-extrabold leading-tight sm:text-[38px]">
            Your Learning Notebook
          </h1>
          <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-slate-500 sm:text-[16px]">
            Save your notes, key points, and summaries. Keep everything in one place for easy review and revision.
          </p>
          <ul className="mt-5 flex flex-wrap gap-5 sm:gap-8">
            {FEATURES.map(({ icon: I, a, b, c }) => (
              <li key={a} className="flex min-w-[140px] items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E8F0FE]">
                  <I className="h-6 w-6" style={{ color: c }} />
                </span>
                <span className="text-[13px] leading-tight text-slate-600">
                  <b className="block text-navy">{a}</b>
                  {b}
                </span>
              </li>
            ))}
          </ul>
          <Image
            src="/images/notebook-art.png"
            alt=""
            width={365}
            height={190}
            className="absolute right-0 top-0 hidden h-auto w-[300px] xl:block"
          />
        </div>
        <NotebookBoard />
      </div>
      <aside className="min-w-0 space-y-5 xl:col-span-4">
        <div className="rounded-2xl bg-[#FEF6DC] p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-8 w-8 text-sun" />
            <div>
              <b className="text-[17px] text-navy">Quick Actions</b>
              <p className="text-[13px] text-slate-600">Create a new note or upload your work.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerNewNote}
            className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-xl bg-sun text-[16px] font-bold text-navy shadow-sm transition hover:bg-sun-dark"
          >
            <Plus className="h-5 w-5" /> New Note
          </button>
          <button
            type="button"
            onClick={triggerUpload}
            className="mt-3 flex h-[46px] w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-[16px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Upload className="h-5 w-5" /> Upload File
          </button>
        </div>
        <div className="rounded-2xl bg-[#EAF3FE] p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <NotebookText className="h-6 w-6" />
            </span>
            <div>
              <b className="text-[17px] text-navy">Study Smarter</b>
              <p className="mt-1 text-[13.5px] leading-snug text-slate-600">
                Turn your notes into quizzes and practise what you&apos;ve learned.
              </p>
            </div>
          </div>
          <Link
            href="/learning"
            className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-bold text-blue-600 hover:underline"
          >
            Take Course Quiz <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <RecentNotes />
      </aside>
    </div>
  );
}

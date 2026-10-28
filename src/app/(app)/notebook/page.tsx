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
          <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-navy sm:text-[13px]">
            <FolderOpen className="h-4 w-4 text-blue-600" /> NOTEBOOK
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-slate-900 sm:text-[32px] lg:text-[36px]">
            Your Learning Notebook
          </h1>
          <p className="mt-1.5 max-w-[520px] text-xs leading-relaxed text-slate-500 sm:text-[14px]">
            Save your notes, key points, and summaries. Keep everything in one place for easy review and revision.
          </p>
          <ul className="mt-4 flex flex-wrap gap-3 sm:gap-6">
            {FEATURES.map(({ icon: I, a, b, c }) => (
              <li key={a} className="flex min-w-[110px] items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#E8F0FE]">
                  <I className="h-4 w-4" style={{ color: c }} />
                </span>
                <span className="text-xs leading-tight text-slate-600">
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
            className="absolute right-0 top-0 hidden h-auto w-[240px] opacity-80 2xl:block"
          />
        </div>
        <div className="mt-5">
          <NotebookBoard />
        </div>
      </div>
      <aside className="min-w-0 space-y-4 xl:col-span-4">
        <div className="rounded-2xl bg-[#FEF6DC] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-7 w-7 text-sun shrink-0" />
            <div className="min-w-0 flex-1">
              <b className="block text-[16px] sm:text-[17px] text-navy">Quick Actions</b>
              <p className="text-xs text-slate-600">Create a new note or upload your work.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={triggerNewNote}
            className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-sun text-sm font-bold text-navy shadow-xs transition hover:bg-sun-dark"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
          <button
            type="button"
            onClick={triggerUpload}
            className="mt-2.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white text-sm font-bold text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <Upload className="h-4 w-4" /> Upload File
          </button>
        </div>
        <div className="rounded-2xl bg-[#EAF3FE] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
              <NotebookText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <b className="block text-[16px] sm:text-[17px] text-navy">Study Smarter</b>
              <p className="mt-0.5 text-xs leading-snug text-slate-600">
                Turn your notes into quizzes and practise what you&apos;ve learned.
              </p>
            </div>
          </div>
          <Link
            href="/learning"
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 transition hover:underline"
          >
            Go to Practice <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <RecentNotes />
      </aside>
    </div>
  );
}

'use client';

import { FolderOpen, Sparkles, BookOpen, FileText, Headphones, ShieldCheck } from 'lucide-react';
import { useUITranslation } from '@/lib/useUITranslation';
import NotebookBoard from './NotebookBoard';

export default function NotebookPage() {
  const t = useUITranslation();

  return (
    <div className="mx-auto max-w-[1330px] space-y-6">
      {/* Modern, Space-Optimized Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FEF6DC] via-[#FFF9EC] to-[#F1F6FE] p-5 sm:p-7 dark:from-navy-2 dark:via-navy dark:to-navy-2 border border-line dark:border-white/10 shadow-xs">
        <div className="relative z-10 max-w-[780px]">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-navy dark:text-sun">
            <FolderOpen className="h-4 w-4 text-blue-600 dark:text-sun" />
            <span>{t('NOTEBOOK')} · {t('AI STUDY ASSISTANT')}</span>
          </div>

          <h1 className="mt-2 text-2xl font-extrabold leading-tight text-slate-900 sm:text-3xl lg:text-[34px] dark:text-white">
            {t('Your Learning Notebook & AI Tutor')}
          </h1>

          <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {t('Ask questions about any course lesson or uploaded document with interactive voice and text responses, or create and organize your study notes.')}
          </p>

          {/* Quick Capability Badges */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs dark:bg-white/10 dark:text-slate-200">
              <Headphones className="h-3.5 w-3.5 text-blue-600 dark:text-sun" />
              <span>{t('Voice & Text Q&A')}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs dark:bg-white/10 dark:text-slate-200">
              <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{t('Document OCR Reader')}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs dark:bg-white/10 dark:text-slate-200">
              <BookOpen className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>{t('Curriculum Lessons')}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-xs dark:bg-white/10 dark:text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-sun" />
              <span>{t('Native African Speech')}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Board (Integrated AI Tutor + Notes Library) */}
      <NotebookBoard />
    </div>
  );
}

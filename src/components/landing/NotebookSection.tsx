'use client';

import { FileText, MessageSquare, Sparkles } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import { useUITranslation } from '@/lib/useUITranslation';

/**
 * "How it works like a notebook".
 *
 * Two jobs: show the three-pane shape before anyone signs in, and show a real
 * citation rather than promising one. The example below is the actual
 * behaviour — a numbered marker you tap to see the passage the answer came
 * from — so the page is not claiming anything the product does not do.
 */

const PANES: { icon: typeof FileText, title: string; body: string }[] = [
  {
    icon: FileText,
    title: 'Sources',
    body: 'Add a PDF, a photo of your book, a web page or your own notes. Tick the ones to use.',
  },
  {
    icon: MessageSquare,
    title: 'Chat',
    body: 'Ask by typing or speaking. Answers come only from the sources you ticked.',
  },
  {
    icon: Sparkles,
    title: 'Studio',
    body: 'Turn them into flashcards, a quiz, a mind map or a spoken overview.',
  },
];

export default function NotebookSection() {
  const t = useUITranslation();

  return (
    <section id="notebook" className="bg-white px-6 pb-20 pt-16 md:px-16">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {t('The notebook')}
          </p>
          <h2 className="mt-2 max-w-[22ch] text-[28px] font-extrabold leading-tight text-navy sm:text-[34px]">
            {t('It works like a notebook, not a chatbot')}
          </h2>
          <p className="mt-3 max-w-[60ch] text-[14.5px] leading-relaxed text-slate-600">
            {t('Each notebook holds its own sources. Sautika answers from those and nothing else, and shows you where every answer came from.')}
          </p>
        </Reveal>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
          {/* The three panes, as a list rather than a screenshot that would go stale. */}
          <Reveal>
            <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {PANES.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-line bg-paper p-4"
                >
                  <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-navy text-white">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <h3 className="mt-2.5 text-[15px] font-extrabold text-navy">{t(title)}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{t(body)}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* A real citation, not a promise of one. */}
          <Reveal>
            <div className="rounded-2xl border border-line bg-paper p-4 sm:p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {t('What an answer looks like')}
              </p>

              <p className="mt-3 max-w-[60ch] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-[14px] leading-relaxed text-white">
                {t('Why do leaves look green?')}
              </p>

              <div className="mt-3 rounded-2xl rounded-bl-md bg-white p-4">
                <p className="max-w-[60ch] text-[14px] leading-[1.7] text-ink">
                  {t('Leaves have a green colouring called chlorophyll. It takes in sunlight so the plant can make food.')}
                  <span
                    aria-hidden
                    className="mx-0.5 inline-flex min-w-[20px] items-center justify-center rounded bg-sun/40 px-1 align-super text-[10px] font-bold text-navy"
                  >
                    1
                  </span>
                </p>

                <div className="mt-3 border-t border-line pt-2.5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {t('Tap the 1 and you see this')}
                  </p>
                  <p className="mt-1.5 rounded-xl bg-sun/25 px-3 py-2 text-[12.5px] leading-relaxed text-ink ring-1 ring-sun">
                    <span className="mr-1.5 text-[11px] font-bold text-slate-500">{t('p.')}14</span>
                    {t('Chlorophyll is the green pigment in leaves. It absorbs light energy for photosynthesis.')}
                  </p>
                  <p className="mt-1.5 text-[11.5px] text-slate-500">
                    {t('From: Biology, Senior 2 — your own upload')}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[12.5px] leading-relaxed text-slate-600">
                {t('If your sources do not cover something, Sautika says so instead of making it up.')}
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

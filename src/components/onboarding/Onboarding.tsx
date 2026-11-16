'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Volume2, X } from 'lucide-react';
import ReadingComfort from '@/components/settings/ReadingComfort';
import { useVoice } from '@/hooks/useVoice';
import { SUNBIRD_LANGUAGES, hasSunbirdTts } from '@/lib/sunbird-languages';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';
import type { VoiceLang } from '@/types';

/**
 * The first-run tutorial.
 *
 * Built in-house rather than with a tour library, so it follows our tokens,
 * our translations and reduced motion, and so the language step can re-render
 * the whole tutorial in the chosen language the moment it is picked.
 *
 * Four steps: pick your language, make reading comfortable, learn where things
 * are, then try it on a real notebook. Every step has a Listen button, is at
 * most two sentences, and can be skipped.
 */

export const TOTAL_STEPS = 4;

/**
 * The languages offered first, each written in itself, so a learner
 * recognises their own without reading English. These are the ones Sunbird can
 * also speak, which is what makes the Listen button work.
 */
const FIRST_CHOICES: { code: VoiceLang; own: string }[] = [
  { code: 'eng', own: 'English' },
  { code: 'lug', own: 'Luganda' },
  { code: 'swa', own: 'Kiswahili' },
  { code: 'ach', own: 'Acholi' },
  { code: 'teo', own: 'Ateso' },
  { code: 'nyn', own: 'Runyankole' },
  { code: 'kin', own: 'Ikinyarwanda' },
];

/** What each coach mark points at, in the order a learner meets them. */
const COACH_MARKS: { title: string; body: string }[] = [
  {
    title: 'Add your sources',
    body: 'A PDF, a photo of your book, or your own typed notes.',
  },
  {
    title: 'Tick what to use',
    body: 'Only the sources you tick are used for answers.',
  },
  {
    title: 'Ask by typing or voice',
    body: 'Type your question, or hold the microphone and speak it.',
  },
  {
    title: 'Tap a citation',
    body: 'Every answer shows a number. Tap it to see where it came from.',
  },
  {
    title: 'Studio builds study material',
    body: 'Flashcards, a quiz, a mind map or a spoken overview.',
  },
  {
    title: 'Your notes stay here',
    body: 'Keep any answer as a note and find it again in Studio.',
  },
];

interface Props {
  /** A featured notebook to try, when one has been seeded. */
  sampleNotebookId?: string | null;
  onFinish: (completed: boolean) => void;
}

export default function Onboarding({ sampleNotebookId, onFinish }: Props) {
  const t = useUITranslation();
  const dialect = useApp((state) => state.dialect);
  const setDialect = useApp((state) => state.setDialect);
  const { speaking, speak, stopSpeaking } = useVoice();

  const [step, setStep] = useState(0);
  const [mark, setMark] = useState(0);
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus, so it goes back there afterwards.
  useEffect(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    return () => openerRef.current?.focus?.();
  }, []);

  // The heading takes focus on each step, so a screen reader announces it.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, mark]);

  const finish = useCallback(
    (completed: boolean): void => {
      stopSpeaking();
      setSaving(true);
      onFinish(completed);
    },
    [onFinish, stopSpeaking],
  );

  // Escape skips, and focus is trapped while the dialog is open.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        finish(false);
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [finish]);

  const STEPS: { title: string; body: string }[] = [
    {
      title: 'Which language do you learn in?',
      body: 'Pick one now. You can change it any time from the top of the screen.',
    },
    {
      title: 'Make reading comfortable',
      body: 'Change the letters and colours until this paragraph is easy for you.',
    },
    {
      title: COACH_MARKS[mark].title,
      body: COACH_MARKS[mark].body,
    },
    {
      title: 'Try it on a real notebook',
      body: 'Open a curriculum notebook and ask it something. Every answer shows its source.',
    },
  ];

  const current = STEPS[step];
  const canListen = hasSunbirdTts(dialect);

  const listen = (): void => {
    if (speaking) {
      stopSpeaking();
      return;
    }
    void speak(`${t(current.title)}. ${t(current.body)}`, dialect);
  };

  const next = (): void => {
    // The third step walks the coach marks before moving on.
    if (step === 2 && mark < COACH_MARKS.length - 1) {
      setMark((value) => value + 1);
      return;
    }
    if (step === TOTAL_STEPS - 1) {
      finish(true);
      return;
    }
    setStep((value) => value + 1);
  };

  const back = (): void => {
    if (step === 2 && mark > 0) {
      setMark((value) => value - 1);
      return;
    }
    if (step === 0) return;
    setStep((value) => value - 1);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-[70] grid place-items-end bg-navy/60 p-0 sm:place-items-center sm:p-4"
    >
      <div
        ref={dialogRef}
        className="max-h-[92vh] w-full max-w-[520px] overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
            {t('Step')} {step + 1} {t('of')} {TOTAL_STEPS}
            {step === 2 ? ` · ${mark + 1}/${COACH_MARKS.length}` : ''}
          </p>
          <button
            type="button"
            onClick={() => finish(false)}
            className="flex h-11 shrink-0 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-slate-500 transition hover:bg-mist"
          >
            <X className="h-4 w-4" aria-hidden /> {t('Skip')}
          </button>
        </div>

        <h2
          id="onboarding-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-2 text-[21px] font-extrabold leading-tight text-navy focus:outline-none"
        >
          {t(current.title)}
        </h2>
        <p className="mt-1.5 max-w-[48ch] text-[14px] leading-relaxed text-slate-600">
          {t(current.body)}
        </p>

        {canListen ? (
          <button
            type="button"
            onClick={listen}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-bold text-navy transition hover:bg-mist"
          >
            <Volume2 className="h-4 w-4" aria-hidden />
            {speaking ? t('Stop') : t('Listen')}
          </button>
        ) : null}

        <div className="mt-4">
          {/* ── 1. Language ───────────────────────────────────────────── */}
          {step === 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {FIRST_CHOICES.map((choice) => {
                const name =
                  SUNBIRD_LANGUAGES.find((entry) => entry.code === choice.code)?.name ?? choice.own;
                return (
                  <li key={choice.code}>
                    <button
                      type="button"
                      aria-pressed={dialect === choice.code}
                      onClick={() => setDialect(choice.code)}
                      className="flex min-h-[64px] w-full flex-col justify-center rounded-xl border border-line bg-white px-3 py-2 text-left transition aria-pressed:border-navy aria-pressed:bg-sun"
                    >
                      {/* The language's own name first: recognisable without English. */}
                      <span className="text-[14px] font-bold text-navy">{choice.own}</span>
                      {name !== choice.own ? (
                        <span className="text-[11px] text-slate-500">{name}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* ── 2. Reading comfort ────────────────────────────────────── */}
          {step === 1 ? <ReadingComfort compact /> : null}

          {/* ── 3. Coach marks ───────────────────────────────────────── */}
          {step === 2 ? (
            <div className="rounded-2xl bg-mist p-4">
              <ol className="space-y-1.5">
                {COACH_MARKS.map((entry, index) => (
                  <li
                    key={entry.title}
                    className={`flex items-center gap-2 text-[13px] ${
                      index === mark ? 'font-bold text-navy' : 'text-slate-500'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                        index < mark
                          ? 'bg-navy text-white'
                          : index === mark
                            ? 'bg-sun text-navy'
                            : 'bg-white text-slate-400'
                      }`}
                    >
                      {index < mark ? <Check className="h-3 w-3" /> : index + 1}
                    </span>
                    {t(entry.title)}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* ── 4. Try it ────────────────────────────────────────────── */}
          {step === 3 ? (
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-[13px] leading-relaxed text-slate-700">
                {t('A good first question:')}
              </p>
              <p className="mt-1.5 rounded-xl bg-white px-3 py-2 text-[13.5px] font-semibold text-navy">
                {t('Summarise these sources in simple words')}
              </p>
              {sampleNotebookId ? (
                <Link
                  href={`/notebook/${sampleNotebookId}`}
                  onClick={() => finish(true)}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sun text-[14px] font-bold text-navy transition hover:bg-sun-dark"
                >
                  {t('Open a notebook and try it')} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : (
                <Link
                  href="/notebook"
                  onClick={() => finish(true)}
                  className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sun text-[14px] font-bold text-navy transition hover:bg-sun-dark"
                >
                  {t('Go to your notebooks')} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 && mark === 0}
            className="flex h-12 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-[14px] font-bold text-navy transition hover:bg-mist disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> {t('Back')}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-navy text-[14px] font-bold text-white transition hover:bg-navy-2 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {step === TOTAL_STEPS - 1 ? t('Finish') : t('Next')}
            {step === TOTAL_STEPS - 1 ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>
    </div>
  );
}

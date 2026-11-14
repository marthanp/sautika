'use client';

import { Accessibility, Coins, Languages, Mic, Signal, Sparkles, type LucideIcon } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import { hasSunbirdTts, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import { useUITranslation } from '@/lib/useUITranslation';

const LANGUAGE_COUNT = SUNBIRD_LANGUAGES.length;
const VOICE_COUNT = SUNBIRD_LANGUAGES.filter((language) => hasSunbirdTts(language.code)).length;

const STEPS: { title: string; text: string }[] = [
  {
    title: 'Speak or snap',
    text: 'Ask a question out loud, or upload a photo of your notes and let Sautika read them.',
  },
  {
    title: 'Sautika understands',
    text: 'Your question is answered in your language, using only the notes and lessons you gave it.',
  },
  {
    title: 'Practise and win',
    text: 'Turn the answer into a quiz, keep your streak and collect learner coins.',
  },
];

const FEATURES: { icon: LucideIcon; title: string; text: string; bg: string; fg: string }[] = [
  {
    icon: Mic,
    title: 'Voice-first learning',
    text: 'Ask with your voice and hear the answer read back in a Sunbird AI voice.',
    bg: 'bg-amber-50',
    fg: 'text-amber-500',
  },
  {
    icon: Languages,
    title: 'Your own language',
    text: `The interface translates into ${LANGUAGE_COUNT} languages, and ${VOICE_COUNT} of them can speak: Luganda, Swahili, Acholi, Ateso, Runyankole and more.`,
    bg: 'bg-sky-50',
    fg: 'text-blue-600',
  },
  {
    icon: Sparkles,
    title: 'AI tutor on your notes',
    text: 'Summaries, study guides and quizzes built from your own notes, with a citation for each point.',
    bg: 'bg-violet-50',
    fg: 'text-violet-500',
  },
  {
    icon: Accessibility,
    title: 'Dyslexia-friendly',
    text: 'Pick a reading font, wider letter spacing, a page tint or high contrast in Settings.',
    bg: 'bg-emerald-50',
    fg: 'text-emerald-600',
  },
  {
    icon: Signal,
    title: 'Light on data',
    text: 'Pages and lessons you open are saved on your phone, so they still open on a weak connection.',
    bg: 'bg-teal-50',
    fg: 'text-teal-600',
  },
  {
    icon: Coins,
    title: 'Earn and grow',
    text: 'Collect coins for finishing a lesson or adding a note, then spend them on rewards.',
    bg: 'bg-yellow-50',
    fg: 'text-sun',
  },
];

export default function Features() {
  const t = useUITranslation();

  return (
    <section id="features" className="bg-paper px-6 pb-20 pt-16 md:px-16">
      <div className="mx-auto max-w-[1100px]">
        <Reveal className="text-center">
          <span className="mx-auto mb-5 block h-0.5 w-10 rounded bg-sun" />
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em]">{t('Why Sautika')}</p>
          <h2 className="mt-1.5 font-display text-[28px] font-bold leading-tight md:text-[32px]">
            {t('Built for real classrooms, real lives')}
          </h2>
          <p className="mx-auto mt-4 max-w-[470px] text-[14.5px] leading-[1.6] text-slate-500">
            {t(
              'Local languages, inclusive design and a light touch on data, so every learner can keep going.',
            )}
          </p>
        </Reveal>

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 110}
              className="relative overflow-hidden rounded-3xl bg-navy p-6 text-white"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -right-2 -top-6 font-display text-[108px] font-extrabold leading-none text-white/[0.07]"
              >
                {index + 1}
              </span>
              <h3 className="relative font-display text-[17px] font-bold">{t(step.title)}</h3>
              <p className="relative mt-2 text-[13.5px] leading-[1.65] text-white/75">{t(step.text)}</p>
            </Reveal>
          ))}
        </ol>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, bg, fg }, index) => (
            <Reveal
              as="li"
              key={title}
              delay={index * 80}
              className="group rounded-3xl border border-line bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-2xl ${bg}`}>
                <Icon className={`h-6 w-6 ${fg}`} strokeWidth={2} aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-[16px] font-bold text-navy">{t(title)}</h3>
              <p className="mt-2 text-[13.5px] leading-[1.7] text-slate-500">{t(text)}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

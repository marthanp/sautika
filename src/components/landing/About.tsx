'use client';

import { Heart, School, Target, Users } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';
import { useUITranslation } from '@/lib/useUITranslation';

/**
 * About Sautika.
 *
 * The header's "About" link used to jump to the footer, which only had an
 * address, so a visitor never found out who built this or why. This is that
 * section.
 */

const PILLARS: { icon: typeof Target; title: string; body: string }[] = [
  {
    icon: Target,
    title: 'Why we built it',
    body:
      'A learner in Kampala or Gulu can be fluent in Luganda or Acholi and still meet every lesson in English. ' +
      'Sautika lets them learn in the language they think in.',
  },
  {
    icon: School,
    title: 'Built on the real curriculum',
    body:
      'The lessons follow the Ugandan curriculum from Baby Class to Senior 6, and a learner can add their own ' +
      'notes, books and handouts to study from.',
  },
  {
    icon: Heart,
    title: 'Made for the phones people have',
    body:
      'Most of our learners are on an entry-level Android phone on metered data. Pages you have opened keep ' +
      'working on a weak connection, and nothing assumes a fast line.',
  },
  {
    icon: Users,
    title: 'Who we are',
    body:
      'A small team at Cavendish University Uganda in Kampala, working with Sunbird AI on Ugandan language ' +
      'speech and translation.',
  },
];

export default function About() {
  const t = useUITranslation();

  return (
    <section id="about" className="bg-paper px-6 pb-20 pt-16 md:px-16">
      <div className="mx-auto max-w-[1280px]">
        <Reveal>
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-slate-500">
            {t('About Sautika')}
          </p>
          <h2 className="mt-2 max-w-[24ch] text-[28px] font-extrabold leading-tight text-navy sm:text-[34px]">
            {t('Learning should not wait for a second language')}
          </h2>
          <p className="mt-3 max-w-[62ch] text-[14.5px] leading-relaxed text-slate-600">
            {t('Sautika is a voice-first study companion for East African learners. You can ask it a question out loud in your own language, and it answers from the lessons and notes you gave it.')}
          </p>
        </Reveal>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PILLARS.map(({ icon: Icon, title, body }) => (
            <li key={title}>
              <Reveal>
                <div className="h-full rounded-2xl border border-line bg-white p-5">
                  <span className="inline-grid h-10 w-10 place-items-center rounded-xl bg-sun text-navy">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-[16px] font-extrabold text-navy">{t(title)}</h3>
                  <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-slate-600">
                    {t(body)}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

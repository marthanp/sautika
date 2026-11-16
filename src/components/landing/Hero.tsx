'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowRight, ChevronDown, Coins, Globe, GraduationCap, Mic, Signal } from 'lucide-react';
import { Logo } from '@/components/ui/Icons';
import { COURSES } from '@/data/courses';
import { hasSunbirdTts, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';
import { useUITranslation } from '@/lib/useUITranslation';
import { useApp } from '@/store/useApp';

const NAV = [
  ['Home', '#home'],
  ['Features', '#features'],
  ['About', '#about'],
  ['Help', '#help'],
] as const;

/** The interface languages offered in the header. Choosing one translates the page. */
const MENU_LANGUAGES: { code: VoiceLang; name: string }[] = [
  { code: 'eng', name: 'English' },
  { code: 'swa', name: 'Swahili' },
  { code: 'lug', name: 'Luganda' },
  { code: 'ach', name: 'Acholi' },
  { code: 'teo', name: 'Ateso' },
  { code: 'nyn', name: 'Runyankole' },
  { code: 'kin', name: 'Kinyarwanda' },
];

/** Greetings stay in their own language; only the language name is translated. */
const GREETINGS = [
  { text: 'Oli otya?', language: 'Luganda' },
  { text: 'Habari?', language: 'Swahili' },
  { text: 'Agandi?', language: 'Runyankole' },
  { text: 'Itye nining?', language: 'Acholi' },
  { text: 'Yoga!', language: 'Ateso' },
  { text: 'Muraho!', language: 'Kinyarwanda' },
  { text: 'Hello!', language: 'English' },
];

const ORBIT = [
  'Luganda',
  'Swahili',
  'Acholi',
  'Ateso',
  'Runyankole',
  'Lusoga',
  'Lugbara',
  'Kinyarwanda',
];

const EQ_BARS = 14;
const GREETING_MS = 2600;

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToMotion(onChange: () => void): () => void {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

/** Read through useSyncExternalStore so the server and the first client pass agree. */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

export default function Hero() {
  const t = useUITranslation();
  const dialect = useApp((state) => state.dialect);
  const setDialect = useApp((state) => state.setDialect);
  const reducedMotion = usePrefersReducedMotion();

  const [menuOpen, setMenuOpen] = useState(false);
  const [greetingIndex, setGreetingIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(
      () => setGreetingIndex((index) => (index + 1) % GREETINGS.length),
      GREETING_MS,
    );
    return () => clearInterval(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  // Real counts, read from the data so they cannot drift.
  const stats = useMemo(
    () => [
      { value: COURSES.length, label: 'courses' },
      { value: SUNBIRD_LANGUAGES.length, label: 'languages' },
      { value: SUNBIRD_LANGUAGES.filter((language) => hasSunbirdTts(language.code)).length, label: 'voices' },
    ],
    [],
  );

  const currentLanguage =
    MENU_LANGUAGES.find((language) => language.code === dialect) ??
    SUNBIRD_LANGUAGES.find((language) => language.code === dialect) ??
    MENU_LANGUAGES[0];
  const greeting = GREETINGS[greetingIndex];

  return (
    <section id="home" className="hero-root relative overflow-hidden bg-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="hero-glow absolute -left-[12%] -top-[18%] h-[520px] w-[520px] rounded-full bg-sun/20 blur-[90px]" />
        <span className="hero-glow-2 absolute -right-[14%] top-[22%] h-[560px] w-[560px] rounded-full bg-sky-500/15 blur-[100px]" />
        <span className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_72%)]" />
      </div>

      <header className="relative z-20 mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-6 pt-5 md:px-16">
        <a href="#home" aria-label={t('Sautika home')} className="shrink-0">
          <Logo />
        </a>

        <nav
          aria-label={t('Primary')}
          className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur md:flex"
        >
          {NAV.map(([label, href], index) => (
            <a
              key={label}
              href={href}
              aria-current={index === 0 ? 'page' : undefined}
              className="inline-flex min-h-[44px] items-center rounded-full px-4 text-[13px] font-semibold text-white/75 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun aria-[current=page]:bg-white aria-[current=page]:text-navy"
            >
              {t(label)}
            </a>
          ))}
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="listbox"
            aria-label={`${t('Interface language')}: ${t(currentLanguage.name)}`}
            className="flex min-h-[44px] items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 text-[13px] font-semibold transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
          >
            <Globe className="h-[18px] w-[18px] text-sun" aria-hidden />
            {t(currentLanguage.name)}
            <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>

          {menuOpen ? (
            <ul
              role="listbox"
              aria-label={t('Interface language')}
              className="hero-pop absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-white/20 bg-navy-2 p-1.5 shadow-2xl"
            >
              {MENU_LANGUAGES.map((language) => {
                const on = language.code === dialect;
                return (
                  <li key={language.code} role="option" aria-selected={on}>
                    <button
                      type="button"
                      onClick={() => {
                        setDialect(language.code);
                        setMenuOpen(false);
                      }}
                      className={`flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-[13px] font-semibold transition-colors ${
                        on ? 'bg-sun text-navy' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      {t(language.name)}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-[1280px] items-center gap-12 px-6 pb-24 pt-10 md:px-16 md:pb-28 lg:grid-cols-2 lg:gap-8 lg:pt-14">
        <div className="hero-stagger">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-[11.5px] font-semibold">
            <GraduationCap className="h-3.5 w-3.5 text-sun" aria-hidden />
            {t('Voice-first AI tutor for East African learners')}
          </p>

          <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span key={greetingIndex} className="hero-word text-[26px] font-extrabold text-sun">
              {greeting.text}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              {t(greeting.language)}
            </span>
          </p>

          <h1 className="mt-3 font-display text-[40px] font-semibold leading-[1.08] tracking-tight sm:text-[52px] lg:text-[56px]">
            {t('Learn in the language')}{' '}
            <span className="relative inline-block whitespace-nowrap font-extrabold text-sun">
              {t('you think in.')}
              <svg
                aria-hidden
                viewBox="0 0 300 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1.5 left-0 h-[12px] w-full overflow-visible"
              >
                <path
                  className="hero-underline"
                  d="M4 9.5C52 3.5 104 2.5 152 5.5c36 2.2 70 6 144-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h1>

          <p className="mt-6 max-w-[520px] text-[15px] leading-[1.65] text-white/80">
            {t(
              'Speak a question, hear the answer. Sautika turns your notes and class lessons into quizzes, summaries and study guides in Luganda, Swahili, Acholi, English and more, from Baby Class to Senior 6.',
            )}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="group inline-flex min-h-[52px] items-center gap-3 rounded-full bg-sun px-7 text-[15px] font-bold text-navy shadow-lg shadow-black/20 transition-colors hover:bg-sun-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {t('Start learning free')}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
            <a
              href="#signin"
              className="inline-flex min-h-[52px] items-center rounded-full border border-white/25 px-7 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sun"
            >
              {t('I have an account')}
            </a>
          </div>

          <dl className="mt-9 flex flex-wrap gap-x-10 gap-y-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
                  {t(stat.label)}
                </dt>
                <dd className="font-display text-[30px] font-extrabold leading-none text-sun">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[520px]">
          <div
            aria-hidden
            className="hero-spin absolute inset-[4%] rounded-full border border-dashed border-white/25"
          >
            {ORBIT.map((name, index) => {
              const angle = (index / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <span
                  key={name}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${50 + 49 * Math.cos(angle)}%`,
                    top: `${50 + 49 * Math.sin(angle)}%`,
                  }}
                >
                  <span className="hero-spin-reverse block whitespace-nowrap rounded-full border border-white/15 bg-navy-2/90 px-2.5 py-1 text-[10.5px] font-semibold text-white/80">
                    {name}
                  </span>
                </span>
              );
            })}
          </div>

          <span aria-hidden className="hero-ring pointer-events-none absolute inset-[14%] rounded-full border border-sun/35" />
          <span aria-hidden className="hero-ring hero-ring-2 pointer-events-none absolute inset-[14%] rounded-full border border-sun/25" />
          <span aria-hidden className="hero-ring hero-ring-3 pointer-events-none absolute inset-[14%] rounded-full border border-sun/20" />

          <div className="absolute inset-[18%] overflow-hidden rounded-full border-4 border-white/10 shadow-2xl shadow-black/40">
            <Image
              src="/images/hero.jpg"
              alt={t('Two learners studying together')}
              fill
              priority
              sizes="(min-width: 1024px) 380px, 70vw"
              className="object-cover object-[58%_28%]"
            />
          </div>

          {/* Listening card */}
          <div className="hero-bob absolute -left-1 top-[6%] flex items-center gap-3 rounded-2xl border border-white/15 bg-navy-2/95 px-3.5 py-3 shadow-xl backdrop-blur sm:left-[-6%]">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sun/20">
              <span aria-hidden className="hero-ring absolute inset-0 rounded-full border border-sun/50" />
              <Mic className="h-4 w-4 text-sun" aria-hidden />
            </span>
            <span>
              <span className="block text-[11.5px] font-bold">{t('Listening')}</span>
              <span className="mt-1 flex h-5 items-end gap-[3px]" aria-hidden>
                {Array.from({ length: EQ_BARS }, (_, index) => (
                  <span
                    key={index}
                    className="hero-eq-bar block h-full w-[3px] rounded-full bg-sun/80"
                    style={{ animationDelay: `${index * 70}ms` }}
                  />
                ))}
              </span>
            </span>
          </div>

          {/* Quick quiz card */}
          <div className="hero-bob-slow absolute -right-1 bottom-[8%] w-[205px] rounded-2xl border border-white/15 bg-white px-3.5 py-3 text-navy shadow-xl sm:right-[-6%]">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {t('Quick quiz')}
            </p>
            <p className="mt-1 text-[12.5px] font-semibold leading-snug">
              {t('Which part of a plant makes food?')}
            </p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-700">
              {t('The leaves')} ✓
            </p>
          </div>

          {/* Coins pill */}
          <p className="hero-bob-fast absolute right-[4%] top-[2%] inline-flex items-center gap-1.5 rounded-full bg-sun px-3 py-1.5 text-[12px] font-extrabold text-navy shadow-lg">
            <Coins className="h-3.5 w-3.5" aria-hidden /> +10 {t('coins')}
          </p>

          {/* Low data pill */}
          <p className="hero-bob-slow absolute bottom-[1%] left-[2%] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-navy-2/95 px-3 py-1.5 text-[11.5px] font-semibold text-white/85 shadow-lg">
            <Signal className="h-3.5 w-3.5 text-sun" aria-hidden /> {t('Keeps working on low data')}
          </p>
        </div>
      </div>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 leading-[0]">
        <svg
          viewBox="0 0 1440 70"
          preserveAspectRatio="none"
          className="hero-wave -ml-[5%] h-[56px] w-[110%]"
        >
          <path
            fill="var(--color-paper)"
            d="M0 34C240 64 480 4 720 28s480 40 720 6v36H0z"
          />
        </svg>
      </div>
    </section>
  );
}

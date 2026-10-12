'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, ChevronDown, GraduationCap, Globe } from 'lucide-react';
import { Logo } from './Icons';

const NAV = [['Home', '#home'], ['Features', '#features'], ['About', '#about'], ['Help', '#help']] as const;
const LANGS = ['Swahili', 'Luganda', 'Acholi', 'Ateso', 'Runyankole', 'Many more'] as const;

export default function Hero() {
  const [lang, setLang] = useState<(typeof LANGS)[number]>('Luganda');
  const [headerLang, setHeaderLang] = useState('English');
  const [showLangMenu, setShowLangMenu] = useState(false);
  return (
    <section id="home" className="relative overflow-hidden bg-navy text-white">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full md:w-[58%]">
        <Image src="/images/hero.jpg" alt="Two smiling students learning in a classroom" fill priority sizes="(min-width:768px) 58vw, 100vw"
          className="object-cover object-[60%_30%] opacity-45 [mask-image:linear-gradient(to_right,transparent,#000_14%)] md:opacity-100" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/70 via-transparent to-transparent md:from-navy/60" />
      </div>
      <header className="relative z-10 mx-auto flex max-w-[1280px] items-center justify-between px-6 pt-5 md:px-16">
        <a href="#home" aria-label="Sautika home"><Logo /></a>
        <nav aria-label="Primary" className="absolute left-1/2 hidden -translate-x-1/2 gap-10 text-[13px] font-medium md:flex lg:left-[43%]">
          {NAV.map(([l, h], i) => (
            <a key={l} href={h} aria-current={i === 0 ? 'page' : undefined} className="relative pb-1.5 hover:text-sun aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-0.5 aria-[current=page]:after:h-0.5 aria-[current=page]:after:rounded aria-[current=page]:after:bg-sun">{l}</a>
          ))}
        </nav>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLangMenu((prev) => !prev)}
            className="flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3.5 text-[13px] font-medium transition hover:bg-white/10"
            aria-label={`Change language, currently ${headerLang}`}
          >
            <Globe className="h-[18px] w-[18px] text-sun" /> {headerLang} <ChevronDown className="h-4 w-4" />
          </button>
          {showLangMenu && (
            <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-white/20 bg-navy-2 p-1.5 shadow-2xl backdrop-blur">
              {['English', 'Swahili', 'Luganda', 'Acholi', 'Ateso', 'Runyankole'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setHeaderLang(l);
                    setShowLangMenu(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] font-medium transition ${
                    headerLang === l ? 'bg-sun text-navy font-bold' : 'text-white hover:bg-white/10'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 pb-14 pt-12 md:px-16 md:pb-[52px] md:pt-[52px]">
        <div className="max-w-[440px]">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-medium">
            <GraduationCap className="h-3.5 w-3.5" /> AI Learning Assistant for East African Students
          </p>
          <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.1] tracking-tight md:text-[46px]">
            Your Voice.<br /><span className="text-sun">Your Language.</span><br />A Brighter Future.
          </h1>
          <p className="mt-5 max-w-[360px] text-[14px] leading-[1.55] text-white/90">
            Sautika is a voice-first, AI-powered learning assistant that helps primary and secondary school students learn in their native languages anytime, anywhere, even offline.
          </p>
          <div role="group" aria-label="Choose your language" className="mt-5 flex flex-wrap gap-2.5">
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                className="min-h-9 rounded-full border border-white/15 bg-navy-2/80 px-4 text-[12px] font-medium backdrop-blur hover:border-sun aria-pressed:border-sun aria-pressed:bg-navy-2 aria-pressed:shadow-[inset_3px_0_0_var(--color-sun)]">{l}</button>
            ))}
          </div>
          <Link href="/register" className="mt-6 inline-flex min-h-[52px] items-center gap-3 rounded-full bg-sun px-6 py-2 text-[14px] font-semibold text-ink shadow-lg shadow-black/20 transition-colors hover:bg-sun-dark">
            Join the Platform <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

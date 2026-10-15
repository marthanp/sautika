'use client';
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Mail,
  Moon,
  Palette,
  Phone,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Type,
  User,
  Compass,
  Eye,
  Sliders,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { useApp } from '@/store/useApp';
import { useLearnerProfile } from '@/components/LearnerDataSync';
import type { DyslexiaFont, DyslexiaSpacing, DyslexiaLineHeight, ReadingTint } from '@/types';

const SECTIONS = [
  { id: 'Account', text: 'Profile, personal info and security', icon: User },
  { id: 'Appearance', text: 'Theme, display and language', icon: Palette },
  { id: 'Notifications', text: 'Alerts, reminders and updates', icon: Bell },
  { id: 'Learning Preferences', text: 'Study goals and pace', icon: Compass },
  { id: 'Privacy & Security', text: 'Data, permissions and access', icon: Shield },
  { id: 'Help & Support', text: 'Get help or contact us', icon: CircleHelp },
];

const field = 'mt-1.5 flex h-[46px] min-w-0 items-center rounded-xl border border-line bg-[#F8FAFD] px-3 text-[14px]';

interface FontOption {
  id: DyslexiaFont;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  sample: string;
  fontClass: string;
}

const FONTS: FontOption[] = [
  {
    id: 'opendyslexic',
    name: 'OpenDyslexic',
    badge: 'Specialized for Dyslexia',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Designed with weighted bottom letters to anchor each character and prevent letter rotation, flipping, or swapping in the brain.',
    sample: 'Soma • Ongea • Jifunze na ukue pamoja na Sautika',
    fontClass: 'font-opendyslexic',
  },
  {
    id: 'lexend',
    name: 'Lexend',
    badge: 'Research Proven',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Scientifically proven by educational researchers to significantly improve reading fluency, comprehension, and speed for dyslexic learners.',
    sample: 'Soma • Ongea • Jifunze na ukue pamoja na Sautika',
    fontClass: 'font-lexend',
  },
  {
    id: 'atkinson',
    name: 'Atkinson Hyperlegible',
    badge: 'Braille Institute',
    description: 'Developed to maximize character differentiation. Similar characters like 1, I, l and 0, O are distinct to eliminate reading ambiguity.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    sample: 'Soma • Ongea • Jifunze na ukue pamoja na Sautika',
    fontClass: 'font-atkinson',
  },
  {
    id: 'comic-neue',
    name: 'Comic Neue',
    badge: 'Young Learners',
    description: 'Friendly, casual letterforms recommended by dyslexia associations. Curved, non-mirrored strokes make letters easier to track.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    sample: 'Soma • Ongea • Jifunze na ukue pamoja na Sautika',
    fontClass: 'font-comic-neue',
  },
  {
    id: 'default',
    name: 'Inter (Default)',
    badge: 'Standard Sans',
    description: 'Standard modern sans-serif typeface designed for crisp screen legibility across modern digital devices.',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    sample: 'Soma • Ongea • Jifunze na ukue pamoja na Sautika',
    fontClass: 'font-sans',
  },
];

const SPACING_OPTIONS: { id: DyslexiaSpacing; name: string; desc: string }[] = [
  { id: 'normal', name: 'Normal', desc: 'Standard character spacing' },
  { id: 'relaxed', name: 'Relaxed (+5%)', desc: 'Reduces visual crowding between letters' },
  { id: 'wide', name: 'Wide (+12%)', desc: 'Optimal for dyslexia letter tracking' },
];

const LINE_HEIGHT_OPTIONS: { id: DyslexiaLineHeight; name: string; desc: string }[] = [
  { id: 'normal', name: 'Standard (1.5x)', desc: 'Standard spacing between lines' },
  { id: 'relaxed', name: 'Relaxed (1.75x)', desc: 'Prevents skipping lines when reading' },
  { id: 'loose', name: 'Spacious (2.0x)', desc: 'Maximum line separation for visual comfort' },
];

const SIZES = [
  { id: '90%', label: 'Small (90%)' },
  { id: '100%', label: 'Default (100%)' },
  { id: '115%', label: 'Large (115%)' },
  { id: '130%', label: 'Extra Large (130%)' },
];

const TINTS: { id: ReadingTint; name: string; hex: string; desc: string }[] = [
  { id: 'none', name: 'Standard', hex: '#FFFFFF', desc: 'Default screen background' },
  { id: 'cream', name: 'Soft Cream', hex: '#FFF8E8', desc: 'Gentle warmth to ease strain' },
  { id: 'yellow', name: 'Warm Yellow', hex: '#FEF8D3', desc: 'Proven dyslexia overlay tint' },
  { id: 'peach', name: 'Soft Peach', hex: '#FFF0E5', desc: 'Reduces high-contrast glare' },
  { id: 'mint', name: 'Calming Mint', hex: '#EAF8F0', desc: 'Soothing against eye fatigue' },
  { id: 'blue', name: 'Gentle Sky', hex: '#E8F3FE', desc: 'Cool tint to reduce harsh white' },
];

function AppearanceSection() {
  const {
    colorMode,
    font,
    scale,
    letterSpacing,
    lineHeight,
    readingTint,
    wide,
    setPrefs,
  } = useApp();

  const activeFont = font || 'default';
  const activeSpacing = letterSpacing || (wide ? 'wide' : 'normal');
  const activeLineHeight = lineHeight || 'normal';
  const activeTint = readingTint || 'none';
  const activeScale = scale || '100%';

  const resetAccessibility = () => {
    setPrefs({
      font: 'default',
      letterSpacing: 'normal',
      lineHeight: 'normal',
      scale: '100%',
      readingTint: 'none',
      wide: false,
    });
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* Overview & Mission Banner */}
      <Card className="relative overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-[580px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sun/20 px-3 py-1 text-[12.5px] font-bold text-navy">
              <Sparkles className="h-3.5 w-3.5 text-sun-dark" /> Dyslexia & Accessibility Tools
            </span>
            <h2 className="mt-2 text-[22px] font-extrabold text-navy">
              Reading & Typography Settings
            </h2>
            <p className="mt-1 text-[14px] leading-relaxed text-slate-600">
              Personalize fonts, letter spacing, line height, and reading tints to support dyslexic learners and make reading effortless.
            </p>
            <p className="mt-2 text-[12px] font-semibold text-emerald-700">Your choices apply across the app and save automatically.</p>
          </div>
          <button
            onClick={resetAccessibility}
            className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-[13px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
            title="Reset to default typography"
          >
            <RotateCcw className="h-4 w-4" /> Reset Defaults
          </button>
        </div>
      </Card>

      {/* Live Interactive Reading Preview */}
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-50 text-amber-700">
              <Eye className="h-5 w-5" />
            </span>
            <div>
              <b className="text-[16px]">Interactive Reading Preview</b>
              <p className="text-[12.5px] text-slate-500">Live test showing how learning materials appear with your settings</p>
            </div>
          </div>
          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[12px] font-bold text-blue-700">
            {FONTS.find((f) => f.id === activeFont)?.name}
          </span>
        </div>

        <div
          className="mt-4 rounded-2xl border-2 border-line p-5 transition-all"
          style={{
            backgroundColor: TINTS.find((t) => t.id === activeTint)?.hex || '#FFFFFF',
          }}
        >
          <div className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-wider text-slate-500">
            <span>Science • Darasa la 6</span>
            <span>•</span>
            <span>Mfumo wa Jua</span>
          </div>
          <h3 className="mt-1.5 text-[20px] font-extrabold text-ink">
            Jinsi Sayari Zinavyozunguka Jua
          </h3>
          <p
            className={`mt-2.5 text-slate-800 ${FONTS.find((f) => f.id === activeFont)?.fontClass ?? ''}`}
            style={{
              fontSize: `${15 * (Number.parseInt(activeScale, 10) / 100)}px`,
              letterSpacing: activeSpacing === 'wide' ? '0.12em' : activeSpacing === 'relaxed' ? '0.05em' : undefined,
              wordSpacing: activeSpacing === 'wide' ? '0.25em' : activeSpacing === 'relaxed' ? '0.12em' : undefined,
              lineHeight: activeLineHeight === 'loose' ? 2 : activeLineHeight === 'relaxed' ? 1.75 : 1.5,
            }}
          >
            Katika mfumo wa jua, sayari zote nane huzunguka jua kwa njia maalum inayoitwa mzingo.
            Dunia yetu inachukua takriban siku 365 kukamilisha mzunguko mmoja kamili.
            Kusoma kwa fonti sahihi huondoa uchovu wa macho na kusaidia maneno kutotembea au kubadilika wakati wa kusoma.
          </p>
          <div aria-live="polite" className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/60 pt-2 text-[12px] text-slate-600">
            <span>Font: <strong className="text-navy">{FONTS.find((f) => f.id === activeFont)?.name}</strong></span>
            <span>•</span>
            <span>Spacing: <strong className="text-navy">{SPACING_OPTIONS.find((s) => s.id === activeSpacing)?.name}</strong></span>
            <span>•</span>
            <span>Size: <strong className="text-navy">{activeScale}</strong></span>
          </div>
        </div>
      </Card>

      {/* Font Family Selection */}
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700">
            <Type className="h-5 w-5" />
          </span>
          <div>
            <b className="text-[17px]">Dyslexia & Accessible Fonts</b>
            <p className="text-[13px] text-slate-500">
              Select a specialized typeface optimized to prevent letter flipping, crowding, and visual stress.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {FONTS.map((f) => {
            const isSelected = activeFont === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setPrefs({ font: f.id })}
                className={`relative flex min-w-0 w-full flex-col rounded-2xl border-2 p-4 text-left transition-all ${
                  isSelected
                    ? 'border-sun bg-[#FFFDF5] shadow-sm ring-2 ring-sun/30'
                    : 'border-line bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full border ${
                        isSelected
                          ? 'border-sun bg-sun text-navy font-bold'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </span>
                    <span className="text-[16px] font-extrabold text-navy">{f.name}</span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-bold ${f.badgeColor}`}
                  >
                    {f.badge}
                  </span>
                </div>

                <p className="mt-2 text-[13px] text-slate-600 leading-snug">
                  {f.description}
                </p>

                {/* Sample text preview styled in this specific font */}
                <div
                  className={`mt-3 rounded-xl border border-line bg-[#F8FAFD] px-3.5 py-2.5 text-[16px] text-slate-800 ${f.fontClass}`}
                >
                  <span className="text-[11px] block font-sans uppercase font-bold text-slate-600 mb-0.5">
                    Font Preview:
                  </span>
                  {f.sample}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Letter Spacing & Line Height (Anti-Crowding) */}
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <Sliders className="h-5 w-5" />
          </span>
          <div>
            <b className="text-[17px]">Letter Spacing & Line Height (Anti-Crowding)</b>
            <p className="text-[13px] text-slate-500">
              Increasing letter and line spacing significantly reduces visual crowding for dyslexic readers.
            </p>
          </div>
        </div>

        {/* Letter Spacing */}
        <div className="mt-5">
          <label className="text-[13.5px] font-bold text-navy">Letter & Word Spacing</label>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
            {SPACING_OPTIONS.map((opt) => {
              const selected = activeSpacing === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() =>
                    setPrefs({
                      letterSpacing: opt.id,
                      wide: opt.id === 'wide',
                    })
                  }
                  className={`flex flex-col rounded-xl border-2 p-3 text-left transition ${
                    selected
                      ? 'border-sun bg-[#FFFDF5] shadow-sm ring-2 ring-sun/30'
                      : 'border-line bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <b className="text-[14px]">{opt.name}</b>
                    {selected && <Check className="h-4 w-4 text-sun-dark stroke-[3]" />}
                  </div>
                  <span className="mt-1 text-[12px] text-slate-500 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Line Height */}
        <div className="mt-6">
          <label className="text-[13.5px] font-bold text-navy">Line Height (Vertical Spacing)</label>
          <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
            {LINE_HEIGHT_OPTIONS.map((opt) => {
              const selected = activeLineHeight === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPrefs({ lineHeight: opt.id })}
                  className={`flex flex-col rounded-xl border-2 p-3 text-left transition ${
                    selected
                      ? 'border-sun bg-[#FFFDF5] shadow-sm ring-2 ring-sun/30'
                      : 'border-line bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <b className="text-[14px]">{opt.name}</b>
                    {selected && <Check className="h-4 w-4 text-sun-dark stroke-[3]" />}
                  </div>
                  <span className="mt-1 text-[12px] text-slate-500 leading-tight">
                    {opt.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Text Size Scaling */}
        <div className="mt-6">
          <label className="text-[13.5px] font-bold text-navy">Text Size</label>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {SIZES.map((sz) => {
              const selected = activeScale === sz.id;
              return (
                <button
                  key={sz.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPrefs({ scale: sz.id })}
                  className={`h-11 rounded-xl border-2 px-3 text-[14px] font-bold transition ${
                    selected
                      ? 'border-sun bg-sun text-navy'
                      : 'border-line bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sz.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Reading Tints / Visual Stress Relief */}
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-purple-50 text-purple-700">
            <Palette className="h-5 w-5" />
          </span>
          <div>
            <b className="text-[17px]">Reading Tint (Scotopic Sensitivity Relief)</b>
            <p className="text-[13px] text-slate-500">
              Colored page tints reduce glare from pure white screens, which can cause letters to dance or vibrate.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {TINTS.map((t) => {
            const selected = activeTint === t.id;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setPrefs({ readingTint: t.id })}
                className={`flex items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                  selected
                    ? 'border-sun bg-[#FFFDF5] shadow-sm ring-2 ring-sun/30'
                    : 'border-line bg-white hover:bg-slate-50'
                }`}
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-lg border border-slate-300 shadow-inner"
                  style={{ backgroundColor: t.hex }}
                />
                <div className="min-w-0 flex-1">
                  <b className="block text-[13.5px] truncate">{t.name}</b>
                  <span className="block text-[11px] text-slate-500 truncate">{t.desc}</span>
                </div>
                {selected && <Check className="h-4 w-4 shrink-0 text-sun-dark stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Theme Color Mode */}
      <Card className="min-w-0 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <b className="text-[16px]">Interface Color Mode</b>
            <p className="text-[13px] text-slate-500">Toggle between Light mode and Dark mode</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={colorMode === 'light'}
              onClick={() => setPrefs({ colorMode: 'light' })}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-bold transition ${
                colorMode === 'light'
                  ? 'border-sun bg-sun text-navy'
                  : 'border-line bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Sun className="h-4 w-4" /> Light
            </button>
            <button
              type="button"
              aria-pressed={colorMode === 'dark'}
              onClick={() => setPrefs({ colorMode: 'dark' })}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-bold transition ${
                colorMode === 'dark'
                  ? 'border-navy bg-navy text-white'
                  : 'border-line bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Moon className="h-4 w-4" /> Dark
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [streakReminders, setStreakReminders] = useState(true);
  const [courseUpdates, setCourseUpdates] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const toggle = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    setter((prev) => !prev);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-[19px] font-extrabold text-navy">Notifications &amp; Alerts</h2>
        <p className="mt-1 text-[14px] text-slate-500">Choose how and when Sautika notifies you about learning activity.</p>
        {savedMsg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700">Notification preferences updated ✓</p>}

        <div className="mt-5 space-y-4 divide-y divide-line">
          <div className="flex items-center justify-between pt-3">
            <div>
              <b className="block text-[15px] text-navy">Daily Streak Reminders</b>
              <span className="text-[13px] text-slate-500">Get a reminder to keep your daily learning streak burning.</span>
            </div>
            <button
              type="button"
              onClick={() => toggle(setStreakReminders)}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${streakReminders ? 'bg-sun' : 'bg-slate-300'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${streakReminders ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <b className="block text-[15px] text-navy">New Course &amp; Curriculum Alerts</b>
              <span className="text-[13px] text-slate-500">Notify me when new past papers and lessons are published from Sharebility.</span>
            </div>
            <button
              type="button"
              onClick={() => toggle(setCourseUpdates)}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${courseUpdates ? 'bg-sun' : 'bg-slate-300'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${courseUpdates ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <b className="block text-[15px] text-navy">Interactive Sound Effects</b>
              <span className="text-[13px] text-slate-500">Play audio chimes when answering questions correctly or completing lessons.</span>
            </div>
            <button
              type="button"
              onClick={() => toggle(setSoundEffects)}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${soundEffects ? 'bg-sun' : 'bg-slate-300'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${soundEffects ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between pt-4">
            <div>
              <b className="block text-[15px] text-navy">Weekly Progress Digest</b>
              <span className="text-[13px] text-slate-500">Receive a weekly summary email of coins earned and lessons finished.</span>
            </div>
            <button
              type="button"
              onClick={() => toggle(setEmailDigest)}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${emailDigest ? 'bg-sun' : 'bg-slate-300'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${emailDigest ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LearningPreferencesSection() {
  const [dailyGoal, setDailyGoal] = useState('1');
  const [voiceLang, setVoiceLang] = useState('English');
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-[19px] font-extrabold text-navy">Learning Preferences</h2>
        <p className="mt-1 text-[14px] text-slate-500">Customize your daily pace, voice playback, and study routines.</p>
        {saved && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-1.5 text-[13px] font-semibold text-emerald-700">Learning preferences saved ✓</p>}

        <div className="mt-6 space-y-6">
          <div>
            <label className="text-[14px] font-bold text-navy">Daily Lesson Goal</label>
            <p className="text-[12.5px] text-slate-500">How many lessons do you want to aim to complete each day?</p>
            <div className="mt-2.5 grid grid-cols-4 gap-2.5">
              {[
                { count: '1', desc: '1 Lesson (Casual)' },
                { count: '2', desc: '2 Lessons (Regular)' },
                { count: '3', desc: '3 Lessons (Serious)' },
                { count: '5', desc: '5 Lessons (Mastery)' },
              ].map(({ count, desc }) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => { setDailyGoal(count); save(); }}
                  className={`rounded-xl border-2 p-3 text-left transition ${dailyGoal === count ? 'border-sun bg-[#FFFDF5] shadow-sm ring-2 ring-sun/30' : 'border-line bg-white hover:bg-slate-50'}`}
                >
                  <b className="block text-[15px]">{count} Lesson{count !== '1' ? 's' : ''}</b>
                  <span className="text-[11px] text-slate-500">{desc.split(' ')[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[14px] font-bold text-navy">Preferred Audio Accent / Language</label>
            <p className="text-[12.5px] text-slate-500">Audio playback voice used for text-to-speech questions.</p>
            <div className="mt-2.5 flex flex-wrap gap-2.5">
              {['English', 'Kiswahili', 'Luganda'].map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => { setVoiceLang(lang); save(); }}
                  className={`h-10 rounded-full border px-5 text-[13.5px] font-bold transition ${voiceLang === lang ? 'border-sun bg-sun text-navy' : 'border-line bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <b className="block text-[15px] text-navy">Auto-Read Questions Aloud</b>
              <span className="text-[13px] text-slate-500">Automatically pronounce lesson prompts when you advance.</span>
            </div>
            <button
              type="button"
              onClick={() => { setAutoPlayAudio(!autoPlayAudio); save(); }}
              className={`h-7 w-12 rounded-full p-1 transition-colors ${autoPlayAudio ? 'bg-sun' : 'bg-slate-300'}`}
            >
              <div className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${autoPlayAudio ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function PrivacySecuritySection() {
  const [cleared, setCleared] = useState(false);

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('sautika-app-cache');
      } catch {}
    }
    setCleared(true);
    setTimeout(() => setCleared(false), 3000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-[19px] font-extrabold text-navy">Privacy &amp; Data Security</h2>
        <p className="mt-1 text-[14px] text-slate-500">Manage your local storage, privacy rights and session security.</p>

        <div className="mt-5 space-y-4 divide-y divide-line">
          <div className="pt-3">
            <b className="block text-[15px] text-navy">Authentication &amp; Session Encryption</b>
            <p className="mt-1 text-[13px] text-slate-600">Your account is secured with Clerk authentication. Sessions are cryptographically signed with JWT tokens and refreshed automatically.</p>
          </div>

          <div className="pt-4">
            <b className="block text-[15px] text-navy">Offline Device Storage (Dexie &amp; IndexedDB)</b>
            <p className="mt-1 text-[13px] text-slate-600">Sautika caches notes and lesson progress on your device so you can study without internet connection.</p>
            <button
              type="button"
              onClick={clearCache}
              className="mt-3 inline-flex h-9 items-center rounded-lg border border-red-200 bg-red-50 px-4 text-[13px] font-bold text-red-700 hover:bg-red-100"
            >
              {cleared ? 'Offline cache refreshed ✓' : 'Clear Local Cache'}
            </button>
          </div>

          <div className="pt-4">
            <b className="block text-[15px] text-navy">Data Protection Rights</b>
            <p className="mt-1 text-[13px] text-slate-600">Compliant with Uganda’s Data Protection and Privacy Act (2019). We never sell your personal educational data or voice recordings to third parties.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function HelpSupportSection() {
  const [feedback, setFeedback] = useState('');
  const [sent, setSent] = useState(false);

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setSent(true);
    setFeedback('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-[19px] font-extrabold text-navy">Help &amp; Customer Support</h2>
        <p className="mt-1 text-[14px] text-slate-500">Get in touch with the Sautika team or browse quick solutions.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <a
            href="tel:+256772270027"
            className="flex items-center gap-3 rounded-xl border border-line bg-[#F8FAFD] p-4 transition hover:border-sun hover:bg-[#FFFDF5]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sun text-navy font-bold">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <b className="block text-[14.5px] text-navy">Call Support</b>
              <span className="text-[13px] text-blue-700 font-semibold">+256 772 270 027</span>
            </div>
          </a>

          <a
            href="mailto:support@sautika.com"
            className="flex items-center gap-3 rounded-xl border border-line bg-[#F8FAFD] p-4 transition hover:border-sun hover:bg-[#FFFDF5]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white font-bold">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <b className="block text-[14.5px] text-navy">Email Us</b>
              <span className="text-[13px] text-blue-700 font-semibold">support@sautika.com</span>
            </div>
          </a>
        </div>

        <form onSubmit={send} className="mt-6 border-t border-line pt-5">
          <b className="block text-[15px] text-navy">Send us a direct message or feedback</b>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tell us what you need help with or how we can improve Sautika..."
            rows={3}
            className="mt-2 w-full rounded-xl border border-line p-3.5 text-sm focus:border-navy focus:outline-none"
          />
          {sent && <p className="mt-2 text-[13px] font-semibold text-emerald-700">Thank you! Your message has been received. Our team will follow up.</p>}
          <button
            type="submit"
            disabled={!feedback.trim()}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-sun px-6 text-[13.5px] font-bold text-navy shadow-sm transition hover:bg-sun-dark disabled:opacity-50"
          >
            Submit Message
          </button>
        </form>
      </Card>
    </div>
  );
}

export default function SettingsPanel() {
  const [sec, setSec] = useState('Account');
  const profile = useLearnerProfile();
  const { user } = useUser();
  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Learner';
  const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    const handleSwitchTab = (e: CustomEvent<string>) => {
      if (e.detail && SECTIONS.some((s) => s.id === e.detail)) {
        setSec(e.detail);
      }
    };
    window.addEventListener('switch-settings-tab' as any, handleSwitchTab);
    return () => window.removeEventListener('switch-settings-tab' as any, handleSwitchTab);
  }, []);

  return (
    <div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-[minmax(250px,0.75fr)_minmax(0,2fr)] xl:grid-cols-[minmax(250px,0.7fr)_minmax(0,2fr)]">
      {/* Left Navigation */}
      <Card className="min-w-0 self-start p-2.5">
        {SECTIONS.map(({ id, text, icon: I }) => (
          <button
            key={id}
            aria-current={sec === id}
            onClick={() => setSec(id)}
            className="flex min-w-0 w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left aria-[current=true]:bg-[#FFF3D0]"
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
                sec === id ? 'bg-sun' : 'border border-line bg-white'
              }`}
            >
              <I className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1 break-words text-[15px] font-bold leading-tight">
              {id}
              <span className="block text-[12.5px] font-normal text-slate-500">{text}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0" />
          </button>
        ))}
      </Card>

      {/* Right Content */}
      {sec === 'Appearance' ? (
        <AppearanceSection />
      ) : sec === 'Account' ? (
        <div className="min-w-0 space-y-4">
          <Card className="p-6">
            <h2 className="text-[19px] font-extrabold">Account Profile</h2>
            <p className="mt-1 text-[14px] text-slate-500">Your profile is read-only. Contact an administrator to update your account details.</p>
            <div className="mt-4 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full bg-navy text-lg font-bold text-white"
                style={user?.imageUrl ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
              >{user?.imageUrl ? null : initials}</span>
              <div><b className="text-[14px]">Learner Profile</b><p className="text-[12.5px] text-slate-500">Only administrators can change your identity details.</p></div>
            </div>
            <div className="mt-5 grid gap-x-7 gap-y-4 2xl:grid-cols-2">
              <label className="min-w-0 text-[13px] font-semibold">
                Full Name<div className={field}>{fullName}</div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Grade / Class
                <div className={field}>{profile?.educationLevel || 'Not specified'}</div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Email Address
                <div className={`${field} justify-between`}><span className="truncate">{profile?.email || 'Loading profile…'}</span><Mail className="h-4 w-4 shrink-0 text-slate-500" /></div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Phone Number
                <div className={`${field} justify-between`}><span className="truncate">{profile?.contact || 'Not provided'}</span><Phone className="h-4 w-4 shrink-0 text-slate-500" /></div>
              </label>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <b className="text-[16px]">Account Security</b>
                <p className="text-[12.5px] text-slate-500">Keep your account safe and secure.</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#EEF5FB] p-4">
              <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1">
                <b className="text-[14px] text-emerald-800">Sign-in secured by Clerk</b>
                <span className="block text-[12px] text-slate-600">Administrators manage profile and credential changes through the Clerk Dashboard.</span>
              </span>
            </div>
          </Card>
        </div>
      ) : sec === 'Notifications' ? (
        <NotificationsSection />
      ) : sec === 'Learning Preferences' ? (
        <LearningPreferencesSection />
      ) : sec === 'Privacy & Security' ? (
        <PrivacySecuritySection />
      ) : sec === 'Help & Support' ? (
        <HelpSupportSection />
      ) : null}
    </div>
  );
}

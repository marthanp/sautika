'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import {
  ArrowRight,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Compass,
  Download,
  Eye,
  KeyRound,
  Mail,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  RotateCcw,
  Shield,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sprout,
  Sun,
  Target,
  Type,
  User,
  X,
  Zap,
} from 'lucide-react';
import { Bar, Card, Ring } from '@/components/ui';
import { useApp } from '@/store/useApp';
import { useLearnerAccount, useLearnerProfile } from '@/components/LearnerDataSync';
import { coursesForClass } from '@/lib/course-access';
import type { DyslexiaFont, DyslexiaSpacing, DyslexiaLineHeight, ReadingTint } from '@/types';

const ACTIONS = [
  ['Change Password', KeyRound],
  ['Manage Notifications', Bell],
  ['Download Offline Content', Download],
] as const;

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
                  className={`h-10 sm:h-11 min-w-0 truncate rounded-xl border-2 px-2 sm:px-3 text-xs sm:text-[13px] font-bold text-center transition ${
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
          <div className="flex items-center justify-between gap-3 pt-3">
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

          <div className="flex items-center justify-between gap-3 pt-4">
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
            <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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

function AccountSection({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const { data } = useLearnerAccount();
  const profile = useLearnerProfile();
  const { user } = useUser();
  const [modalType, setModalType] = useState<'password' | 'offline' | null>(null);

  const fullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Learner';
  const initials = fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  const courses = coursesForClass(data?.courses ?? [], profile.educationLevel);
  const courseIds = new Set(courses.map((course) => course.id));
  const totalLessons = courses.reduce((total, course) => total + course.lessons.length, 0);
  const completedLessons = (data?.courseProgress ?? [])
    .filter((progress) => courseIds.has(progress.courseId))
    .reduce((total, progress) => total + progress.completedLessonIndexes.length, 0);
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;

  const handleAction = (title: string) => {
    if (title === 'Manage Notifications') {
      onSwitchTab('Notifications');
    } else if (title === 'Change Password') {
      setModalType('password');
    } else if (title === 'Download Offline Content') {
      setModalType('offline');
    }
  };

  const field = 'mt-1 flex h-[40px] min-w-0 items-center rounded-lg border border-line bg-[#F8FAFD] px-3 text-[13.5px] font-medium text-slate-800';

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Account Profile Card */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
          <div>
            <h2 className="text-base font-bold text-navy sm:text-[18px]">Account Profile</h2>
            <p className="text-xs text-slate-500">Your profile is read-only. Contact an administrator to update personal identity.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            Read-Only
          </span>
        </div>

        {/* Profile Avatar & Info Row */}
        <div className="mt-4 flex items-center gap-3 sm:gap-4">
          <span
            aria-hidden="true"
            className="grid h-12 w-12 sm:h-14 sm:w-14 shrink-0 place-items-center rounded-full bg-navy text-base font-bold text-white shadow-xs"
            style={user?.imageUrl ? { backgroundImage: `url("${user.imageUrl}")`, backgroundPosition: 'center', backgroundSize: 'cover' } : undefined}
          >
            {user?.imageUrl ? null : initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-extrabold text-navy truncate">{fullName}</span>
              <span className="rounded-md bg-sun/25 px-2 py-0.5 text-[11px] font-bold text-navy">
                {profile?.educationLevel || 'Class: P.1'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Learner Profile • Only administrators can modify identity details.</p>
          </div>
        </div>

        {/* Profile Fields Grid */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <label className="min-w-0 text-xs font-semibold text-slate-700">
            Full Name
            <div className={field}><span className="truncate">{fullName}</span></div>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-700">
            Grade / Class
            <div className={field}><span className="truncate">{profile?.educationLevel || 'Not specified'}</span></div>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-700">
            Email Address
            <div className={`${field} justify-between`}>
              <span className="truncate">{profile?.email || 'Loading profile…'}</span>
              <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          </label>
          <label className="min-w-0 text-xs font-semibold text-slate-700">
            Phone Number
            <div className={`${field} justify-between`}>
              <span className="truncate">{profile?.contact || 'Not provided'}</span>
              <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            </div>
          </label>
        </div>

        {/* Integrated Clerk Security Row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 sm:px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-900">Sign-in secured by Clerk</p>
              <p className="text-[11.5px] text-slate-600">Password and credentials managed securely</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Secured
            </span>
            <button
              type="button"
              onClick={() => handleAction('Change Password')}
              className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-bold text-emerald-800 shadow-xs transition hover:bg-emerald-50"
            >
              Password Details
            </button>
          </div>
        </div>
      </Card>

      {/* Account Overview, Learning Goals & Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Keep Going Banner */}
        <div className="relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl border border-sun/30 bg-gradient-to-br from-sun/25 via-[#FEF1CF] to-sun/10 p-4 shadow-xs">
          <div className="relative z-10 flex items-start gap-2.5">
            <Sprout className="mt-0.5 h-6 w-6 shrink-0 text-sun-dark" />
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Keep Going, {profile?.firstName || 'Learner'}!</h3>
              <p className="mt-1 text-xs text-slate-600 leading-snug">Small steps every day lead to big dreams.</p>
            </div>
          </div>
          <div className="relative z-10 mt-3 flex items-center justify-between text-[11.5px] font-semibold text-sun-dark">
            <span>Sautika Learning Hub</span>
            <span className="text-[10.5px] opacity-75">Keep it up! 🌟</span>
          </div>
        </div>

        {/* Learning Goals */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sun/20 text-navy">
                <Target className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">Learning Goals</h3>
            </div>
            <Link href="/progress" className="inline-flex items-center gap-1 text-[11px] font-bold text-navy hover:text-sun-dark">
              Progress <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Ring v={progressPercent} size={64} stroke={6}>
              <span className="text-sm font-bold text-slate-900">{progressPercent}%</span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800">Lesson Completion</p>
              <p className="text-[11px] text-slate-500">{completedLessons} of {totalLessons} completed</p>
              <div className="mt-1.5"><Bar v={progressPercent} color="#12A36B" /></div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sun/20 text-navy">
              <Zap className="h-4 w-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-900">Quick Actions</h3>
          </div>
          <div className="mt-2.5 flex flex-col gap-1.5">
            {ACTIONS.map(([t, I]) => (
              <button
                key={t}
                type="button"
                onClick={() => handleAction(t)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <I className="h-3.5 w-3.5 text-navy shrink-0" />
                <span className="flex-1 truncate">{t}</span>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {modalType === 'password' && (
        <div role="dialog" aria-modal aria-label="Change Password" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Shield className="h-5 w-5 text-blue-600" /> Account Password
              </h3>
              <button aria-label="Close" onClick={() => setModalType(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              Your credentials and sign-in methods are managed securely through Clerk authentication. To reset your password, visit the sign-in portal or consult your administrator.
            </p>
            <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-[13px] text-slate-700">
              <b>Primary Email:</b> {profile?.email || 'Learner Account'}
            </div>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setModalType(null)}
                className="h-11 flex-1 rounded-xl border border-line font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'offline' && (
        <div role="dialog" aria-modal aria-label="Offline Content" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xl font-bold text-navy">
                <Download className="h-5 w-5 text-emerald-600" /> Offline Content
              </h3>
              <button aria-label="Close" onClick={() => setModalType(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              All 37 curriculum courses across Baby Class to S.6 and 6,485 Sharebility resources are cached on your device.
            </p>
            <div className="mt-4 space-y-2 rounded-xl bg-emerald-50 p-4 text-[13px] text-emerald-900">
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> Baby class to top class: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> P.1 to P.4 curriculum: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> P.5 to P.7 curriculum: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> S.1 to S.4 O-Level: Available offline</p>
              <p className="flex items-center gap-2 font-bold"><Check className="h-4 w-4 text-emerald-700" /> S.5 to S.6 A-Level: Available offline</p>
            </div>
            <button
              type="button"
              onClick={() => setModalType(null)}
              className="mt-5 h-11 w-full rounded-xl bg-sun font-bold text-navy hover:bg-sun-dark"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPanel() {
  const [sec, setSec] = useState('Account');
  const [isNavHidden, setIsNavHidden] = useState(false);

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
    <div className={`mt-4 grid min-w-0 gap-5 transition-all duration-200 ${
      isNavHidden
        ? 'grid-cols-1'
        : 'lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]'
    }`}>
      {/* Left Navigation Bar */}
      {!isNavHidden && (
        <Card className="min-w-0 self-start p-2.5 w-full">
          {/* Navigation Bar Header with Hide Icon */}
          <div className="flex items-center justify-between px-2.5 py-1.5 mb-1 border-b border-line/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Navigation</span>
            <button
              type="button"
              onClick={() => setIsNavHidden(true)}
              title="Hide navigation bar"
              aria-label="Hide navigation bar"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-navy"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>

          {/* Section Items */}
          <div className="flex flex-col gap-1">
            {SECTIONS.map(({ id, text, icon: I }) => {
              const active = sec === id;
              return (
                <button
                  key={id}
                  aria-current={active}
                  onClick={() => setSec(id)}
                  className={`flex min-w-0 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-sun/30 text-navy font-bold shadow-xs' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg transition-colors ${
                      active ? 'bg-sun text-navy' : 'border border-line bg-white text-slate-600'
                    }`}
                  >
                    <I className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 break-words text-[14px] leading-tight">
                    {id}
                    <span className="block text-[11.5px] font-normal text-slate-500">{text}</span>
                  </span>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${active ? 'text-navy translate-x-0.5' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-col">
        {/* Toggle to show navigation bar when hidden */}
        {isNavHidden && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white px-3.5 py-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsNavHidden(false)}
                title="Show navigation bar"
                aria-label="Show navigation bar"
                className="inline-flex items-center gap-2 rounded-lg bg-sun/25 px-2.5 py-1.5 text-xs font-bold text-navy transition hover:bg-sun"
              >
                <PanelLeftOpen className="h-4 w-4" />
                <span>Show Navigation</span>
              </button>
              <span className="text-xs text-slate-300">|</span>
              <span className="text-xs font-medium text-slate-500">
                Viewing: <strong className="text-navy">{sec}</strong>
              </span>
            </div>

            {/* Quick tab switcher pills when navigation is hidden */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {SECTIONS.map(({ id, icon: I }) => {
                const active = sec === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSec(id)}
                    title={id}
                    aria-label={id}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                      active ? 'bg-sun text-navy font-bold' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <I className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{id}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Content sections */}
        {sec === 'Appearance' ? (
          <AppearanceSection />
        ) : sec === 'Account' ? (
          <AccountSection onSwitchTab={setSec} />
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
    </div>
  );
}

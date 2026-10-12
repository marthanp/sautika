'use client';
import Image from 'next/image';
import { useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  KeyRound,
  LogOut,
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
      <Card className="p-6">
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
          <p className="mt-2.5 text-[15px] text-slate-800">
            Katika mfumo wa jua, sayari zote nane huzunguka jua kwa njia maalum inayoitwa mzingo.
            Dunia yetu inachukua takriban siku 365 kukamilisha mzunguko mmoja kamili.
            Kusoma kwa fonti sahihi huondoa uchovu wa macho na kusaidia maneno kutotembea au kubadilika wakati wa kusoma.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-[12px] text-slate-600">
            <span>Font: <strong className="text-navy">{FONTS.find((f) => f.id === activeFont)?.name}</strong></span>
            <span>•</span>
            <span>Spacing: <strong className="text-navy">{SPACING_OPTIONS.find((s) => s.id === activeSpacing)?.name}</strong></span>
            <span>•</span>
            <span>Size: <strong className="text-navy">{activeScale}</strong></span>
          </div>
        </div>
      </Card>

      {/* Font Family Selection */}
      <Card className="p-6">
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

        <div className="mt-5 space-y-3">
          {FONTS.map((f) => {
            const isSelected = activeFont === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setPrefs({ font: f.id })}
                className={`relative flex w-full flex-col text-left rounded-2xl border-2 p-4 transition-all ${
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
      <Card className="p-6">
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
      <Card className="p-6">
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
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <b className="text-[16px]">Interface Color Mode</b>
            <p className="text-[13px] text-slate-500">Toggle between Light mode and Dark mode</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
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

export default function SettingsPanel() {
  const [sec, setSec] = useState('Account');
  const [tfa, setTfa] = useState(false);
  const cur = SECTIONS.find((s) => s.id === sec)!;

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
            <h2 className="text-[19px] font-extrabold">Account Settings</h2>
            <p className="mt-1 text-[14px] text-slate-500">Update your personal information and account details.</p>
            <div className="mt-4 flex items-center gap-4">
              <span className="relative">
                <Image
                  src="/images/aisha.jpg"
                  alt="Aisha"
                  width={89}
                  height={86}
                  className="h-[88px] w-[88px] rounded-full object-cover"
                />
                <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white">
                  <Camera className="h-4 w-4" />
                </span>
              </span>
              <div>
                <b className="text-[14px]">Profile Photo</b>
                <p className="text-[12.5px] text-slate-500">Choose a clear photo (optional).</p>
                <button className="mt-2 h-10 rounded-lg border border-blue-200 px-5 text-[14px] font-semibold text-blue-700">
                  Change Photo
                </button>
              </div>
            </div>
            <div className="mt-5 grid gap-x-7 gap-y-4 2xl:grid-cols-2">
              <label className="min-w-0 text-[13px] font-semibold">
                Full Name<div className={field}>Aisha N.</div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Grade / Class
                <div className={`${field} justify-between`}>
                  <span className="truncate">Primary 6</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Email Address
                <div className={`${field} justify-between`}>
                  <span className="truncate">aisha.n@example.com</span>
                  <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                </div>
              </label>
              <label className="min-w-0 text-[13px] font-semibold">
                Phone Number
                <div className={`${field} justify-between`}>
                  <span className="truncate">+256 700 123 456</span>
                  <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                </div>
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
            <button className="mt-3 flex w-full items-center gap-4 text-left">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
                <KeyRound className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="text-[15px]">Change Password</b>
                <span className="block text-[12.5px] text-slate-500">Update your password regularly.</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </button>
            <div className="mt-3 flex items-center gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
                <Shield className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="text-[15px]">Two-Factor Authentication</b>
                <span className="block text-[12.5px] text-slate-500">Add an extra layer of security.</span>
              </span>
              <button
                role="switch"
                aria-checked={tfa}
                aria-label="Two-factor authentication"
                onClick={() => setTfa(!tfa)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  tfa ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <i
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    tfa ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl bg-[#EEF5FB] p-4">
              <ShieldCheck className="h-7 w-7 shrink-0 text-emerald-600" />
              <span className="min-w-0 flex-1">
                <b className="text-[14px] text-emerald-800">Your account is secure</b>
                <span className="block text-[12px] text-slate-600">Last active: Today, 4:32 PM</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </div>
            <button className="mt-5 flex h-12 items-center gap-3 rounded-xl border border-red-300 px-5 text-[15px] font-bold text-red-600">
              <LogOut className="h-5 w-5" />
              Log Out
            </button>
          </Card>
        </div>
      ) : (
        <Card className="min-w-0 p-6">
          <h2 className="text-[19px] font-extrabold">{cur.id}</h2>
          <p className="mt-1 text-[14px] text-slate-500">{cur.text}.</p>
          <p className="mt-6 rounded-xl bg-[#F8FAFD] p-5 text-[14px] text-slate-600">
            These settings are coming soon.
          </p>
        </Card>
      )}
    </div>
  );
}

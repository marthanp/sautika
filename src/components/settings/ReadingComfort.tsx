'use client';

import { useRouter } from 'next/navigation';
import { Check, Eye, Ruler, Type } from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';
import type { DyslexiaFont, DyslexiaLineHeight, DyslexiaSpacing, ReadingTint } from '@/types';

/**
 * Reading comfort, in one place.
 *
 * These controls used to be buried in a 1,189-line settings panel, where a new
 * learner never found them. This component is the whole set, and it is used in
 * three places: the settings page, the "Aa" button in the top bar, and step 2
 * of the first-run tutorial.
 *
 * `Dyslexia mode` applies a sensible preset in one tap. Every value under it
 * stays adjustable on its own, because the right combination is personal.
 */

const FONTS: { value: DyslexiaFont; label: string; note: string }[] = [
  { value: 'default', label: 'Standard', note: 'Inter' },
  { value: 'lexend', label: 'Lexend', note: 'Made for reading speed' },
  { value: 'opendyslexic', label: 'OpenDyslexic', note: 'Weighted letter bottoms' },
  { value: 'atkinson', label: 'Atkinson', note: 'High legibility' },
  { value: 'comic-neue', label: 'Comic Neue', note: 'Rounded and friendly' },
];

const SIZES = ['90%', '100%', '115%', '130%'];
const SPACINGS: DyslexiaSpacing[] = ['normal', 'relaxed', 'wide'];
const LINE_HEIGHTS: DyslexiaLineHeight[] = ['normal', 'relaxed', 'loose'];
const TINTS: { value: ReadingTint; label: string; swatch: string }[] = [
  { value: 'none', label: 'None', swatch: '#ffffff' },
  { value: 'cream', label: 'Cream', swatch: '#fbf3e4' },
  { value: 'yellow', label: 'Yellow', swatch: '#fdf6c3' },
  { value: 'peach', label: 'Peach', swatch: '#fde8dc' },
  { value: 'mint', label: 'Mint', swatch: '#e2f6ec' },
  { value: 'blue', label: 'Blue', swatch: '#e4eefb' },
];

/** A row of choices, as buttons rather than a select: easier to hit, easier to see. */
function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
  describe,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string; note?: string }[];
  onChange: (next: T) => void;
  describe?: (option: { value: T; label: string }) => string;
}) {
  return (
    <fieldset className="mt-4">
      <legend className="text-[13px] font-bold text-navy">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-label={describe ? describe(option) : option.label}
            onClick={() => onChange(option.value)}
            className="flex min-h-[44px] flex-col justify-center rounded-xl border border-line bg-white px-3 py-1.5 text-left transition aria-pressed:border-navy aria-pressed:bg-sun"
          >
            <span className="text-[13px] font-semibold text-navy">{option.label}</span>
            {option.note ? (
              <span className="text-[11px] text-slate-500">{option.note}</span>
            ) : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The one switch plus the reading aids, without the font and colour pickers.
 *
 * Used at the top of the settings page, which already has a richer typography
 * section: this adds what that section never had (the one-tap preset, the
 * ruler, focus mode, bold word starts and the read-aloud speed) without
 * duplicating the pickers underneath it.
 */
export function ReadingAids() {
  const t = useUITranslation();
  const router = useRouter();
  const dyslexiaMode = useApp((s) => s.dyslexiaMode);
  const setDyslexiaMode = useApp((s) => s.setDyslexiaMode);
  const readingRuler = useApp((s) => s.readingRuler);
  const focusMode = useApp((s) => s.focusMode);
  const boldWordStarts = useApp((s) => s.boldWordStarts);
  const readAloudRate = useApp((s) => s.readAloudRate);
  const setPrefs = useApp((s) => s.setPrefs);

  const replay = (): void => {
    try {
      window.sessionStorage.setItem('sautika-replay-onboarding', '1');
      window.localStorage.removeItem('sautika-onboarded');
    } catch {
      // Storage blocked: the learner can still reach everything by hand.
    }
    // The gate reads session storage on mount, so land on a page it guards.
    router.push('/home');
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h2 className="text-[17px] font-extrabold text-navy">{t('Reading comfort')}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">
        {t('One switch sets a comfortable starting point. Everything below stays yours to change.')}
      </p>

      <button
        type="button"
        role="switch"
        aria-checked={dyslexiaMode}
        onClick={() => setDyslexiaMode(!dyslexiaMode)}
        className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-sun aria-checked:border-navy aria-checked:bg-sun/20"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist text-[15px] font-extrabold text-navy">
          Aa
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-navy">{t('Dyslexia mode')}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-600">
            {t('Readable font, bigger text, more space and a cream page, in one tap.')}
          </span>
        </span>
        <span
          aria-hidden
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
            dyslexiaMode ? 'border-navy bg-navy text-white' : 'border-line'
          }`}
        >
          {dyslexiaMode ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </button>

      <div className="mt-3 space-y-2">
        <Toggle
          icon={Ruler}
          label={t('Reading ruler')}
          note={t('A band that follows your pointer and dims the rest.')}
          on={readingRuler}
          onChange={(on) => setPrefs({ readingRuler: on })}
        />
        <Toggle
          icon={Eye}
          label={t('Focus mode')}
          note={t('Hides the side panels and shows one thing at a time.')}
          on={focusMode}
          onChange={(on) => setPrefs({ focusMode: on })}
        />
        <Toggle
          icon={Type}
          label={t('Bold word starts')}
          note={t('Optional. It helps some readers and not others.')}
          on={boldWordStarts}
          onChange={(on) => setPrefs({ boldWordStarts: on })}
        />

        <label className="block rounded-xl border border-line bg-white p-3">
          <span className="text-[13px] font-semibold text-navy">
            {t('Read-aloud speed')}: {readAloudRate.toFixed(2)}x
          </span>
          <input
            type="range"
            min={0.75}
            max={1.5}
            step={0.25}
            value={readAloudRate}
            onChange={(event) => setPrefs({ readAloudRate: Number(event.target.value) })}
            className="mt-2 h-11 w-full accent-navy"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={replay}
        className="mt-3 h-11 w-full rounded-xl border border-line bg-white text-[13px] font-bold text-navy transition hover:bg-mist"
      >
        {t('Show me the tutorial again')}
      </button>
    </div>
  );
}

export default function ReadingComfort({ compact = false }: { compact?: boolean }) {
  const t = useUITranslation();
  const dyslexiaMode = useApp((s) => s.dyslexiaMode);
  const setDyslexiaMode = useApp((s) => s.setDyslexiaMode);
  const font = useApp((s) => s.font);
  const scale = useApp((s) => s.scale);
  const letterSpacing = useApp((s) => s.letterSpacing);
  const lineHeight = useApp((s) => s.lineHeight);
  const readingTint = useApp((s) => s.readingTint);
  const readingRuler = useApp((s) => s.readingRuler);
  const focusMode = useApp((s) => s.focusMode);
  const boldWordStarts = useApp((s) => s.boldWordStarts);
  const readAloudRate = useApp((s) => s.readAloudRate);
  const setPrefs = useApp((s) => s.setPrefs);

  return (
    <div>
      {/* ── The one switch ──────────────────────────────────────────────── */}
      <button
        type="button"
        role="switch"
        aria-checked={dyslexiaMode}
        onClick={() => setDyslexiaMode(!dyslexiaMode)}
        className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white p-4 text-left transition hover:border-sun aria-checked:border-navy aria-checked:bg-sun/20"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mist text-[15px] font-extrabold text-navy">
          Aa
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-bold text-navy">{t('Dyslexia mode')}</span>
          <span className="mt-0.5 block text-[12.5px] leading-snug text-slate-600">
            {t('Readable font, bigger text, more space and a cream page, in one tap.')}
          </span>
        </span>
        <span
          aria-hidden
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 ${
            dyslexiaMode ? 'border-navy bg-navy text-white' : 'border-line'
          }`}
        >
          {dyslexiaMode ? <Check className="h-3.5 w-3.5" /> : null}
        </span>
      </button>

      {/* ── A live sample, so a change is visible straight away ─────────── */}
      <div className="mt-4 rounded-2xl border border-line bg-paper p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {t('How it looks')}
        </p>
        <p className="mt-2 max-w-[65ch] text-[15px] leading-[1.7] text-ink">
          {t('Plants use sunlight, water and air to make their own food. We call this photosynthesis.')}
        </p>
      </div>

      <Choice
        legend={t('Font')}
        value={font}
        options={FONTS.map((entry) => ({
          value: entry.value,
          label: t(entry.label),
          note: t(entry.note),
        }))}
        onChange={(value) => setPrefs({ font: value })}
      />

      <Choice
        legend={t('Text size')}
        value={scale}
        options={SIZES.map((size) => ({ value: size, label: size }))}
        onChange={(value) => setPrefs({ scale: value })}
        describe={(option) => `${t('Text size')} ${option.label}`}
      />

      <Choice
        legend={t('Letter spacing')}
        value={letterSpacing}
        options={SPACINGS.map((value) => ({ value, label: t(value) }))}
        onChange={(value) => setPrefs({ letterSpacing: value })}
      />

      <Choice
        legend={t('Line spacing')}
        value={lineHeight}
        options={LINE_HEIGHTS.map((value) => ({ value, label: t(value) }))}
        onChange={(value) => setPrefs({ lineHeight: value })}
      />

      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold text-navy">{t('Page colour')}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {TINTS.map((tint) => (
            <button
              key={tint.value}
              type="button"
              aria-pressed={readingTint === tint.value}
              aria-label={t(tint.label)}
              onClick={() => setPrefs({ readingTint: tint.value })}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] font-semibold text-navy transition aria-pressed:border-navy aria-pressed:bg-sun"
            >
              <span
                aria-hidden
                className="h-5 w-5 rounded-full border border-line"
                style={{ background: tint.swatch }}
              />
              {t(tint.label)}
            </button>
          ))}
        </div>
      </fieldset>

      {/* ── Reading aids ────────────────────────────────────────────────── */}
      {!compact ? (
        <div className="mt-5 space-y-2">
          <h3 className="text-[13px] font-bold text-navy">{t('Reading aids')}</h3>

          <Toggle
            icon={Ruler}
            label={t('Reading ruler')}
            note={t('A band that follows your pointer and dims the rest.')}
            on={readingRuler}
            onChange={(on) => setPrefs({ readingRuler: on })}
          />
          <Toggle
            icon={Eye}
            label={t('Focus mode')}
            note={t('Hides the side panels and shows one thing at a time.')}
            on={focusMode}
            onChange={(on) => setPrefs({ focusMode: on })}
          />
          <Toggle
            icon={Type}
            label={t('Bold word starts')}
            note={t('Optional. It helps some readers and not others.')}
            on={boldWordStarts}
            onChange={(on) => setPrefs({ boldWordStarts: on })}
          />

          <label className="block rounded-xl border border-line bg-white p-3">
            <span className="text-[13px] font-semibold text-navy">
              {t('Read-aloud speed')}: {readAloudRate.toFixed(2)}x
            </span>
            <input
              type="range"
              min={0.75}
              max={1.5}
              step={0.25}
              value={readAloudRate}
              onChange={(event) => setPrefs({ readAloudRate: Number(event.target.value) })}
              className="mt-2 h-11 w-full accent-navy"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

function Toggle({
  icon: Icon,
  label,
  note,
  on,
  onChange,
}: {
  icon: typeof Ruler;
  label: string;
  note: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition hover:border-sun aria-checked:border-navy aria-checked:bg-sun/20"
    >
      <Icon className="h-4 w-4 shrink-0 text-navy" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-navy">{label}</span>
        <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-600">{note}</span>
      </span>
      <span
        aria-hidden
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
          on ? 'border-navy bg-navy text-white' : 'border-line'
        }`}
      >
        {on ? <Check className="h-3 w-3" /> : null}
      </span>
    </button>
  );
}

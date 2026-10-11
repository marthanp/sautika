'use client';
import { useApp } from '@/store/useApp';
import type { Theme, DyslexiaFont } from '@/types';

const THEMES: [Theme, string][] = [['navy', 'Navy'], ['parchment', 'Parchment'], ['contrast', 'High contrast']];
const SIZES: [string, string][] = [['100%', 'Normal'], ['115%', 'Large'], ['130%', 'Extra large']];
const FONTS: [DyslexiaFont, string, string][] = [
  ['default', 'Standard', 'font-sans'],
  ['opendyslexic', 'OpenDyslexic', 'font-opendyslexic'],
  ['lexend', 'Lexend', 'font-lexend'],
  ['atkinson', 'Atkinson', 'font-atkinson'],
  ['comic-neue', 'Comic Neue', 'font-comic-neue'],
];

export default function Settings({ onClose }: { onClose: () => void }) {
  const { theme, scale, wide, font, setPrefs } = useApp();
  const currentFont = font || 'default';

  return (
    <div role="dialog" aria-modal aria-label="Settings" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto rounded-[28px] border-2 border-line bg-white p-6 shadow-2xl">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-navy">Make it easy to read</h2>

        <p className="mb-2 text-sm font-bold text-slate-700">Dyslexia & Accessible Fonts</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {FONTS.map(([v, l, cls]) => (
            <button
              key={v}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                currentFont === v
                  ? 'border-sun bg-sun text-navy font-bold'
                  : 'border-line bg-slate-50 text-slate-700 hover:bg-slate-100'
              } ${cls}`}
              aria-pressed={currentFont === v}
              onClick={() => setPrefs({ font: v })}
            >
              {l}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-bold text-slate-700">Colors</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {THEMES.map(([v, l]) => (
            <button
              key={v}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                theme === v
                  ? 'border-sun bg-sun text-navy'
                  : 'border-line bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              aria-pressed={theme === v}
              onClick={() => setPrefs({ theme: v })}
            >
              {l}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-bold text-slate-700">Text size</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {SIZES.map(([v, l]) => (
            <button
              key={v}
              className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
                scale === v
                  ? 'border-sun bg-sun text-navy'
                  : 'border-line bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
              aria-pressed={scale === v}
              onClick={() => setPrefs({ scale: v })}
            >
              {l}
            </button>
          ))}
        </div>

        <p className="mb-2 text-sm font-bold text-slate-700">Letter spacing</p>
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
              !wide
                ? 'border-sun bg-sun text-navy'
                : 'border-line bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            aria-pressed={!wide}
            onClick={() => setPrefs({ wide: false, letterSpacing: 'normal' })}
          >
            Normal
          </button>
          <button
            className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition ${
              wide
                ? 'border-sun bg-sun text-navy'
                : 'border-line bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
            aria-pressed={wide}
            onClick={() => setPrefs({ wide: true, letterSpacing: 'wide' })}
          >
            Wide (for dyslexia)
          </button>
        </div>

        <button
          className="w-full h-11 rounded-xl bg-navy text-white font-bold transition hover:bg-navy-2"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

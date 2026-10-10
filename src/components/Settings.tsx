'use client';
import { useApp } from '@/store/useApp';
import type { Theme } from '@/types';

const THEMES: [Theme, string][] = [['navy', 'Navy'], ['parchment', 'Parchment'], ['contrast', 'High contrast']];
const SIZES: [string, string][] = [['100%', 'Normal'], ['115%', 'Large'], ['130%', 'Extra large']];

export default function Settings({ onClose }: { onClose: () => void }) {
  const { theme, scale, wide, setPrefs } = useApp();
  return (
    <div role="dialog" aria-modal aria-label="Settings" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-[420px] rounded-[28px] border-2 border-ln bg-card p-6">
        <h2 className="mb-4 font-display text-2xl font-semibold">Make it easy to read</h2>
        <p className="mb-2 text-mu">Colors</p>
        <div className="mb-4 flex flex-wrap gap-2">{THEMES.map(([v, l]) => <button key={v} className="chip" aria-pressed={theme === v} onClick={() => setPrefs({ theme: v })}>{l}</button>)}</div>
        <p className="mb-2 text-mu">Text size</p>
        <div className="mb-4 flex flex-wrap gap-2">{SIZES.map(([v, l]) => <button key={v} className="chip" aria-pressed={scale === v} onClick={() => setPrefs({ scale: v })}>{l}</button>)}</div>
        <p className="mb-2 text-mu">Spacing</p>
        <div className="mb-5 flex flex-wrap gap-2">
          <button className="chip" aria-pressed={!wide} onClick={() => setPrefs({ wide: false })}>Normal</button>
          <button className="chip" aria-pressed={wide} onClick={() => setPrefs({ wide: true })}>Wide, for dyslexia</button>
        </div>
        <button className="btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

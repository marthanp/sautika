'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Globe, Headphones, Lightbulb, Pause, Pencil, Play, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { KEY_POINTS, LANGS } from '@/lib/data';

const TABS = [{ n: '1', label: 'Listen & Learn', icon: Headphones }, { n: '2', label: 'Practice', icon: Pencil }, { n: '3', label: 'Quiz', icon: ClipboardList }, { n: '✓', label: 'Complete', icon: Check }];
const TOTAL = 720;
const fmt = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function LessonView() {
  const [tab, setTab] = useState(0);
  const [lang, setLang] = useState('Luganda');
  const [t, setT] = useState(168);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!playing) return; const id = setInterval(() => setT((x) => (x >= TOTAL ? 0 : x + 1)), 1000); return () => clearInterval(id); }, [playing]);
  const pct = (t / TOTAL) * 100;
  const next = TABS[Math.min(3, tab + 1)].label;
  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div role="tablist" aria-label="Lesson steps" className="grid gap-3 sm:grid-cols-4">
        {TABS.map(({ n, label, icon: I }, i) => (
          <button key={label} role="tab" aria-selected={tab === i} onClick={() => setTab(i)} className="flex min-h-[52px] min-w-0 items-center gap-2 rounded-xl bg-[#EDF3FD] px-3 text-[14px] font-bold text-blue-700 aria-selected:border aria-selected:border-sun aria-selected:bg-[#FFF1C7] aria-selected:text-navy sm:gap-3 sm:px-4 sm:text-[16px]">
            <span className="shrink-0 text-[12px] opacity-60 sm:text-[13px]">{n}</span><I className="h-5 w-5 shrink-0" /><span className="min-w-0 leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="min-w-0 rounded-2xl border border-line bg-[#F8FAFD] p-5 lg:col-span-3">
          <h3 className="flex min-w-0 items-center gap-3 text-[20px] font-extrabold"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-600 text-white"><Volume2 className="h-5 w-5" /></span>Listen to the lesson</h3>
          <p className="mt-2 max-w-[420px] text-[14px] leading-snug text-slate-500 sm:ml-12 sm:mt-1 sm:max-w-[340px]">Tap the play button and listen to Sautika explain the concept in your language.</p>
          <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl bg-[#EEF3FB] p-3 sm:gap-4">
            <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause lesson' : 'Play lesson'} className="grid h-[62px] w-[62px] shrink-0 place-items-center rounded-full bg-sun">{playing ? <Pause className="h-7 w-7 fill-navy text-navy" /> : <Play className="h-7 w-7 fill-navy text-navy" />}</button>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3"><div aria-hidden className="flex h-9 min-w-0 flex-1 items-center gap-1 overflow-hidden sm:gap-[3px]">{Array.from({ length: 32 }, (_, k) => <i key={k} className="w-[2px] rounded-full sm:w-[3px]" style={{ height: 6 + Math.abs(Math.sin(k * 1.7) * 22) * (1 - k / 52), background: (k / 32) * 100 < pct ? '#FFC400' : '#0B2A57' }} />)}</div><span className="whitespace-nowrap text-[12px] text-slate-600 sm:text-[13px]">{fmt(t)} / {fmt(TOTAL)}</span></div>
              <div className="mt-3 h-1.5 rounded-full bg-slate-200"><i className="block h-full rounded-full bg-sun" style={{ width: `${pct}%` }} /></div>
            </div>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[15px] font-semibold"><Globe className="h-5 w-5" />Language</p>
          <div role="group" aria-label="Lesson language" className="mt-2 flex flex-wrap gap-2.5">{LANGS.map((l) => <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className="h-10 rounded-full border border-line bg-white px-4 text-[14px] font-semibold aria-pressed:border-sun aria-pressed:bg-[#FFE48A]">{l}</button>)}</div>
        </div>
        <div className="min-w-0 rounded-2xl border border-line bg-[#F8FAFD] p-5 lg:col-span-2">
          <h3 className="flex items-center gap-3 text-[20px] font-extrabold"><Lightbulb className="h-7 w-7" />Key Points</h3>
          <ul className="mt-4 space-y-3.5">{KEY_POINTS.map((k) => <li key={k} className="flex items-start gap-3 text-[15px] leading-snug"><span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#FBBF24] text-white"><Check className="h-4 w-4" strokeWidth={3} /></span>{k}</li>)}</ul>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={() => setTab(Math.max(0, tab - 1))} className="flex h-12 items-center justify-center gap-3 rounded-full bg-[#EDF3FD] px-6 text-[15px] font-bold text-blue-700 sm:px-7 sm:text-[16px]"><ArrowLeft className="h-5 w-5" />Previous</button>
        <button onClick={() => setTab(Math.min(3, tab + 1))} className="flex h-12 items-center justify-center gap-3 rounded-full bg-sun px-6 text-[15px] font-bold sm:px-7 sm:text-[16px]">Next: {next}<ArrowRight className="h-5 w-5" /></button>
      </div>
    </Card>
  );
}

'use client';
import { useMemo, useState } from 'react';
import type { Item, VoiceLang } from '@/types';
import { useVoice } from '@/lib/useVoice';

interface Props { items: Item[]; ttsLang?: string; onFinish: (xp: number) => void; onQuit: () => void }
const shuffle = <T,>(a: T[]): T[] => [...a].sort(() => Math.random() - 0.5);

export default function LessonPlayer({ items, ttsLang, onFinish, onQuit }: Props) {
  const [queue, setQueue] = useState<Item[]>(items);
  const [i, setI] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [correct, setCorrect] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [built, setBuilt] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [retried, setRetried] = useState<number[]>([]);
  const { speak } = useVoice();
  const it: Item | undefined = queue[i];
  const finished = !it || hearts < 1;
  const opts = useMemo(() => (!it ? [] : it.k === 'm' ? shuffle([it.a, ...it.d]) : shuffle([...it.a.split(' '), ...it.x])), [it, i]);
  const xp = hearts > 0 ? 10 + hearts * 2 : 0;

  function check(): void {
    if (!it) return;
    const got = it.k === 'm' ? (sel === null ? '' : opts[sel]) : built.map((n) => opts[n]).join(' ');
    const ok = got === it.a;
    setResult(ok);
    if (ok) { setCorrect((c) => c + 1); if (ttsLang && it.k === 'b') void speak(it.a, ttsLang as VoiceLang); }
    else { setHearts((h) => h - 1); if (!retried.includes(i)) { setRetried([...retried, i]); setQueue([...queue, it]); } }
  }
  function next(): void { setI(i + 1); setSel(null); setBuilt([]); setResult(null); }

  return (
    <div role="dialog" aria-modal aria-label="Lesson" className="fixed inset-0 z-40 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex w-full max-w-[640px] items-center gap-3 px-4 py-3.5">
        <button className="iconbtn" aria-label="Quit lesson" onClick={onQuit}>✕</button>
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-ln"><i className="block h-full rounded-full bg-ac transition-all" style={{ width: `${finished && hearts > 0 ? 100 : (correct / items.length) * 100}%` }} /></div>
        <span className="pill" aria-label="Hearts">❤️ <b className="text-ac">{hearts}</b></span>
      </div>

      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col gap-4 overflow-auto px-4 py-2.5">
        {finished ? (
          <div className="m-auto text-center">
            <div className="text-7xl">{hearts > 0 ? '🎉' : '💔'}</div>
            <h2 className="font-display text-4xl font-semibold">{hearts > 0 ? 'Lesson complete' : 'Out of hearts'}</h2>
            <p className="mt-2 text-xl text-mu">{hearts > 0 ? `+${xp} XP · ${hearts} hearts left` : 'Practice makes it stick. Try again.'}</p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-3xl font-semibold leading-tight">{it.q}</h2>
            {it.k === 'm' ? opts.map((o, n) => (
              <button key={o} onClick={() => result === null && setSel(n)} aria-pressed={sel === n}
                className="min-h-14 rounded-2xl border-2 border-ln bg-card px-4 py-2.5 text-left text-lg font-medium aria-pressed:border-ac aria-pressed:bg-ac/15">{o}</button>
            )) : (
              <>
                <div className="flex min-h-16 flex-wrap gap-2 border-b-2 border-ln py-2">
                  {built.map((n) => <button key={n} className="min-h-12 rounded-xl border-2 border-ln bg-card px-4 font-medium" onClick={() => result === null && setBuilt(built.filter((x) => x !== n))}>{opts[n]}</button>)}
                </div>
                <div className="flex flex-wrap gap-2">
                  {opts.map((o, n) => <button key={n} disabled={built.includes(n)} onClick={() => result === null && setBuilt([...built, n])} className="min-h-12 rounded-xl border-2 border-ln bg-card px-4 font-medium shadow-[0_3px_0_var(--ln)] disabled:opacity-25">{o}</button>)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div role="status" className={`border-t-2 border-ln px-4 pb-[calc(18px+env(safe-area-inset-bottom))] pt-4 ${result === true ? 'bg-green-900 text-white' : result === false ? 'bg-red-900 text-white' : ''}`}>
        <div className="mx-auto flex max-w-[640px] flex-col gap-2.5">
          {result !== null && it && <><strong className="font-display text-2xl">{result ? 'Correct!' : 'Not quite'}</strong>{!result && <span>Answer: {it.a}</span>}</>}
          {finished ? <button className="btn w-full" onClick={() => (hearts > 0 ? onFinish(xp) : onQuit())}>{hearts > 0 ? 'Continue' : 'Back to path'}</button>
            : result === null ? <button className="btn w-full" disabled={it.k === 'm' ? sel === null : built.length === 0} onClick={check}>Check</button>
            : <button className="btn w-full !bg-white !text-neutral-900" onClick={next}>Continue</button>}
        </div>
      </div>
    </div>
  );
}

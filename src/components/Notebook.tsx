'use client';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useVoice } from '@/lib/useVoice';
import type { Item, VoiceLang } from '@/types';

type Mode = 'ask' | 'summary' | 'guide' | 'lesson';
interface Msg { role: 'u' | 'a'; text: string }
const LANGS = ['Same as sources', 'English', 'Kiswahili', 'Luganda'] as const;
const VOICE: Record<string, VoiceLang> = { 'Same as sources': 'en', English: 'en', Kiswahili: 'swa', Luganda: 'lug' };

export default function Notebook({ onLesson }: { onLesson: (items: Item[]) => void }) {
  const sources = useLiveQuery(() => db.sources.toArray(), [], []);
  const [log, setLog] = useState<Msg[]>([]);
  const [lang, setLang] = useState<(typeof LANGS)[number]>('Same as sources');
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const { recording, toggleMic, speak } = useVoice();
  const active = sources.filter((s) => s.on);

  async function addFiles(files: FileList | null): Promise<void> {
    if (!files) return;
    for (const f of Array.from(files)) await db.sources.add({ id: crypto.randomUUID(), name: f.name, text: (await f.text()).slice(0, 30000), on: true });
  }
  async function run(mode: Mode, question?: string): Promise<void> {
    if (!active.length || busy) return;
    setBusy(true);
    const label = question ?? (mode === 'summary' ? 'Summarize my sources' : mode === 'guide' ? 'Make a study guide' : 'Make a practice lesson');
    setLog((l) => [...l, { role: 'u', text: label }, { role: 'a', text: '' }]);
    const setLast = (text: string): void => setLog((l) => [...l.slice(0, -1), { role: 'a', text }]);
    try {
      const res = await fetch('/api/notebook', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, question, language: lang, sources: active.map((s) => ({ name: s.name, text: s.text })) }) });
      if (!res.ok) throw new Error('bad status');
      if (mode === 'lesson') { const j = (await res.json()) as { items: Item[] }; setLast('Your practice lesson is ready.'); onLesson(j.items); }
      else if (res.body) {
        const reader = res.body.getReader(), dec = new TextDecoder(); let text = '';
        for (;;) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); setLast(text); }
        if (!text) throw new Error('empty');
      }
    } catch { setLast('I could not reach the AI. Check your connection and keys, then try again.'); }
    setBusy(false);
  }

  return (
    <section>
      <h1 className="mt-4 font-display text-4xl font-bold">Your notebook</h1>
      <p className="mb-4 text-mu">Add notes or a text file. Ask in English, Kiswahili or Luganda. Answers come only from your sources.</p>
      <div className="flex flex-col gap-2.5">
        {sources.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-2xl border-2 border-ln bg-card px-3.5 py-2.5">
            <input id={s.id} type="checkbox" className="h-6 w-6 accent-[#FFC400]" checked={s.on} onChange={() => db.sources.update(s.id, { on: !s.on })} />
            <label htmlFor={s.id} className="flex-1 truncate">{i + 1}. {s.name}</label>
            <button className="iconbtn !h-10 !w-10" aria-label={`Remove ${s.name}`} onClick={() => db.sources.delete(s.id)}>✕</button>
          </div>
        ))}
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Paste notes" placeholder="Paste class notes here (any language)" className="w-full rounded-2xl border-2 border-ln bg-card px-3.5 py-3" />
        <div className="flex gap-2.5 overflow-x-auto">
          <button className="btn-ghost" onClick={async () => { if (note.trim()) { await db.sources.add({ id: crypto.randomUUID(), name: `Pasted notes ${sources.length + 1}`, text: note.slice(0, 30000), on: true }); setNote(''); } }}>Add notes</button>
          <label className="btn-ghost grid cursor-pointer place-items-center whitespace-nowrap">Upload .txt file<input type="file" multiple hidden accept=".txt,.md,.csv,.json,text/*" onChange={(e) => void addFiles(e.target.files)} /></label>
        </div>
      </div>
      <div role="group" aria-label="Answer language" className="flex gap-2.5 overflow-x-auto py-3">{LANGS.map((l) => <button key={l} className="chip" aria-pressed={lang === l} onClick={() => setLang(l)}>{l}</button>)}</div>
      <div className="flex gap-2.5 overflow-x-auto pb-2">
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('summary')}>Summarize</button>
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('guide')}>Study guide</button>
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('lesson')}>Make a practice lesson</button>
      </div>
      <div className="my-4 flex flex-col gap-3" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-[20px] px-4 py-3.5 ${m.role === 'u' ? 'self-end bg-ac font-medium text-ink' : 'self-start border-2 border-ln bg-card'}`}>
            {m.text || '…'}
            {m.role === 'a' && m.text && <div><button className="chip mt-2 !min-h-11" onClick={() => void speak(m.text, VOICE[lang])}>🔊 Listen</button></div>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <button aria-label="Speak your question" onClick={() => void toggleMic(VOICE[lang], setQ)}
          className={`grid h-14 w-14 flex-none place-items-center rounded-full bg-ac text-ink ${recording ? 'animate-[pulse-ring_1s_infinite]' : ''}`}>🎤</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask your notebook" placeholder="Ask about your sources" className="min-h-[52px] w-full rounded-2xl border-2 border-ln bg-card px-3.5" />
        <button className="btn" disabled={!q.trim() || !active.length || busy} onClick={() => { void run('ask', q.trim()); setQ(''); }}>Ask</button>
      </div>
      {!sources.length && <p className="mt-3 text-mu">Add at least one source to begin.</p>}
    </section>
  );
}

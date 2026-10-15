'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useVoice } from '@/lib/useVoice';
import { hasSunbirdTts, isSunbirdLanguage, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import type { Item, Source, VoiceLang } from '@/types';

type Mode = 'ask' | 'summary' | 'guide' | 'lesson';
interface Msg { role: 'u' | 'a'; text: string }

export default function Notebook({ onLesson }: { onLesson: (items: Item[]) => void }) {
  const { user } = useUser();
  const userId = user?.id ?? '';
  const sources = useLiveQuery<Source[], Source[]>(
    () => userId ? db.sources.where('userId').equals(userId).toArray() : Promise.resolve([] as Source[]),
    [userId],
    [] as Source[],
  );
  const [syncError, setSyncError] = useState('');
  const [log, setLog] = useState<Msg[]>([]);
  const [lang, setLang] = useState<VoiceLang>('eng');
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const { recording, toggleMic, speak } = useVoice();
  const sourceList = sources ?? [];
  const active = sourceList.filter((s) => s.on);

  useEffect(() => {
    let cancelled = false;
    if (!userId) return () => { cancelled = true; };

    void (async () => {
      try {
        const response = await fetch('/api/account?resource=sources');
        if (!response.ok) throw new Error('Could not load notebook sources from MongoDB.');
        const result = await response.json() as { sources: Source[] };
        if (cancelled) return;

        const localSources = await db.sources.where('userId').equals(userId).toArray();
        const remoteIds = new Set(result.sources.map((source) => source.id));
        const localOnly = localSources.filter((source) => !remoteIds.has(source.id));
        await db.sources.where('userId').equals(userId).delete();
        await db.sources.bulkPut([...result.sources, ...localOnly]);
        for (const source of localOnly) {
          const saveResponse = await fetch('/api/account', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'source', source }),
          });
          if (!saveResponse.ok) throw new Error('Could not sync a saved notebook source.');
        }
        if (!cancelled) setSyncError('');
      } catch (error) {
        if (!cancelled) setSyncError(error instanceof Error ? error.message : 'Notebook sync failed.');
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  async function saveSource(source: Source) {
    const response = await fetch('/api/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'source', source }),
    });
    if (!response.ok) throw new Error('Could not save the notebook source to MongoDB.');
    setSyncError('');
  }

  async function removeSource(id: string) {
    await db.sources.delete(id);
    try {
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'source', action: 'delete', id }),
      });
      if (!response.ok) throw new Error('Could not delete the notebook source from MongoDB.');
      setSyncError('');
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not sync the deleted source.');
    }
  }

  async function addSource(name: string, text: string) {
    if (!userId) return;
    const source: Source = { id: crypto.randomUUID(), userId, name, text: text.slice(0, 30000), on: true };
    await db.sources.add(source);
    try {
      await saveSource(source);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not sync the notebook source.');
    }
  }

  async function addFiles(files: FileList | null): Promise<void> {
    if (!files) return;
    for (const file of Array.from(files)) await addSource(file.name, await file.text());
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
      if (!res.ok) {
        let message = 'The tutor could not complete this request.';
        const detail = await res.text();
        try {
          const result = JSON.parse(detail) as { error?: unknown };
          if (typeof result.error === 'string') message = result.error;
          else if (detail.trim()) message = detail;
        } catch {
          if (detail.trim()) message = detail;
        }
        throw new Error(message);
      }
      if (mode === 'lesson') { const j = (await res.json()) as { items: Item[] }; setLast('Your practice lesson is ready.'); onLesson(j.items); }
      else if (res.body) {
        const reader = res.body.getReader(), dec = new TextDecoder(); let text = '';
        for (;;) { const { done, value } = await reader.read(); if (done) break; text += dec.decode(value, { stream: true }); setLast(text); }
        if (!text) throw new Error('empty');
      }
    } catch (error) {
      setLast(error instanceof Error ? error.message : 'The tutor could not complete this request.');
    }
    setBusy(false);
  }

  return (
    <section>
      <h1 className="mt-4 font-display text-4xl font-bold">Your notebook</h1>
      <p className="mb-4 text-mu">Add notes or a text file. Choose a supported speech language; tutor replies are translated with Sunbird and use only your sources.</p>
      {syncError ? <p role="status" className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">{syncError}</p> : null}
      <div className="flex flex-col gap-2.5">
        {sourceList.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2.5 rounded-2xl border-2 border-ln bg-card px-3.5 py-2.5">
            <input id={s.id} type="checkbox" className="h-6 w-6 accent-[#FFC400]" checked={s.on} onChange={(event) => {
              const updated = { ...s, on: event.target.checked };
              void db.sources.update(s.id, { on: updated.on }).then(() => saveSource(updated)).catch((error: unknown) => {
                setSyncError(error instanceof Error ? error.message : 'Could not sync the source update.');
              });
            }} />
            <label htmlFor={s.id} className="flex-1 truncate">{i + 1}. {s.name}</label>
            <button className="iconbtn !h-10 !w-10" aria-label={`Remove ${s.name}`} onClick={() => void removeSource(s.id)}>✕</button>
          </div>
        ))}
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Paste notes" placeholder="Paste class notes here (any language)" className="w-full rounded-2xl border-2 border-ln bg-card px-3.5 py-3" />
        <div className="flex gap-2.5 overflow-x-auto">
          <button className="btn-ghost" onClick={async () => { if (note.trim()) { await addSource(`Pasted notes ${sourceList.length + 1}`, note); setNote(''); } }}>Add notes</button>
          <label className="btn-ghost grid cursor-pointer place-items-center whitespace-nowrap">Upload .txt file<input type="file" multiple hidden accept=".txt,.md,.csv,.json,text/*" onChange={(e) => void addFiles(e.target.files)} /></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 py-3">
        <label htmlFor="notebook-language" className="font-semibold">Speech and reply language</label>
        <select
          id="notebook-language"
          value={lang}
          onChange={(event) => {
            if (isSunbirdLanguage(event.target.value)) setLang(event.target.value);
          }}
          className="min-h-11 max-w-full rounded-xl border-2 border-ln bg-card px-3"
        >
          {SUNBIRD_LANGUAGES.map(({ code, name }) => <option key={code} value={code}>{name}</option>)}
        </select>
        {!hasSunbirdTts(lang) ? <span className="text-sm text-mu">Replies will be translated text; Sunbird voice playback is not available for this language yet.</span> : null}
      </div>
      <p className="mb-3 text-sm text-mu">French, Ikposo, and Thur are currently supported for speech recognition but not Sunbird translation, so they are not available as reply languages.</p>
      <div className="flex gap-2.5 overflow-x-auto pb-2">
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('summary')}>Summarize</button>
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('guide')}>Study guide</button>
        <button className="chip" disabled={!active.length || busy} onClick={() => void run('lesson')}>Make a practice lesson</button>
      </div>
      <div className="my-4 flex flex-col gap-3" aria-live="polite">
        {log.map((m, i) => (
          <div key={i} className={`max-w-[92%] whitespace-pre-wrap rounded-[20px] px-4 py-3.5 ${m.role === 'u' ? 'self-end bg-ac font-medium text-ink' : 'self-start border-2 border-ln bg-card'}`}>
            {m.text || '…'}
            {m.role === 'a' && m.text && hasSunbirdTts(lang) && <div><button className="chip mt-2 !min-h-11" onClick={() => void speak(m.text, lang)}>🔊 Listen</button></div>}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <button aria-label={recording ? 'Stop recording' : 'Speak your question'} aria-pressed={recording} onClick={() => { setVoiceError(''); void toggleMic(lang, setQ, setVoiceError); }}
          className={`grid h-14 w-14 flex-none place-items-center rounded-full bg-ac text-ink ${recording ? 'animate-[pulse-ring_1s_infinite]' : ''}`}>🎤</button>
        <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="Ask your notebook" placeholder="Ask about your sources" className="min-h-[52px] w-full rounded-2xl border-2 border-ln bg-card px-3.5" />
        <button className="btn" disabled={!q.trim() || !active.length || busy} onClick={() => { void run('ask', q.trim()); setQ(''); }}>Ask</button>
      </div>
      {voiceError ? <p role="alert" className="mt-2 text-sm text-red-700">{voiceError}</p> : null}
      {!sourceList.length && <p className="mt-3 text-mu">Add at least one source to begin.</p>}
    </section>
  );
}

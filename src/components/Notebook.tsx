'use client';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { HelpCircle, BookOpen, FileText, GraduationCap, Languages } from 'lucide-react';
import { db } from '@/lib/db';
import { useVoice } from '@/lib/useVoice';
import { useApp } from '@/store/useApp';
import { hasSunbirdTts, isSunbirdLanguage, SUNBIRD_LANGUAGES } from '@/lib/sunbird-languages';
import VoiceStateOrb from '@/components/VoiceStateOrb';
import AudioWaveformVisualizer from '@/components/AudioWaveformVisualizer';
import QuickPromptChips, { type QuickPrompt } from '@/components/QuickPromptChips';
import { triggerFeedback } from '@/lib/feedback';
import type { Item, Source, VoiceLang } from '@/types';

type Mode = 'ask' | 'summary' | 'guide' | 'lesson';
interface Msg { role: 'u' | 'a'; text: string; lang?: string }

export default function Notebook({ onLesson }: { onLesson: (items: Item[]) => void }) {
  const { user } = useUser();
  const userId = user?.id ?? '';
  const globalDialect = useApp((state) => state.activeDialect || 'lug');
  const setGlobalDialect = useApp((state) => state.setActiveDialect);
  const sources = useLiveQuery<Source[], Source[]>(
    () => userId ? db.sources.where('userId').equals(userId).toArray() : Promise.resolve([] as Source[]),
    [userId],
    [] as Source[],
  );
  const [syncError, setSyncError] = useState('');
  const [log, setLog] = useState<Msg[]>([]);
  const [lang, setLang] = useState<VoiceLang>(globalDialect);
  const [q, setQ] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [showQuickPrompts, setShowQuickPrompts] = useState(false);
  const { recording, processing, speaking, analyser, toggleMic, speak } = useVoice();
  const sourceList = sources ?? [];
  const active = sourceList.filter((s) => s.on);

  // Sync with global dialect switcher
  useEffect(() => {
    if (globalDialect && isSunbirdLanguage(globalDialect)) {
      setLang(globalDialect);
    }
  }, [globalDialect]);

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
    triggerFeedback('chip');
    setShowQuickPrompts(false);

    const label = question ?? (mode === 'summary' ? 'Summarize my sources' : mode === 'guide' ? 'Make a study guide' : 'Make a practice lesson');
    setLog((l) => [...l, { role: 'u', text: label }, { role: 'a', text: '' }]);
    const setLast = (text: string): void => setLog((l) => [...l.slice(0, -1), { role: 'a', text }]);
    try {
      const res = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, question, language: lang, sources: active.map((s) => ({ name: s.name, text: s.text })) }),
      });
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
      if (mode === 'lesson') {
        const j = (await res.json()) as { items: Item[] };
        setLast('Your practice lesson is ready.');
        triggerFeedback('success');
        onLesson(j.items);
      } else if (res.body) {
        const reader = res.body.getReader(), dec = new TextDecoder();
        let text = '';
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          text += dec.decode(value, { stream: true });
          setLast(text);
        }
        if (!text) throw new Error('empty');
        triggerFeedback('success');
        setShowQuickPrompts(true);
      }
    } catch (error) {
      setLast(error instanceof Error ? error.message : 'The tutor could not complete this request.');
    }
    setBusy(false);
  }

  const activeLangName = SUNBIRD_LANGUAGES.find((l) => l.code === lang)?.name || 'local dialect';

  // Contextual quick prompts generated after an answer or summary
  const contextualPrompts = useMemo<QuickPrompt[]>(() => {
    return [
      {
        id: 'quiz',
        label: '3 Practice Questions',
        sublabel: 'Quiz',
        icon: <HelpCircle className="h-3.5 w-3.5" />,
        action: () => void run('ask', 'Generate 3 quick quiz questions based on our discussion to test my understanding.'),
      },
      {
        id: 'simplify',
        label: 'Explain simply for P.5',
        sublabel: 'Simplify',
        icon: <GraduationCap className="h-3.5 w-3.5" />,
        action: () => void run('ask', 'Please explain this concept simply with a practical Ugandan real-life example suitable for a Primary 5 pupil.'),
      },
      {
        id: 'key-points',
        label: 'Summarize key points',
        sublabel: 'Bullet notes',
        icon: <FileText className="h-3.5 w-3.5" />,
        action: () => void run('ask', 'Give me 3 brief bullet points summarizing the most important takeaways.'),
      },
      {
        id: 'lesson-prompt',
        label: 'Generate practice lesson',
        sublabel: 'Interactive',
        icon: <BookOpen className="h-3.5 w-3.5" />,
        action: () => void run('lesson'),
      },
      {
        id: 'lang-prompt',
        label: `Explain in ${activeLangName}`,
        sublabel: 'Dialect',
        icon: <Languages className="h-3.5 w-3.5" />,
        action: () => void run('ask', `Please translate the key concept above into ${activeLangName} so I can understand it in my mother tongue.`),
      },
    ];
  }, [activeLangName, lang, active.length, busy]);

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
          <button className="btn-ghost" onClick={async () => { if (note.trim()) { await addSource(`Pasted notes ${sourceList.length + 1}`, note); setNote(''); triggerFeedback('chip'); } }}>Add notes</button>
          <label className="btn-ghost grid cursor-pointer place-items-center whitespace-nowrap">Upload .txt file<input type="file" multiple hidden accept=".txt,.md,.csv,.json,text/*" onChange={(e) => void addFiles(e.target.files)} /></label>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 py-3">
        <label htmlFor="notebook-language" className="font-semibold">Speech and reply language</label>
        <select
          id="notebook-language"
          value={lang}
          onChange={(event) => {
            if (isSunbirdLanguage(event.target.value)) {
              setLang(event.target.value);
              setGlobalDialect(event.target.value);
              triggerFeedback('chip');
            }
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
      
      {/* Kinetic Staggered Entry for Transcripts & Translations */}
      <div className="my-4 flex flex-col gap-3" aria-live="polite">
        {log.map((m, i) => (
          <div
            key={i}
            className={`animate-kinetic-entry stagger-${Math.min((i % 5) + 1, 5)} max-w-[92%] whitespace-pre-wrap rounded-[20px] px-4 py-3.5 shadow-sm transition-shadow ${
              m.role === 'u'
                ? 'self-end bg-ac font-medium text-ink shadow-[0_2px_12px_rgba(255,196,0,0.25)]'
                : 'self-start border-2 border-ln bg-card shadow-[0_2px_12px_rgba(0,23,49,0.04)]'
            }`}
          >
            {m.role === 'u' && (
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-bold opacity-75">
                <span>👤 Learner</span>
                <span className="text-[10px]">·</span>
                <span className="uppercase tracking-wider">{lang}</span>
              </div>
            )}
            {m.text || (
              <span className="inline-flex items-center gap-1.5 text-mu">
                <span className="h-1.5 w-1.5 rounded-full bg-sun animate-ping" />
                <span>Thinking & translating…</span>
              </span>
            )}
            {m.role === 'a' && m.text && hasSunbirdTts(lang) && (
              <div className="mt-2.5 flex items-center gap-2 border-t border-ln/60 pt-2">
                <button
                  type="button"
                  className="chip !min-h-9 transition-transform hover:scale-105 active:scale-95"
                  onClick={() => void speak(m.text, lang)}
                  aria-label="Listen to explanation in native dialect"
                >
                  🔊 Listen in {SUNBIRD_LANGUAGES.find((l) => l.code === lang)?.name || lang}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Contextual Quick-Prompt Chips (Ephemeral suggestions) */}
      {showQuickPrompts && active.length > 0 && !busy && (
        <div className="my-2">
          <QuickPromptChips
            prompts={contextualPrompts}
            title="Suggested follow-ups"
            onDismiss={() => setShowQuickPrompts(false)}
          />
        </div>
      )}

      {/* Voice State Indicator, Live Audio Waveform & Question Input with Micro-Spring Physics */}
      <div className="flex flex-col gap-2">
        {/* Live Audio Visualizer banner while recording */}
        {recording && (
          <div className="animate-kinetic-entry flex items-center justify-between rounded-2xl border border-red-300 bg-red-50/90 px-4 py-2 text-xs font-semibold text-red-600 shadow-sm dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-300">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>Listening live in {activeLangName}… Speak clearly</span>
            </div>
            <AudioWaveformVisualizer
              analyser={analyser}
              isRecording={recording}
              mode="bars"
              barCount={9}
              color="gradient"
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <VoiceStateOrb
            isRecording={recording}
            isProcessing={processing}
            isSpeaking={speaking}
            analyser={analyser}
            onClick={() => {
              setVoiceError('');
              void toggleMic(lang, setQ, setVoiceError);
            }}
            size="md"
            activeDialectName={SUNBIRD_LANGUAGES.find((l) => l.code === lang)?.name}
            label="Voice question"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && q.trim() && active.length && !busy) {
                void run('ask', q.trim());
                setQ('');
              }
            }}
            aria-label="Ask your notebook"
            placeholder={`Ask about your sources (in ${SUNBIRD_LANGUAGES.find((l) => l.code === lang)?.name || 'any language'})…`}
            className="min-h-[52px] w-full rounded-2xl border-2 border-ln bg-card px-4 text-sm font-medium transition focus:border-sun focus:outline-none"
          />
          <button
            className="btn shrink-0"
            disabled={!q.trim() || !active.length || busy}
            onClick={() => {
              void run('ask', q.trim());
              setQ('');
            }}
          >
            Ask
          </button>
        </div>
      </div>

      {voiceError ? <p role="alert" className="mt-2 text-sm text-red-700">{voiceError}</p> : null}
      {!sourceList.length && <p className="mt-3 text-mu">Add at least one source to begin.</p>}
    </section>
  );
}

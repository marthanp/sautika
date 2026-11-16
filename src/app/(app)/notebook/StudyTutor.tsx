'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  BookOpenCheck,
  Brain,
  Check,
  HelpCircle,
  ListChecks,
  Loader2,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Note } from '@/data/catalog';
import { hasSunbirdTts, SUNBIRD_LANGUAGES, type VoiceLang } from '@/lib/sunbird-languages';
import { useApp } from '@/store/useApp';

const MAX_SOURCES = 8;
const MAX_QUESTION_CHARS = 1000;

type Mode = 'summary' | 'guide' | 'lesson' | 'ask';

const ACTIONS: { mode: Mode; label: string; hint: string; icon: LucideIcon }[] = [
  { mode: 'summary', label: 'Summarise', hint: 'The main points in a few bullets', icon: ListChecks },
  { mode: 'guide', label: 'Study guide', hint: 'Key ideas, terms and practice', icon: BookOpenCheck },
  { mode: 'lesson', label: 'Quiz me', hint: '5 questions from your notes', icon: Brain },
  { mode: 'ask', label: 'Ask a question', hint: 'Answered from your notes only', icon: HelpCircle },
];

interface QuizItem {
  q: string;
  a: string;
  d: [string, string];
  e?: string;
}

type Result =
  | { kind: 'text'; mode: Mode; answer: string; provider: string }
  | { kind: 'quiz'; items: QuizItem[]; provider: string };

function languageName(code: VoiceLang): string {
  return SUNBIRD_LANGUAGES.find((language) => language.code === code)?.name ?? 'English';
}

function stripCitations(text: string): string {
  return text.replace(/\[\d{1,2}\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
}

/** Renders a `[2]` marker as a small highlighted superscript so citations stay readable. */
function withCitations(text: string): ReactNode[] {
  return text.split(/(\[\d{1,2}\])/g).map((part, index) => {
    if (/^\[\d{1,2}\]$/.test(part)) {
      return (
        <sup
          key={index}
          className="mx-0.5 rounded bg-sun/30 px-1 py-[1px] text-[10px] font-bold text-navy"
          title="From the note with this number"
        >
          {part.slice(1, -1)}
        </sup>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function hashSeed(text: string): number {
  let hash = 7;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) & 0x7fffffff;
  }
  return hash || 1;
}

/** The same question always produces the same option order, so answers never jump on re-render. */
function seededShuffle<T>(values: T[], seed: number): T[] {
  const out = [...values];
  let state = seed;
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const swap = state % (index + 1);
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

export default function StudyTutor({
  notes,
  onSaveAsNote,
}: {
  notes: Note[];
  onSaveAsNote: (note: { title: string; text: string }) => void;
}) {
  const dialect = useApp((state) => state.dialect);
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>('summary');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  // Bumped per request, so a fresh quiz remounts the player with clean state.
  const [runId, setRunId] = useState(0);

  const available = useMemo(() => notes.filter((note) => note.text.trim().length > 0), [notes]);

  // Derived, so a deleted note drops out of the selection without an extra render pass.
  const chosen = useMemo(() => {
    const ids = new Set(available.map((note) => String(note.id)));
    return selected.filter((id) => ids.has(id));
  }, [selected, available]);

  const toggle = (id: string): void => {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (chosen.length >= MAX_SOURCES) return current;
      return [...current, id];
    });
  };

  const sources = useMemo(
    () =>
      chosen
        .map((id) => available.find((note) => String(note.id) === id))
        .filter((note): note is Note => Boolean(note))
        .map((note) => ({ name: note.title, text: note.text })),
    [chosen, available],
  );

  const ready = sources.length > 0 && (mode !== 'ask' || question.trim().length > 0);

  const run = useCallback(async (): Promise<void> => {
    if (!sources.length) return;
    if (mode === 'ask' && !question.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setRunId((value) => value + 1);
    try {
      const response = await fetch('/api/notebook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sources,
          language: dialect,
          question: mode === 'ask' ? question.trim().slice(0, MAX_QUESTION_CHARS) : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { answer?: string; items?: QuizItem[]; provider?: string; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? 'The tutor could not answer right now.');
      }
      if (mode === 'lesson') {
        const items = Array.isArray(data?.items) ? data.items : [];
        if (!items.length) throw new Error('The tutor could not build a quiz from these notes.');
        setResult({ kind: 'quiz', items, provider: data?.provider ?? 'ai' });
      } else {
        const answer = typeof data?.answer === 'string' ? data.answer.trim() : '';
        if (!answer) throw new Error('The tutor came back empty. Please try again.');
        setResult({ kind: 'text', mode, answer, provider: data?.provider ?? 'ai' });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The tutor could not answer right now.');
    } finally {
      setLoading(false);
    }
  }, [sources, mode, question, dialect]);

  const buttonLabel = loading
    ? 'Thinking…'
    : !sources.length
      ? 'Choose a note to start'
      : 'Ask the tutor';

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-navy via-navy-2 to-navy px-5 py-4 text-white">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/10">
          <Sparkles className="h-5 w-5 text-sun" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[18px] font-extrabold leading-tight">AI Study Tutor</h2>
          <p className="text-[13px] text-white/75">
            Answers use only your notes, in {languageName(dialect)}
          </p>
        </div>
      </header>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-slate-500">
            1. Pick your notes{' '}
            <span className="font-semibold normal-case tracking-normal text-slate-400">
              ({chosen.length}/{MAX_SOURCES})
            </span>
          </h3>
          {available.length === 0 ? (
            <p className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
              Add a note with some text and the tutor can study it with you.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {available.map((note) => {
                const id = String(note.id);
                const on = chosen.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && chosen.length >= MAX_SOURCES}
                    onClick={() => toggle(id)}
                    className="flex min-h-[44px] max-w-full items-center gap-2 rounded-full border border-line bg-white px-4 text-[13.5px] font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy aria-pressed:border-navy aria-pressed:bg-navy aria-pressed:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {on ? <Check className="h-4 w-4 shrink-0 text-sun" aria-hidden /> : null}
                    <span className="truncate">{note.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          <h3 className="mt-6 text-[13px] font-bold uppercase tracking-wide text-slate-500">
            2. Choose what to do
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              const on = mode === action.mode;
              return (
                <button
                  key={action.mode}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMode(action.mode)}
                  className="flex min-h-[44px] items-start gap-3 rounded-2xl border border-line bg-white p-3 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy aria-pressed:border-navy aria-pressed:bg-navy/5"
                >
                  <Icon
                    className={`mt-0.5 h-5 w-5 shrink-0 ${on ? 'text-navy' : 'text-slate-400'}`}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-[14px] font-bold text-navy">{action.label}</span>
                    <span className="block text-[12.5px] leading-snug text-slate-500">{action.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {mode === 'ask' ? (
            <label className="mt-4 block">
              <span className="text-[13px] font-bold uppercase tracking-wide text-slate-500">
                3. Your question
              </span>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value.slice(0, MAX_QUESTION_CHARS))}
                rows={3}
                placeholder="What does photosynthesis need to happen?"
                className="mt-2 w-full rounded-2xl border border-line p-3 text-sm focus:border-navy focus:outline-none"
              />
            </label>
          ) : null}

          <button
            type="button"
            onClick={() => void run()}
            disabled={!ready || loading}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sun text-[15px] font-bold text-navy shadow-sm transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {buttonLabel}
          </button>
        </div>

        <div aria-live="polite" className="min-h-[220px] rounded-2xl bg-mist/60 p-4">
          {loading ? (
            <div className="space-y-3" role="status">
              <span className="sr-only">The tutor is reading your notes.</span>
              {[0, 1, 2, 3].map((line) => (
                <span
                  key={line}
                  className="block h-3 rounded-full bg-slate-300/70 motion-safe:animate-pulse"
                  style={{ width: `${90 - line * 12}%` }}
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
          ) : result?.kind === 'quiz' ? (
            <QuizPlayer key={runId} items={result.items} onNewQuiz={() => void run()} />
          ) : result?.kind === 'text' ? (
            <TextAnswer
              answer={result.answer}
              provider={result.provider}
              language={dialect}
              onSave={() =>
                onSaveAsNote({
                  title: `${ACTIONS.find((action) => action.mode === result.mode)?.label ?? 'Tutor'}: ${
                    sources[0]?.name ?? 'My notes'
                  }`.slice(0, 120),
                  text: result.answer,
                })
              }
            />
          ) : (
            <div className="grid h-full place-items-center text-center">
              <div>
                <Sparkles className="mx-auto h-7 w-7 text-sun" aria-hidden />
                <p className="mt-2 text-[15px] font-bold text-navy">Your tutor is ready</p>
                <p className="mt-1 text-[13.5px] text-slate-500">
                  Pick a note, choose an action, and the answer appears here.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TextAnswer({
  answer,
  provider,
  language,
  onSave,
}: {
  answer: string;
  provider: string;
  language: VoiceLang;
  onSave: () => void;
}) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback((): void => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => stop, [stop]);

  const listen = async (): Promise<void> => {
    if (speaking) {
      stop();
      return;
    }
    const spoken = stripCitations(answer).slice(0, 600);
    if (!spoken) return;
    setSpeaking(true);
    try {
      if (hasSunbirdTts(language)) {
        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: spoken, language }),
        });
        if (response.ok) {
          const data = (await response.json()) as { audioUrl?: string };
          if (data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audioRef.current = audio;
            audio.onended = () => setSpeaking(false);
            audio.onerror = () => setSpeaking(false);
            await audio.play();
            return;
          }
        }
      }
    } catch {
      // Fall through to the browser voice.
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(spoken);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setSpeaking(false);
    }
  };

  return (
    <div>
      <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-slate-700">
        {withCitations(answer)}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
        <button
          type="button"
          onClick={() => void listen()}
          aria-pressed={speaking}
          className="flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 aria-pressed:bg-sun aria-pressed:text-navy"
        >
          <Volume2 className="h-4 w-4" aria-hidden /> {speaking ? 'Stop' : 'Listen'}
        </button>
        <button
          type="button"
          onClick={onSave}
          className="flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-4 text-[13px] font-semibold text-white hover:bg-navy-2"
        >
          <NotebookPen className="h-4 w-4" aria-hidden /> Review and save as note
        </button>
        <span className="ml-auto text-[11.5px] uppercase tracking-wide text-slate-400">{provider}</span>
      </div>
    </div>
  );
}

function QuizPlayer({ items, onNewQuiz }: { items: QuizItem[]; onNewQuiz: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const current = items[Math.min(index, items.length - 1)];
  // Every hook runs before the early return below, so the hook order stays stable.
  const options = useMemo(() => seededShuffle([current.a, ...current.d], hashSeed(current.q)), [current]);

  const choose = (option: string): void => {
    if (picked) return;
    setPicked(option);
    if (option === current.a) setScore((value) => value + 1);
  };

  const next = (): void => {
    if (index + 1 >= items.length) {
      setDone(true);
      return;
    }
    setIndex((value) => value + 1);
    setPicked(null);
  };

  if (done) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[32px] font-extrabold text-navy">
            {score}/{items.length}
          </p>
          <p className="mt-1 text-[14px] text-slate-600">
            {score === items.length
              ? 'Every answer right. Well done!'
              : score * 2 >= items.length
                ? 'Good work. Read the notes once more and try again.'
                : 'Keep going — read your notes again and have another try.'}
          </p>
          <button
            type="button"
            onClick={onNewQuiz}
            className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-navy px-5 text-[13px] font-semibold text-white hover:bg-navy-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> New quiz
          </button>
        </div>
      </div>
    );
  }

  const correct = picked === current.a;

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] font-semibold text-slate-500">
        <span>
          Question {index + 1} of {items.length}
        </span>
        <span>
          Score {score}/{items.length}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={items.length}
        aria-valuenow={index + 1}
        aria-label="Quiz progress"
      >
        <span
          className="block h-full w-full origin-left rounded-full bg-sun transition-transform duration-300"
          style={{ transform: `scaleX(${(index + 1) / items.length})` }}
        />
      </div>

      <p className="mt-4 text-[15.5px] font-bold text-navy">{withCitations(current.q)}</p>

      <div role="radiogroup" aria-label="Answer options" className="mt-3 space-y-2">
        {options.map((option) => {
          const chosen = picked === option;
          const isAnswer = option === current.a;
          let tone = 'border-line bg-white text-slate-700 hover:bg-slate-50';
          if (picked) {
            if (isAnswer) tone = 'border-emerald-400 bg-emerald-50 text-emerald-900';
            else if (chosen) tone = 'border-red-300 bg-red-50 text-red-900';
            else tone = 'border-line bg-white text-slate-400';
          }
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={Boolean(picked)}
              onClick={() => choose(option)}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl border px-4 py-2 text-left text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:cursor-default ${tone}`}
            >
              {picked && isAnswer ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
              {picked && chosen && !isAnswer ? <X className="h-4 w-4 shrink-0" aria-hidden /> : null}
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {picked ? (
        <div className="mt-3">
          <p className={`text-[14px] font-bold ${correct ? 'text-emerald-700' : 'text-red-700'}`}>
            {correct ? 'Correct!' : `The answer is ${current.a}.`}
          </p>
          {current.e ? (
            <p className="mt-1 text-[13.5px] leading-relaxed text-slate-600">{withCitations(current.e)}</p>
          ) : null}
          <button
            type="button"
            onClick={next}
            className="mt-3 h-11 w-full rounded-xl bg-navy text-[14px] font-semibold text-white hover:bg-navy-2"
          >
            {index + 1 >= items.length ? 'See my score' : 'Next question'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

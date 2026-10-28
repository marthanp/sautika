'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Headphones, Pencil, Square, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui';
import type { Item, Lesson } from '@/types';

const TABS = [
  { label: 'Listen & Learn', icon: Headphones },
  { label: 'Practice', icon: Pencil },
  { label: 'Quiz', icon: ClipboardList },
  { label: 'Complete', icon: Check },
] as const;
const BROWSER_VOICE_LANGUAGE: Record<string, string> = { luganda: 'lg-UG', swahili: 'sw-KE' };

interface LessonViewProps {
  courseId: string;
  lesson: Lesson;
  lessonIndex: number;
  isCompleted: boolean;
  isCompleting: boolean;
  onComplete: () => Promise<void>;
}

function optionsFor(item: Item): string[] {
  return item.k === 'm' ? [item.a, ...item.d] : [item.a, ...item.x];
}

export default function LessonView({
  courseId,
  lesson,
  lessonIndex,
  isCompleted,
  isCompleting,
  onComplete,
}: LessonViewProps) {
  const [tab, setTab] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isReading, setIsReading] = useState(false);
  const [activeWord, setActiveWord] = useState<{ question: number; word: number } | null>(null);
  const [speechError, setSpeechError] = useState('');
  const playbackId = useRef(0);
  const boundaryTimers = useRef<number[]>([]);
  const correctAnswers = lesson.items.filter((item, index) => answers[index] === item.a).length;
  const allAnswered = lesson.items.length > 0 && lesson.items.every((_, index) => answers[index] !== undefined);
  const voiceLanguage = BROWSER_VOICE_LANGUAGE[courseId] ?? 'en-GB';
  const nextLabel = TABS[Math.min(TABS.length - 1, tab + 1)].label;

  function stopReading(): void {
    playbackId.current += 1;
    boundaryTimers.current.forEach(window.clearTimeout);
    boundaryTimers.current = [];
    window.speechSynthesis.cancel();
    setIsReading(false);
    setActiveWord(null);
  }

  function readLesson(): void {
    if (!('speechSynthesis' in window)) {
      setSpeechError('Speech playback is not available in this browser.');
      return;
    }
    if (isReading) {
      stopReading();
      return;
    }

    setSpeechError('');
    window.speechSynthesis.cancel();
    const currentPlayback = ++playbackId.current;
    setIsReading(true);
    setActiveWord(null);

    const utterances = lesson.items.map((item, questionIndex) => {
      const utterance = new SpeechSynthesisUtterance(item.q);
      utterance.lang = voiceLanguage;
      utterance.rate = 0.9;
      utterance.onstart = () => {
        if (currentPlayback !== playbackId.current) return;
        const words = [...item.q.matchAll(/\S+/g)];
        let elapsed = 0;
        words.forEach(([word], wordIndex) => {
          if (wordIndex > 0) elapsed += 90;
          const delay = elapsed;
          boundaryTimers.current.push(window.setTimeout(() => {
            if (currentPlayback !== playbackId.current) return;
            setActiveWord({ question: questionIndex, word: wordIndex });
          }, delay));
          elapsed += Math.max(220, word.replace(/[.,!?;:]+$/, '').length * 75);
          if (/[.!?]$/.test(word)) elapsed += 180;
        });
      };
      utterance.onboundary = (event) => {
        if (currentPlayback !== playbackId.current) return;
        const words = [...item.q.matchAll(/\S+/g)];
        const wordIndex = words.findIndex(([word], index) => {
          const start = words[index].index ?? 0;
          return event.charIndex >= start && event.charIndex < start + word.length;
        });
        if (wordIndex >= 0) {
          boundaryTimers.current.forEach(window.clearTimeout);
          boundaryTimers.current = [];
          setActiveWord({ question: questionIndex, word: wordIndex });
        }
      };
      utterance.onerror = () => {
        if (currentPlayback !== playbackId.current) return;
        boundaryTimers.current.forEach(window.clearTimeout);
        boundaryTimers.current = [];
        setIsReading(false);
        setActiveWord(null);
        setSpeechError('Could not play this lesson. Please try again.');
      };
      utterance.onend = () => {
        boundaryTimers.current.forEach(window.clearTimeout);
        boundaryTimers.current = [];
      };
      return utterance;
    });

    const lastUtterance = utterances.at(-1);
    if (!lastUtterance) {
      setIsReading(false);
      return;
    }
    lastUtterance.onend = () => {
      if (currentPlayback !== playbackId.current) return;
      boundaryTimers.current.forEach(window.clearTimeout);
      boundaryTimers.current = [];
      setIsReading(false);
      setActiveWord(null);
    };
    utterances.forEach((utterance) => window.speechSynthesis.speak(utterance));
  }

  useEffect(() => () => {
    playbackId.current += 1;
    boundaryTimers.current.forEach(window.clearTimeout);
    window.speechSynthesis.cancel();
  }, []);

  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div role="tablist" aria-label="Lesson steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {TABS.map(({ label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === index}
            onClick={() => {
              if (index !== 0 && isReading) stopReading();
              setTab(index);
            }}
            className="flex min-h-[46px] min-w-0 items-center justify-center gap-1.5 rounded-xl bg-[#EDF3FD] px-2 text-xs font-bold text-blue-700 aria-selected:border aria-selected:border-sun aria-selected:bg-[#FFF1C7] aria-selected:text-navy transition sm:gap-2 sm:px-3 sm:text-[13.5px]"
          >
            <span className="shrink-0 text-[11px] opacity-60">{index + 1}</span><Icon className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
          </button>
        ))}
      </div>

      {tab === 0 ? (
        <section className="mt-5 rounded-2xl border border-line bg-[#F8FAFD] p-5">
          <h3 className="flex items-center gap-3 text-[20px] font-extrabold"><Volume2 className="h-6 w-6" />{lesson.title}</h3>
          <p className="mt-2 text-sm text-slate-600">Listen to the lesson prompts, then use Practice and Quiz to check what you learned.</p>
          <button
            type="button"
            onClick={readLesson}
            aria-pressed={isReading}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-sun px-5 text-sm font-bold"
          >
            {isReading ? <Square className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
            {isReading ? 'Stop lesson' : 'Listen to lesson'}
          </button>
          {speechError ? <p role="alert" className="mt-2 text-sm text-red-700">{speechError}</p> : null}
          {isReading && activeWord ? (
            <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-navy">
              Now reading prompt {activeWord.question + 1} of {lesson.items.length}
            </p>
          ) : null}
          <ol className="mt-5 space-y-3">
            {lesson.items.map((item, index) => {
              let wordNumber = 0;
              const tokens = Array.from(item.q.matchAll(/\S+|\s+/g));
              const isActiveQuestion = isReading && activeWord?.question === index;
              return (
                <li
                  key={`${lessonIndex}-${index}`}
                  aria-current={isActiveQuestion ? 'true' : undefined}
                  className={`rounded-xl border p-4 text-[15px] font-medium shadow-sm transition-colors ${
                    isActiveQuestion ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300' : 'border-transparent bg-white'
                  }`}
                >
                <span className="mr-2 text-slate-400">{index + 1}.</span>
                {tokens.map((match, tokenIndex) => {
                  const isWord = /^\S+$/.test(match[0]);
                  const currentWord = isWord ? wordNumber++ : -1;
                  const isActive = isWord && activeWord?.question === index && activeWord.word === currentWord;
                  return (
                    <span
                      key={`${index}-${tokenIndex}`}
                      aria-current={isActive ? 'true' : undefined}
                      className={isActive ? 'rounded bg-amber-300 px-0.5 text-navy shadow-[0_0_0_2px_rgba(252,211,77,0.35)]' : undefined}
                    >
                      {match[0]}
                    </span>
                  );
                })}
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {tab === 1 ? (
        <section className="mt-5 rounded-2xl border border-line bg-[#F8FAFD] p-5">
          <h3 className="text-[20px] font-extrabold">Review the key ideas</h3>
          <ul className="mt-4 space-y-3">
            {lesson.items.map((item, index) => (
              <li key={`${lessonIndex}-${index}`} className="rounded-xl bg-white p-4">
                <p className="text-[14px] text-slate-600">{item.q}</p>
                <p className="mt-1 font-bold text-navy">{item.a}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tab === 2 ? (
        <section className="mt-5 space-y-4">
          <h3 className="text-[20px] font-extrabold">Choose the best answer</h3>
          {lesson.items.map((item, index) => (
            <fieldset key={`${lessonIndex}-${index}`} className="rounded-2xl border border-line bg-[#F8FAFD] p-4">
              <legend className="break-words px-1 text-sm sm:text-[15px] font-semibold text-navy">{index + 1}. {item.q}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {optionsFor(item).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={answers[index] === option}
                    onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                    className="min-h-11 min-w-0 break-words rounded-xl border border-line bg-white p-3 text-left text-xs sm:text-sm aria-pressed:border-sun aria-pressed:bg-[#FFF3D0]"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
          <p className="text-sm text-slate-600">{allAnswered ? `${correctAnswers} of ${lesson.items.length} correct.` : 'Answer every question to finish the quiz.'}</p>
        </section>
      ) : null}

      {tab === 3 ? (
        <section className="mt-5 rounded-2xl bg-[#E9F8EF] p-6 text-center">
          <Check className="mx-auto h-10 w-10 text-emerald-700" />
          <h3 className="mt-2 text-2xl font-extrabold">{isCompleted ? 'Lesson already completed' : 'Lesson complete?'}</h3>
          <p className="mt-2 text-slate-600">
            {allAnswered ? `Quiz score: ${correctAnswers} of ${lesson.items.length}.` : 'Complete the quiz to save this lesson.'}
            {isCompleted ? ' Your progress and rewards are saved.' : ' Completing it earns 10 coins and 10 XP.'}
          </p>
          <button
            type="button"
            disabled={!allAnswered || isCompleted || isCompleting}
            onClick={() => void onComplete()}
            className="mt-5 min-h-12 rounded-full bg-navy px-6 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCompleting ? 'Saving progress…' : isCompleted ? 'Completed' : 'Save and Complete Lesson'}
          </button>
        </section>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={() => setTab((current) => Math.max(0, current - 1))} disabled={tab === 0} className="flex h-12 items-center justify-center gap-3 rounded-full bg-[#EDF3FD] px-6 text-[15px] font-bold text-blue-700 disabled:opacity-50 sm:px-7"><ArrowLeft className="h-5 w-5" />Previous</button>
        <button type="button" onClick={() => setTab((current) => Math.min(TABS.length - 1, current + 1))} disabled={tab === TABS.length - 1 || (tab === 2 && !allAnswered)} className="flex h-12 items-center justify-center gap-3 rounded-full bg-sun px-6 text-[15px] font-bold disabled:opacity-50 sm:px-7">Next: {nextLabel}<ArrowRight className="h-5 w-5" /></button>
      </div>
    </Card>
  );
}

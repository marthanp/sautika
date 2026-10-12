'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ClipboardList, Headphones, Pencil, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui';
import { useVoice } from '@/lib/useVoice';
import type { Item, Lesson, VoiceLang } from '@/types';

const TABS = [
  { label: 'Listen & Learn', icon: Headphones },
  { label: 'Practice', icon: Pencil },
  { label: 'Quiz', icon: ClipboardList },
  { label: 'Complete', icon: Check },
] as const;
const VOICE_LANGUAGE: Record<string, VoiceLang> = { luganda: 'lug', swahili: 'swa' };

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
  const { speak } = useVoice();
  const correctAnswers = lesson.items.filter((item, index) => answers[index] === item.a).length;
  const allAnswered = lesson.items.length > 0 && lesson.items.every((_, index) => answers[index] !== undefined);
  const voiceLanguage = VOICE_LANGUAGE[courseId] ?? 'en';
  const nextLabel = TABS[Math.min(TABS.length - 1, tab + 1)].label;

  return (
    <Card className="mt-6 p-4 sm:p-5">
      <div role="tablist" aria-label="Lesson steps" className="grid gap-3 sm:grid-cols-4">
        {TABS.map(({ label, icon: Icon }, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === index}
            onClick={() => setTab(index)}
            className="flex min-h-[52px] min-w-0 items-center gap-2 rounded-xl bg-[#EDF3FD] px-3 text-[14px] font-bold text-blue-700 aria-selected:border aria-selected:border-sun aria-selected:bg-[#FFF1C7] aria-selected:text-navy sm:gap-3 sm:px-4 sm:text-[16px]"
          >
            <span className="shrink-0 text-[12px] opacity-60">{index + 1}</span><Icon className="h-5 w-5 shrink-0" /><span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 0 ? (
        <section className="mt-5 rounded-2xl border border-line bg-[#F8FAFD] p-5">
          <h3 className="flex items-center gap-3 text-[20px] font-extrabold"><Volume2 className="h-6 w-6" />{lesson.title}</h3>
          <p className="mt-2 text-sm text-slate-600">Listen to the lesson prompts, then use Practice and Quiz to check what you learned.</p>
          <button
            type="button"
            onClick={() => void speak(lesson.items.map((item) => item.q).join('. '), voiceLanguage)}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-sun px-5 text-sm font-bold"
          >
            <Headphones className="h-4 w-4" /> Listen to lesson
          </button>
          <ol className="mt-5 space-y-3">
            {lesson.items.map((item, index) => (
              <li key={`${lessonIndex}-${index}`} className="rounded-xl bg-white p-4 text-[15px] font-medium shadow-sm">
                <span className="mr-2 text-slate-400">{index + 1}.</span>{item.q}
              </li>
            ))}
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
              <legend className="px-1 text-[15px] font-semibold">{index + 1}. {item.q}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {optionsFor(item).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={answers[index] === option}
                    onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}
                    className="min-h-11 rounded-xl border border-line bg-white px-3 text-left text-sm aria-pressed:border-sun aria-pressed:bg-[#FFF3D0]"
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

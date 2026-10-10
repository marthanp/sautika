'use client';
import { getCourse } from '@/data/courses';
import { useApp } from '@/store/useApp';
import type { Session } from '@/types';

const OFFSETS = [0, 48, 80, 48];

export default function Path({ onPlay }: { onPlay: (s: Session) => void }) {
  const { activeCourse, done, setTab } = useApp();
  const c = getCourse(activeCourse);
  if (!c) return (
    <section className="pt-4">
      <h1 className="font-display text-4xl font-bold">No course yet</h1>
      <p className="mb-4 mt-1 text-mu">Choose one to see your learning path.</p>
      <button className="btn" onClick={() => setTab('courses')}>Browse courses</button>
    </section>
  );
  const d = done[c.id] ?? 0;
  return (
    <section>
      <h1 className="mt-3 font-display text-4xl font-bold">{c.emoji} {c.title}</h1>
      <p className="text-mu">{c.level} · {d} of {c.lessons.length} lessons done</p>
      <div className="flex flex-col gap-[18px] py-5">
        {c.lessons.map((l, i) => {
          const state = i < d ? 'done' : i === d ? 'open' : 'lock';
          const cls = state === 'done' ? 'bg-green-600 text-white shadow-[0_7px_0_#0f7a37]' : state === 'open' ? 'bg-ac text-ink shadow-[0_7px_0_#E0AC00]' : 'bg-ln text-mu shadow-[0_7px_0_rgba(0,0,0,.25)]';
          return (
            <div key={l.title} style={{ marginLeft: OFFSETS[i % 4] }} className="pb-7">
              <button disabled={state === 'lock'} aria-label={state === 'lock' ? `Locked: ${l.title}` : l.title}
                onClick={() => onPlay({ title: l.title, items: l.items, courseId: c.id, lessonIndex: i, ttsLang: c.ttsLang })}
                className={`relative grid h-[84px] w-[84px] place-items-center rounded-full font-display text-3xl font-bold disabled:cursor-not-allowed ${cls}`}>
                {state === 'done' ? '✓' : i + 1}
                <small className="absolute left-1/2 top-[92px] -translate-x-1/2 whitespace-nowrap font-sans text-[.8rem] font-medium text-tx">{l.title}</small>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

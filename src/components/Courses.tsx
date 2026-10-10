'use client';
import { useState } from 'react';
import { CATEGORIES, COURSES } from '@/data/courses';
import { useApp } from '@/store/useApp';

export default function Courses() {
  const { enrolled, done, startCourse } = useApp();
  const [cat, setCat] = useState<string>('All');
  return (
    <section>
      <h1 className="mb-1.5 mt-4 font-display text-[clamp(2.4rem,11vw,3.6rem)] font-bold leading-[1.05]">Pick a course.<br />Start speaking.</h1>
      <p className="text-mu">Short lessons. Real words. Earn XP every day.</p>
      <div role="group" aria-label="Category" className="flex gap-2.5 overflow-x-auto py-4">
        {['All', ...CATEGORIES].map((c) => <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}
      </div>
      {CATEGORIES.filter((k) => cat === 'All' || cat === k).map((k) => (
        <div key={k}>
          <h2 className="mb-2 mt-4 font-display text-[1.7rem] font-semibold">{k}</h2>
          <div className="mb-7 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {COURSES.filter((c) => c.cat === k).map((c) => {
              const n = c.lessons.length, d = done[c.id] ?? 0, on = enrolled.includes(c.id);
              return (
                <article key={c.id} className="flex flex-col overflow-hidden rounded-3xl border-2 border-ln bg-card">
                  <div aria-hidden className="grid h-24 place-items-center text-5xl" style={{ background: c.color }}>{c.emoji}</div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="font-display text-[1.4rem] font-semibold leading-tight">{c.title}</h3>
                    <p className="text-mu">{c.level}{n ? ` · ${n} lessons · ${n * 4} min` : ''}</p>
                    {on && n > 0 && <div role="progressbar" aria-valuenow={d} aria-valuemax={n} className="h-2.5 overflow-hidden rounded-full bg-ln"><i className="block h-full rounded-full bg-ac" style={{ width: `${(d / n) * 100}%` }} /></div>}
                    <span className="flex-1" />
                    {n ? <button className="btn" onClick={() => startCourse(c.id)}>{on ? (d >= n ? 'Review' : 'Continue') : 'Start course'}</button> : <button className="btn-ghost" disabled>Coming soon</button>}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

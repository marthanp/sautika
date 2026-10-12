'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { Card, SubjectChip } from '@/components/ui';
import { SUBJECTS } from '@/lib/data';
import { useLearnerAccount } from '@/components/LearnerDataSync';
import { IMAGE_BY_CATEGORY, SUBJECT_BY_CATEGORY } from '@/lib/course-display';

const FILTERS = ['All', 'Science', 'Math', 'Languages', 'Digital Literacy', 'Social Studies'] as const;

export default function CoursesExplorer() {
  const [f, setF] = useState('All');
  const { data } = useLearnerAccount();
  const courses = data?.courses ?? [];
  return (
    <>
      <div role="group" aria-label="Filter courses" className="-mx-1 mt-5 flex gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
        {FILTERS.map((c) => <button key={c} aria-pressed={f === c} onClick={() => setF(c)} className="h-10 shrink-0 whitespace-nowrap rounded-full border border-line bg-white px-5 text-[14px] font-semibold aria-pressed:border-sun aria-pressed:bg-sun sm:px-6">{c}</button>)}
      </div>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courses.filter((course) => f === 'All' || course.cat === f).map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <div className="relative h-[130px]"><Image src={`/images/${IMAGE_BY_CATEGORY[course.cat]}`} alt="" fill sizes="340px" className="object-cover" /><SubjectChip label={course.cat} color={SUBJECTS[SUBJECT_BY_CATEGORY[course.cat]].color} /></div>
            <div className="p-5">
              <h3 className="text-[21px] font-extrabold">{course.title}</h3>
              <p className="mt-2 min-h-[44px] text-[15px] leading-snug text-slate-500">{course.level} · {course.cat}</p>
              <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-2 text-[14px] text-slate-500"><BookOpen className="h-4 w-4" />{course.lessons.length} lessons</span>
                <Link href={`/learning?course=${encodeURIComponent(course.id)}`} aria-label={`Open ${course.title}`} className="grid h-10 w-10 place-items-center rounded-full bg-sun"><ArrowRight className="h-5 w-5 text-navy" /></Link></div>
            </div>
          </Card>
        ))}
        {!courses.length ? <p className="text-sm text-slate-500">Loading courses…</p> : null}
      </div>
    </>
  );
}

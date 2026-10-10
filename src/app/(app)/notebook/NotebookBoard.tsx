'use client';
import { useState } from 'react';
import { Calendar, EllipsisVertical, FileText, Plus, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { NOTES, SUBJECTS, type Note, type Subject } from '@/lib/data';

const FILTERS = ['All Notes', 'Mathematics', 'Science', 'English', 'Social Studies', 'Agriculture'];
const TINT: Record<Subject, string> = { Mathematics: '#E5EFFE', Science: '#DDF7EC', English: '#EFE7FE', 'Social Studies': '#FFEBCC', Agriculture: '#DDF5D2', 'Life Skills': '#D9F3F3' };

export default function NotebookBoard() {
  const [f, setF] = useState('All Notes');
  const [notes, setNotes] = useState<Note[]>(NOTES);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ title: string; text: string; subject: Subject }>({ title: '', text: '', subject: 'Mathematics' });
  const add = (): void => {
    if (!draft.title.trim()) return;
    setNotes([{ id: Date.now(), subject: draft.subject, title: draft.title, text: draft.text, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }, ...notes]);
    setDraft({ title: '', text: '', subject: 'Mathematics' }); setOpen(false);
  };
  return (
    <>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="-mx-1 flex min-w-0 flex-1 gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
          {FILTERS.map((c) => <button key={c} aria-pressed={f === c} onClick={() => setF(c)} className="h-11 shrink-0 whitespace-nowrap rounded-full bg-white px-5 text-[14px] font-semibold shadow-sm aria-pressed:bg-sun">{c}</button>)}
        </div>
        <button onClick={() => setOpen(true)} className="flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-navy px-5 text-[14px] font-semibold text-white sm:ml-auto sm:w-auto"><Plus className="h-4 w-4" />New Note</button>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {notes.filter((n) => f === 'All Notes' || n.subject === f).map((n) => { const { icon: I, color } = SUBJECTS[n.subject]; return (
          <Card key={n.id} className="p-5">
            <div className="flex items-center justify-between"><span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: TINT[n.subject], color }}><I className="h-4 w-4" />{n.subject}</span><EllipsisVertical className="h-5 w-5 text-slate-500" /></div>
            <h3 className="mt-4 text-[19px] font-extrabold">{n.title}</h3>
            <p className="mt-3 min-h-[72px] text-[14.5px] leading-relaxed text-slate-500">{n.text}</p>
            <div className="mt-5 flex items-center justify-between text-[13px] text-slate-500"><span className="flex items-center gap-2"><Calendar className="h-4 w-4" />{n.date}</span><FileText className="h-5 w-5" /></div>
          </Card>); })}
      </div>
      {open && (
        <div role="dialog" aria-modal aria-label="New note" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-[440px] rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between"><h2 className="text-[22px] font-extrabold">New Note</h2><button aria-label="Close" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button></div>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" aria-label="Title" className="mt-4 h-12 w-full rounded-xl border border-line px-4" />
            <select value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value as Subject })} aria-label="Subject" className="mt-3 h-12 w-full rounded-xl border border-line px-3">{(Object.keys(SUBJECTS) as Subject[]).map((s) => <option key={s}>{s}</option>)}</select>
            <textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Write your note..." aria-label="Note" rows={4} className="mt-3 w-full rounded-xl border border-line p-4" />
            <button onClick={add} className="mt-4 h-12 w-full rounded-xl bg-sun font-bold">Save Note</button>
          </div>
        </div>
      )}
    </>
  );
}

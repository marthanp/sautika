'use client';

import { useEffect, useState } from 'react';
import { Calendar, NotebookText } from 'lucide-react';
import { Card } from '@/components/ui';
import { SUBJECTS, type Note } from '@/lib/data';

export default function RecentNotes() {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/account?resource=notes')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load recent notes.');
        return response.json() as Promise<{ notes: Note[] }>;
      })
      .then((result) => {
        if (!cancelled) setNotes(result.notes.slice(0, 5));
      })
      .catch((error: unknown) => {
        console.error('Recent notes could not be loaded:', error);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <Card className="p-5">
      <h2 className="flex items-center justify-between text-[17px] font-extrabold">
        <span className="flex items-center gap-2"><NotebookText className="h-5 w-5" />Recent Notes</span>
      </h2>
      {notes.length ? (
        <ul className="mt-3 divide-y divide-line">
          {notes.map((note) => {
            const { icon: Icon, color } = SUBJECTS[note.subject];
            return (
              <li key={note.id} className="flex items-center gap-3 py-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-white" style={{ background: color }}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold leading-tight">
                  {note.title}
                  <span className="mt-1 flex items-center gap-1.5 text-[12.5px] font-normal text-slate-500">
                    <Calendar className="h-3.5 w-3.5" />{note.date}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Your saved notes will appear here.</p>
      )}
    </Card>
  );
}

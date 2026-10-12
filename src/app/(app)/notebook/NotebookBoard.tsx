'use client';
import { useEffect, useRef, useState } from 'react';
import { Calendar, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { useLearnerAccount } from '@/components/LearnerDataSync';
import { SUBJECTS, type Note, type Subject } from '@/lib/data';

const FILTERS = ['All Notes', 'Mathematics', 'Science', 'English', 'Social Studies', 'Agriculture'];
const TINT: Record<Subject, string> = {
  Mathematics: '#E5EFFE',
  Science: '#DDF7EC',
  English: '#EFE7FE',
  'Social Studies': '#FFEBCC',
  Agriculture: '#DDF5D2',
  'Life Skills': '#D9F3F3',
};

export default function NotebookBoard() {
  const { refresh } = useLearnerAccount();
  const [f, setF] = useState('All Notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<{ title: string; text: string; subject: Subject }>({
    title: '',
    text: '',
    subject: 'Mathematics',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/account?resource=notes')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load your notes.');
        return response.json() as Promise<{ notes: Note[] }>;
      })
      .then((result) => {
        if (!cancelled) {
          setNotes(result.notes);
          setSyncError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) setSyncError(error instanceof Error ? error.message : 'Could not load your notes.');
      });

    const handleOpenModal = () => setOpen(true);
    const handleTriggerUpload = () => fileInputRef.current?.click();

    window.addEventListener('open-new-note', handleOpenModal);
    window.addEventListener('upload-note-file', handleTriggerUpload);

    return () => {
      cancelled = true;
      window.removeEventListener('open-new-note', handleOpenModal);
      window.removeEventListener('upload-note-file', handleTriggerUpload);
    };
  }, []);

  const add = async (): Promise<void> => {
    if (!draft.title.trim()) return;
    setIsSaving(true);
    setSyncError('');
    try {
      const note: Note = {
        id: crypto.randomUUID(),
        subject: draft.subject,
        title: draft.title.trim(),
        text: draft.text,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', note }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(result?.error ?? 'Could not save your note.');
      }
      setNotes((current) => [note, ...current]);
      setDraft({ title: '', text: '', subject: 'Mathematics' });
      setOpen(false);
      await refresh();
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Could not save your note.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async (id: string | number): Promise<void> => {
    try {
      const noteId = String(id);
      await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', action: 'delete', id: noteId }),
      });
      setNotes((prev) => prev.filter((n) => String(n.id) !== noteId));
      await refresh();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleFileUpload = async (files: FileList | null): Promise<void> => {
    if (!files || !files.length) return;
    const file = files[0];
    try {
      const text = await file.text();
      const title = file.name.replace(/\.[^/.]+$/, '');
      const note: Note = {
        id: crypto.randomUUID(),
        subject: 'Science',
        title: title || 'Uploaded File Notes',
        text: text.slice(0, 10000),
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      };
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', note }),
      });
      if (response.ok) {
        setNotes((prev) => [note, ...prev]);
        await refresh();
      }
    } catch (e) {
      console.error('Upload failed:', e);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.text"
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files)}
      />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="-mx-1 flex min-w-0 flex-1 gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
          {FILTERS.map((c) => (
            <button
              key={c}
              aria-pressed={f === c}
              onClick={() => setF(c)}
              className="h-11 shrink-0 whitespace-nowrap rounded-full bg-white px-5 text-[14px] font-semibold shadow-sm aria-pressed:bg-sun"
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:flex-initial"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-navy px-5 text-[14px] font-semibold text-white sm:flex-initial"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>
      </div>

      {syncError ? (
        <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {syncError}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {notes
          .filter((n) => f === 'All Notes' || n.subject === f)
          .map((n) => {
            const { icon: I, color } = SUBJECTS[n.subject] || SUBJECTS['Science'];
            return (
              <Card key={n.id} className="relative flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold"
                      style={{ background: TINT[n.subject] || '#E5EFFE', color }}
                    >
                      <I className="h-4 w-4" />
                      {n.subject}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete note ${n.title}`}
                      onClick={() => void deleteNote(n.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="mt-4 text-[19px] font-extrabold text-navy">{n.title}</h3>
                  <p className="mt-3 min-h-[72px] text-[14.5px] leading-relaxed text-slate-600 whitespace-pre-line">
                    {n.text}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line/60 pt-3 text-[13px] text-slate-500">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {n.date}
                  </span>
                  <FileText className="h-4 w-4" />
                </div>
              </Card>
            );
          })}

        {notes.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="text-3xl">📝</p>
            <h4 className="mt-2 text-[17px] font-bold text-navy">No notes created yet</h4>
            <p className="mt-1 text-sm text-slate-500">
              Create your first note or upload a study file to keep key points handy.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-sun px-5 text-sm font-bold text-navy"
            >
              <Plus className="h-4 w-4" /> Create a Note
            </button>
          </div>
        )}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal
          aria-label="New note"
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-extrabold text-navy">Create New Note</h2>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Note Title (e.g. Photosynthesis Summary)"
              aria-label="Title"
              className="mt-4 h-12 w-full rounded-xl border border-line px-4 text-sm focus:border-navy focus:outline-none"
            />
            <select
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value as Subject })}
              aria-label="Subject"
              className="mt-3 h-12 w-full rounded-xl border border-line px-3 text-sm focus:border-navy focus:outline-none"
            >
              {(Object.keys(SUBJECTS) as Subject[]).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder="Write your study notes, formulas, or key ideas here..."
              aria-label="Note"
              rows={5}
              className="mt-3 w-full rounded-xl border border-line p-4 text-sm focus:border-navy focus:outline-none"
            />
            <button
              onClick={() => void add()}
              disabled={isSaving || !draft.title.trim()}
              className="mt-4 h-12 w-full rounded-xl bg-sun font-bold text-navy shadow-sm transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Note (+5 Coins)'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

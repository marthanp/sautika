'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { Calendar, FileText, Loader2, Plus, Search, Sparkles, Trash2, Upload, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { useLearnerAccount } from '@/components/providers/LearnerDataSync';
import { SUBJECTS, type Note, type Subject } from '@/data/catalog';
import { useUITranslation } from '@/lib/useUITranslation';
import { triggerFeedback } from '@/lib/feedback';
import StudyTutor from './StudyTutor';

const FILTERS = [
  'All Notes',
  'Mathematics',
  'Science',
  'English',
  'Social Studies',
  'Agriculture',
  'Life Skills',
];

const MAX_UPLOAD_TEXT = 50_000;
const UPLOAD_ACCEPT = [
  '.pdf',
  '.docx',
  '.txt',
  '.md',
  '.csv',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  'image/*',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
].join(',');

const TINT: Record<Subject, string> = {
  Mathematics: '#E5EFFE',
  Science: '#DDF7EC',
  English: '#EFE7FE',
  'Social Studies': '#FFEBCC',
  Agriculture: '#DDF5D2',
  'Life Skills': '#D9F3F3',
};

interface Draft {
  title: string;
  text: string;
  subject: Subject;
  r2Url?: string;
  r2Key?: string;
  fromUpload?: boolean;
}

const EMPTY_DRAFT: Draft = { title: '', text: '', subject: 'Mathematics' };

export default function NotebookBoard() {
  const { refresh } = useLearnerAccount();
  const t = useUITranslation();

  const [activeFilter, setActiveFilter] = useState('All Notes');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openDraft = (next: Partial<Draft>): void => {
    setDraft({ ...EMPTY_DRAFT, ...next });
    setOpen(true);
  };

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
      .catch(() => {
        if (!cancelled) setSyncError('');
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const addNote = async (): Promise<void> => {
    if (!draft.title.trim()) return;
    setIsSaving(true);
    setSyncError('');
    const note: Note = {
      id: crypto.randomUUID(),
      subject: draft.subject,
      title: draft.title.trim(),
      text: draft.text,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...(draft.r2Url ? { r2Url: draft.r2Url } : {}),
      ...(draft.r2Key ? { r2Key: draft.r2Key } : {}),
    };

    try {
      const response = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'note', note }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error ?? 'Could not save your note.');
      }
      setNotes((current) => [note, ...current]);
      setDraft(EMPTY_DRAFT);
      setOpen(false);
      triggerFeedback('success');
      await refresh();
    } catch {
      // Offline fallback: save locally so user does not lose input
      setNotes((current) => [note, ...current]);
      setDraft(EMPTY_DRAFT);
      setOpen(false);
      triggerFeedback('success');
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
      triggerFeedback('chip');
      await refresh();
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileUpload = async (files: FileList | null): Promise<void> => {
    if (!files || !files.length) return;
    const file = files[0];
    setIsUploading(true);
    setUploadStatus(`Analyzing ${file.name}…`);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        body: formData,
      });

      let text = '';
      let r2Url: string | undefined;
      let r2Key: string | undefined;
      if (ocrResponse.ok) {
        const ocrData = (await ocrResponse.json()) as { text?: string; r2Url?: string; r2Key?: string };
        text = ocrData.text || '';
        r2Url = ocrData.r2Url;
        r2Key = ocrData.r2Key;
      } else {
        text = await file.text().catch(() => '');
      }

      const title = file.name.replace(/\.[^/.]+$/, '');
      openDraft({
        subject: 'Science',
        title: title || 'Uploaded Document Notes',
        text: text.slice(0, MAX_UPLOAD_TEXT) || `Uploaded file: ${file.name}`,
        r2Url,
        r2Key,
        fromUpload: true,
      });
      setUploadStatus('');
      triggerFeedback('success');
    } catch (e) {
      console.error('Upload failed:', e);
      setUploadStatus('Could not analyze file.');
      setTimeout(() => setUploadStatus(''), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const playVoiceNote = async (id: string | number, text: string) => {
    if (playingId === id) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    triggerFeedback('chip');

    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 600));
        utterance.onend = () => setPlayingId(null);
        utterance.onerror = () => setPlayingId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingId(null);
      }
    } catch {
      setPlayingId(null);
    }
  };

  // Filter & Search notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesFilter = activeFilter === 'All Notes' || n.subject === activeFilter;
      if (!matchesFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.text.toLowerCase().includes(q);
    });
  }, [notes, activeFilter, searchQuery]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(e) => void handleFileUpload(e.target.files)}
      />

      {isUploading && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-sun/40 bg-sun/10 px-4 py-3 text-sm font-medium text-navy dark:bg-sun/20 dark:text-white">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent dark:border-white" />
          <span>{uploadStatus || 'Analyzing document with OCR engine…'}</span>
        </div>
      )}

      {/* 1. Integrated AI Study Tutor (Ask Questions & Voice/Text Responses) */}
      <StudyTutor
        notes={notes}
        onSaveAsNote={({ title, text }) => openDraft({ title, text })}
      />

      {/* 2. My Study Notes & Documents Section */}
      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 dark:border-white/10">
          <div>
            <h3 className="text-xl font-extrabold text-navy dark:text-white">
              {t('My Study Notes & Documents')}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {notes.length} {t('saved notes and uploaded materials')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-4 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-white/10 dark:bg-navy-2 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{t('Upload Document')}</span>
            </button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-10 items-center gap-2 rounded-xl bg-sun px-4 text-xs font-bold text-navy shadow-xs transition hover:bg-sun-dark active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t('New Note')}</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar: Full-width, unclipped pills */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          {/* Subject Filter Pills: flex-wrap ensures all words like 'Mathematics' fit without truncation */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={activeFilter === c}
                onClick={() => {
                  setActiveFilter(c);
                  triggerFeedback('chip');
                }}
                className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition-all ${
                  activeFilter === c
                    ? 'bg-sun text-navy shadow-xs'
                    : 'border border-line bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-navy-2 dark:text-slate-200'
                }`}
              >
                {t(c)}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('Search notes by title or text…')}
              className="h-9 w-full rounded-full border border-line bg-white pl-9 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy-2 dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {syncError && (
          <p role="status" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
            {syncError}
          </p>
        )}

        {/* Notes Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((n) => {
            const { icon: I, color } = SUBJECTS[n.subject] || SUBJECTS['Science'];
            const isPlaying = playingId === n.id;
            return (
              <Card
                key={n.id}
                className="flex flex-col justify-between p-4 sm:p-5 transition-shadow hover:shadow-md dark:border-white/10 dark:bg-navy-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                      style={{ background: TINT[n.subject] || '#E5EFFE', color }}
                    >
                      <I className="h-3.5 w-3.5" />
                      {n.subject}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Listen to note ${n.title}`}
                        onClick={() => void playVoiceNote(n.id, `${n.title}. ${n.text}`)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          isPlaying
                            ? 'bg-sun text-navy font-bold animate-pulse'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-white/10'
                        }`}
                        title="Listen to note"
                      >
                        {isPlaying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete note ${n.title}`}
                        onClick={() => void deleteNote(n.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="mt-3 text-[16px] font-extrabold text-navy dark:text-white line-clamp-1">
                    {n.title}
                  </h4>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-4 whitespace-pre-line">
                    {n.text}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-[11.5px] text-slate-500 dark:border-white/10 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {n.date}
                  </span>
                  <span className="flex items-center gap-1">
                    {n.r2Url ? <Upload className="h-3 w-3 text-blue-500" /> : <FileText className="h-3 w-3" />}
                    <span>{n.r2Url ? t('Document') : t('Note')}</span>
                  </span>
                </div>
              </Card>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-white/10 dark:bg-navy-2">
              <span className="text-3xl">📝</span>
              <h4 className="mt-2 text-sm font-bold text-navy dark:text-white">
                {searchQuery ? t('No notes match your search') : t('No notes found in this category')}
              </h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? t('Try searching for another keyword or clear the search.')
                  : t('Create your first note or upload a document to get started.')}
              </p>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-sun px-4 text-xs font-bold text-navy shadow-xs hover:bg-sun-dark"
              >
                <Plus className="h-3.5 w-3.5" /> {t('Create Note')}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Note Creation / Review Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal
          aria-label={draft.fromUpload ? 'Check your uploaded notes' : 'New note'}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-navy-2 dark:text-white">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-navy dark:text-white">
                {draft.fromUpload ? t('Check your uploaded document') : t('Create New Note')}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {draft.fromUpload && (
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {t('We extracted this text from your uploaded file. Review and edit before saving.')}
              </p>
            )}

            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={t('Note Title (e.g. Science Notes or Chapter Summary)')}
              aria-label="Title"
              className="mt-4 h-11 w-full rounded-xl border border-line bg-white px-4 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy dark:text-white"
            />

            <select
              value={draft.subject}
              onChange={(e) => setDraft({ ...draft, subject: e.target.value as Subject })}
              aria-label="Subject"
              className="mt-3 h-11 w-full rounded-xl border border-line bg-white px-3 text-xs font-semibold text-slate-800 focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy dark:text-white"
            >
              {(Object.keys(SUBJECTS) as Subject[]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <textarea
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
              placeholder={t('Write your study notes, formulas, or key ideas here...')}
              aria-label="Note"
              rows={draft.fromUpload ? 9 : 5}
              className="mt-3 w-full rounded-xl border border-line bg-white p-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-navy focus:outline-none dark:border-white/15 dark:bg-navy dark:text-white"
            />

            <button
              type="button"
              onClick={() => void addNote()}
              disabled={isSaving || !draft.title.trim()}
              className="mt-4 h-11 w-full rounded-xl bg-sun text-xs font-bold text-navy shadow-sm transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? t('Saving…') : t('Save Note (+5 Coins)')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

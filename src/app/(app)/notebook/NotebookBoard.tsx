'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Calendar, CloudOff, FileText, Loader2, Plus, Trash2, Upload, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { useLearnerAccount } from '@/components/providers/LearnerDataSync';
import { SUBJECTS, type Note, type Subject } from '@/data/catalog';
import { useApp } from '@/store/useApp';
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
/** Only what /api/ocr can actually read. */
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
/**
 * The only types `file.text()` can turn into readable notes. Reading anything
 * else (a PDF, a photo) gives binary junk, which used to be saved as a "note".
 */
const TEXT_READABLE = /^(text\/|application\/json$)/;
const TEXT_READABLE_EXTENSIONS = ['.txt', '.md', '.csv', '.json'];

function isTextReadable(file: File): boolean {
  if (TEXT_READABLE.test(file.type)) return true;
  const name = file.name.toLowerCase();
  return TEXT_READABLE_EXTENSIONS.some((extension) => name.endsWith(extension));
}

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
  const pendingNotes = useApp((state) => state.pendingNotes);
  const queueNote = useApp((state) => state.queueNote);
  const dropPendingNote = useApp((state) => state.dropPendingNote);
  const [f, setF] = useState('All Notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  /** The real error from the last failed save, shown inside the modal. */
  const [saveError, setSaveError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Opens the note modal pre-filled, so nothing is ever saved without the learner checking it. */
  const openDraft = (next: Partial<Draft>): void => {
    setDraft({ ...EMPTY_DRAFT, ...next });
    setSaveError('');
    setOpen(true);
  };

  /**
   * Returns the saved notes, or null when they cannot be loaded. The caller
   * applies the result, so no state is set straight from an effect body.
   */
  const fetchNotes = useCallback(async (): Promise<Note[] | null> => {
    try {
      const response = await fetch('/api/account?resource=notes');
      if (!response.ok) throw new Error('Could not load your notes.');
      const result = (await response.json()) as { notes: Note[] };
      return result.notes;
    } catch {
      // Queued notes are still on screen with their badge, so say nothing here.
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchNotes().then((loaded) => {
      if (!cancelled && loaded) setNotes(loaded);
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
  }, [fetchNotes]);

  /**
   * When `LearnerDataSync` drains the queue, pull the saved notes so the card
   * turns from "Waiting to sync" into a normal saved note without a reload.
   */
  const pendingCount = pendingNotes.length;
  const lastPendingCount = useRef(pendingCount);
  useEffect(() => {
    const drained = pendingCount < lastPendingCount.current;
    lastPendingCount.current = pendingCount;
    if (!drained) return;
    let cancelled = false;
    void fetchNotes().then((loaded) => {
      if (!cancelled && loaded) setNotes(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [pendingCount, fetchNotes]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  /** One shape for the note, used by both the save and the "keep for later" path. */
  const buildNote = (): Note => ({
    id: crypto.randomUUID(),
    subject: draft.subject,
    title: draft.title.trim(),
    text: draft.text,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    ...(draft.r2Url ? { r2Url: draft.r2Url } : {}),
    ...(draft.r2Key ? { r2Key: draft.r2Key } : {}),
  });

  const add = async (): Promise<void> => {
    if (!draft.title.trim()) return;
    setIsSaving(true);
    setSyncError('');
    setSaveError('');
    const note: Note = buildNote();
    try {
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
      setDraft(EMPTY_DRAFT);
      setSaveError('');
      setOpen(false);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your note.';
      // Offline is expected on the data plans our learners use: queue it and say so.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        keepForLater(note);
        return;
      }
      // Online failure: keep the modal open with the real reason and a retry.
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Puts the note in the persisted queue instead of pretending it saved.
   * `LearnerDataSync` flushes the queue when the connection comes back.
   */
  const keepForLater = (note: Note): void => {
    queueNote(note);
    setDraft(EMPTY_DRAFT);
    setSaveError('');
    setOpen(false);
    setSyncError('Saved on this device. It will sync when you are back online.');
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
      } else if (isTextReadable(file)) {
        // Safe fallback: this really is text, so reading it client-side is fine.
        text = await file.text().catch(() => '');
      } else {
        // A PDF or photo read as text is binary junk. Say so instead of saving it.
        setUploadStatus('We could not read this file. Try a clearer photo or a PDF with selectable text.');
        setTimeout(() => setUploadStatus(''), 6000);
        return;
      }

      const title = file.name.replace(/\.[^/.]+$/, '');
      // Nothing is saved yet: the learner checks what we read before it becomes a note.
      openDraft({
        subject: 'Science',
        title: title || 'Uploaded Document Notes',
        text: text.slice(0, MAX_UPLOAD_TEXT) || `Uploaded file: ${file.name}`,
        r2Url,
        r2Key,
        fromUpload: true,
      });
      setUploadStatus('');
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
  const [activeAudioLang, setActiveAudioLang] = useState<string>('lug');

  const playVoiceNote = async (id: string | number, text: string) => {
    if (playingId === id) {
      setPlayingId(null);
      return;
    }
    setPlayingId(id);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 500),
          language: activeAudioLang,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { audioUrl?: string };
        if (data.audioUrl) {
          const audio = new Audio(data.audioUrl);
          audio.onended = () => setPlayingId(null);
          audio.onerror = () => setPlayingId(null);
          await audio.play();
          return;
        }
      }
      // Browser SpeechSynthesis fallback
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
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

  /**
   * Queued notes sit above the saved ones with a badge, so a note never looks
   * saved when it is not.
   */
  const visibleNotes: { note: Note; pending: boolean }[] = [
    ...pendingNotes.map((entry) => ({ note: entry.note, pending: true })),
    ...notes.map((note) => ({ note, pending: false })),
  ].filter(({ note }) => f === 'All Notes' || note.subject === f);

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
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-sun/40 bg-sun/10 px-4 py-3 text-sm font-medium text-navy">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
          <span>{uploadStatus || 'Analyzing document with OCR engine…'}</span>
        </div>
      )}

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
          {/* Voice Language Picker */}
          <select
            value={activeAudioLang}
            onChange={(e) => setActiveAudioLang(e.target.value)}
            aria-label="Voice language"
            className="h-11 rounded-full border border-line bg-white px-3 text-[12.5px] font-semibold text-slate-700 shadow-sm focus:border-navy focus:outline-none"
            title="Choose Sunbird voice language"
          >
            {/* Only languages Sunbird can actually speak. */}
            <option value="lug">Luganda 🇺🇬</option>
            <option value="ach">Acholi 🇺🇬</option>
            <option value="teo">Ateso 🇺🇬</option>
            <option value="nyn">Runyankole 🇺🇬</option>
            <option value="swa">Swahili</option>
            <option value="kin">Kinyarwanda 🇷🇼</option>
            <option value="eng">English</option>
          </select>

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

      <StudyTutor
        notes={notes}
        onSaveAsNote={({ title, text }) => openDraft({ title, text })}
      />

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visibleNotes
          .map(({ note: n, pending }) => {
            const { icon: I, color } = SUBJECTS[n.subject] || SUBJECTS['Science'];
            const isPlaying = playingId === n.id;
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Listen to note ${n.title}`}
                        onClick={() => void playVoiceNote(n.id, `${n.title}. ${n.text}`)}
                        className={`rounded-lg p-1.5 transition-colors ${
                          isPlaying
                            ? 'bg-sun text-navy font-bold animate-pulse'
                            : 'text-slate-500 hover:bg-slate-100 hover:text-navy'
                        }`}
                        title="Listen with Sunbird Voice"
                      >
                        {isPlaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete note ${n.title}`}
                        onClick={() => (pending ? dropPendingNote(n.id) : void deleteNote(n.id))}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {pending ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-bold text-amber-900">
                      <CloudOff className="h-3.5 w-3.5" aria-hidden />
                      Waiting to sync
                    </p>
                  ) : null}
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

        {visibleNotes.length === 0 && (
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
          aria-label={draft.fromUpload ? 'Check your uploaded notes' : 'New note'}
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
        >
          <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[22px] font-extrabold text-navy">
                {draft.fromUpload ? 'Check your uploaded notes' : 'Create New Note'}
              </h2>
              <button aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {draft.fromUpload ? (
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">
                We read this from your file. Fix any mistakes before saving.
              </p>
            ) : null}
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
              rows={draft.fromUpload ? 10 : 5}
              className="mt-3 w-full rounded-xl border border-line p-4 text-sm focus:border-navy focus:outline-none"
            />
            {saveError ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4">
                <p className="flex items-start gap-2 text-[13.5px] font-semibold leading-relaxed text-red-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{saveError}</span>
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-red-800">
                  Your note is still here. Try again, or keep it on this device and we will sync it later.
                </p>
              </div>
            ) : null}
            <button
              onClick={() => void add()}
              disabled={isSaving || !draft.title.trim()}
              className="mt-4 h-12 w-full rounded-xl bg-sun font-bold text-navy shadow-sm transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : saveError ? 'Try again' : 'Save Note (+5 Coins)'}
            </button>
            {saveError ? (
              <button
                type="button"
                onClick={() => keepForLater(buildNote())}
                className="mt-2 h-12 w-full rounded-xl border border-line bg-white text-[14px] font-semibold text-navy transition hover:bg-slate-50"
              >
                Keep it on this device
              </button>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}

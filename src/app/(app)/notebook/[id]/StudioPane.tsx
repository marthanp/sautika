'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  Brain,
  FileBarChart,
  Headphones,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Presentation,
  Table,
  Trash2,
  Video,
} from 'lucide-react';
import { deleteNote, listNotes, saveNote, type NoteView } from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';
import type { StudioType } from '@/types/notebook';

interface Props {
  notebookId: string;
  readySources: number;
  /** Bumped by the chat pane when it saves a reply, to reload the list. */
  notesVersion: number;
}

const TILES: { type: StudioType; label: string; icon: typeof Headphones; blurb: string }[] = [
  { type: 'audio_overview', label: 'Audio Overview', icon: Headphones, blurb: 'Two voices discuss your sources' },
  { type: 'video_overview', label: 'Video Overview', icon: Video, blurb: 'Narrated slides you can watch' },
  { type: 'mind_map', label: 'Mind Map', icon: Brain, blurb: 'See how the ideas connect' },
  { type: 'report', label: 'Reports', icon: FileBarChart, blurb: 'Study guide, briefing or revision sheet' },
  { type: 'flashcards', label: 'Flashcards', icon: Layers, blurb: 'Cards to practise with' },
  { type: 'quiz', label: 'Quiz', icon: BookOpenCheck, blurb: 'Questions with explanations' },
  { type: 'infographic', label: 'Infographic', icon: ImageIcon, blurb: 'One printable page of key facts' },
  { type: 'data_table', label: 'Data table', icon: Table, blurb: 'Facts and dates in a sortable table' },
  { type: 'slide_deck', label: 'Slide deck', icon: Presentation, blurb: 'Slides with speaker notes' },
];

/**
 * The Studio pane: tiles that turn the ticked sources into study material,
 * and the notes kept in this notebook.
 *
 * The generators are Phase 5. Until then each tile says so rather than
 * pretending to work — a button that does nothing is worse than a label.
 */
export default function StudioPane({ notebookId, readySources, notesVersion }: Props) {
  const t = useUITranslation();
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listNotes(notebookId)
      .then((result) => {
        if (!cancelled) setNotes(result.notes);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('Could not load your notes.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notebookId, notesVersion, t]);

  const create = async (): Promise<void> => {
    if (!draft.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { note } = await saveNote(notebookId, { body: draft, origin: 'manual' });
      setNotes((current) => [...current, note]);
      setDraft('');
      setComposing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('Could not save the note.'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (noteId: string): Promise<void> => {
    try {
      await deleteNote(notebookId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('Could not delete the note.'));
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-extrabold text-navy">{t('Studio')}</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {readySources === 0
            ? t('Add a source to use Studio')
            : t('Turn the ticked sources into study material')}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul className="grid grid-cols-2 gap-2">
          {TILES.map(({ type, label, icon: Icon, blurb }) => (
            <li key={type}>
              <div
                className="flex h-full min-h-[104px] flex-col rounded-xl border border-line bg-white p-3 opacity-70"
                aria-disabled="true"
              >
                <Icon className="h-5 w-5 text-navy" aria-hidden />
                <p className="mt-2 text-[13px] font-bold leading-tight text-navy">{t(label)}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{t(blurb)}</p>
                <p className="mt-auto pt-1.5 text-[10.5px] font-bold uppercase tracking-wide text-slate-400">
                  {t('Coming next')}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <section className="mt-5" aria-labelledby="notes-heading">
          <div className="flex items-center justify-between gap-2">
            <h3 id="notes-heading" className="text-[13px] font-extrabold uppercase tracking-wider text-navy">
              {t('Your notes')}
            </h3>
            <button
              type="button"
              onClick={() => setComposing((current) => !current)}
              className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-bold text-navy transition hover:bg-mist"
            >
              <Plus className="h-4 w-4" aria-hidden /> {t('Create note')}
            </button>
          </div>

          {composing ? (
            <div className="mt-2">
              <label htmlFor="studio-note" className="sr-only">
                {t('Your note')}
              </label>
              <textarea
                id="studio-note"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={4}
                placeholder={t('Write a key point you want to remember…')}
                className="w-full rounded-xl border border-line p-3 text-[13.5px] leading-relaxed text-ink focus:border-navy focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void create()}
                disabled={saving || !draft.trim()}
                className="mt-2 h-11 w-full rounded-xl bg-sun text-[13.5px] font-bold text-navy transition hover:bg-sun-dark disabled:opacity-50"
              >
                {saving ? t('Saving…') : t('Save note')}
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-2 flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : null}

          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('Loading your notes…')}
            </p>
          ) : notes.length === 0 ? (
            <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500">
              {t('Nothing saved yet. Keep an answer from the chat, or write your own note.')}
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="rounded-xl border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-[13px] font-bold text-navy">{note.title}</p>
                    <button
                      type="button"
                      aria-label={`${t('Delete note')}: ${note.title}`}
                      onClick={() => void remove(note.id)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600">
                    {note.body}
                  </p>
                  {note.origin === 'saved_reply' ? (
                    <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-mist px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
                      <BarChart3 className="h-3 w-3" aria-hidden /> {t('From a reply')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

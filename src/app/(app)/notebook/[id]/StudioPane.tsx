'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  ChevronLeft,
  FileBarChart,
  Headphones,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  Presentation,
  RotateCw,
  Table,
  Trash2,
  Video,
} from 'lucide-react';
import StudioOutputView from './StudioOutputView';
import {
  deleteNote,
  deleteStudio,
  listNotes,
  listStudio,
  requestStudio,
  saveNote,
  type NoteView,
  type StudioOutputView as StudioOutput,
} from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';
import type { StudioPayload } from '@/lib/studio/types';
import type { StudioType } from '@/types/notebook';

interface Props {
  notebookId: string;
  language: string;
  selected: Set<string>;
  readySources: number;
  notesVersion: number;
  onOpenCitation?: (sourceId: string, chunkId: string) => void;
  onAsk?: (question: string) => void;
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

const TILE_LABEL = new Map(TILES.map((tile) => [tile.type, tile.label]));
const TILE_ICON = new Map(TILES.map((tile) => [tile.type, tile.icon]));

/** While anything is building, poll so the tile finishes on its own. */
const POLL_MS = 3000;

export default function StudioPane({
  notebookId,
  language,
  selected,
  readySources,
  notesVersion,
  onOpenCitation,
  onAsk,
}: Props) {
  const t = useUITranslation();
  const [outputs, setOutputs] = useState<StudioOutput[]>([]);
  const [notes, setNotes] = useState<NoteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState<StudioType | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async (): Promise<{
    outputs: StudioOutput[];
    notes: NoteView[];
  } | null> => {
    try {
      const [studio, noteList] = await Promise.all([listStudio(notebookId), listNotes(notebookId)]);
      return { outputs: studio.outputs, notes: noteList.notes };
    } catch {
      return null;
    }
  }, [notebookId]);

  useEffect(() => {
    let cancelled = false;
    void fetchAll().then((result) => {
      if (cancelled) return;
      if (result) {
        setOutputs(result.outputs);
        setNotes(result.notes);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchAll, notesVersion]);

  const working = outputs.some(
    (output) => output.status === 'queued' || output.status === 'running',
  );

  useEffect(() => {
    if (!working) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void fetchAll().then((result) => {
        if (!cancelled && result) setOutputs(result.outputs);
      });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [working, fetchAll]);

  const reload = (): void => {
    void fetchAll().then((result) => {
      if (result) {
        setOutputs(result.outputs);
        setNotes(result.notes);
      }
    });
  };

  const start = async (type: StudioType): Promise<void> => {
    if (selected.size === 0) {
      setError(t('Tick at least one source first.'));
      return;
    }
    setStarting(type);
    setError('');
    try {
      await requestStudio(notebookId, { type, sourceIds: [...selected], language });
      reload();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : t('Could not start that just now.'));
    } finally {
      setStarting(null);
    }
  };

  const remove = async (outputId: string): Promise<void> => {
    try {
      await deleteStudio(notebookId, outputId);
      setOutputs((current) => current.filter((output) => output.id !== outputId));
      if (open === outputId) setOpen(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('Could not remove that.'));
    }
  };

  const createNote = async (): Promise<void> => {
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

  const removeNote = async (noteId: string): Promise<void> => {
    try {
      await deleteNote(notebookId, noteId);
      setNotes((current) => current.filter((note) => note.id !== noteId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('Could not delete the note.'));
    }
  };

  // ── One output, open ─────────────────────────────────────────────────────
  const opened = outputs.find((output) => output.id === open);
  if (opened && opened.status === 'ready' && opened.payload) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-1 border-b border-line px-2 py-2">
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="flex h-11 items-center gap-1 rounded-xl px-2 text-[13px] font-bold text-navy transition hover:bg-mist"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden /> {t('Studio')}
          </button>
          <h2 className="min-w-0 flex-1 truncate text-[14px] font-extrabold text-navy">
            {t(TILE_LABEL.get(opened.type as StudioType) ?? 'Output')}
          </h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <StudioOutputView
            payload={opened.payload as StudioPayload}
            onOpenCitation={onOpenCitation}
            onAsk={onAsk}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-extrabold text-navy">{t('Studio')}</h2>
        <p className="mt-0.5 text-[12px] text-slate-500">
          {readySources === 0
            ? t('Add a source to use Studio')
            : selected.size === 0
              ? t('Tick a source to use Studio')
              : t('Turn the ticked sources into study material')}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <ul className="grid grid-cols-2 gap-2">
          {TILES.map(({ type, label, icon: Icon, blurb }) => (
            <li key={type}>
              <button
                type="button"
                onClick={() => void start(type)}
                disabled={readySources === 0 || starting !== null}
                className="flex h-full min-h-[104px] w-full flex-col rounded-xl border border-line bg-white p-3 text-left transition hover:border-sun hover:bg-sun/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {starting === type ? (
                  <Loader2 className="h-5 w-5 animate-spin text-navy" aria-hidden />
                ) : (
                  <Icon className="h-5 w-5 text-navy" aria-hidden />
                )}
                <span className="mt-2 text-[13px] font-bold leading-tight text-navy">{t(label)}</span>
                <span className="mt-0.5 text-[11px] leading-snug text-slate-500">{t(blurb)}</span>
              </button>
            </li>
          ))}
        </ul>

        {error ? (
          <p
            role="alert"
            className="mt-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        ) : null}

        {/* ── Built and building ───────────────────────────────────────── */}
        {outputs.length > 0 ? (
          <section className="mt-5" aria-labelledby="studio-outputs">
            <h3
              id="studio-outputs"
              className="text-[13px] font-extrabold uppercase tracking-wider text-navy"
            >
              {t('Built for you')}
            </h3>
            <ul className="mt-2 space-y-2">
              {outputs.map((output) => {
                const Icon = TILE_ICON.get(output.type as StudioType) ?? FileBarChart;
                const busy = output.status === 'queued' || output.status === 'running';

                return (
                  <li key={output.id} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-start gap-2">
                      {busy ? (
                        <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-navy" aria-hidden />
                      ) : (
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy" aria-hidden />
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-navy">
                          {t(TILE_LABEL.get(output.type as StudioType) ?? output.type)}
                        </p>

                        {busy ? (
                          <>
                            <p className="mt-0.5 text-[12px] text-slate-500">
                              {output.progress?.message ?? t('Starting…')}
                            </p>
                            <div
                              role="progressbar"
                              aria-valuenow={output.progress?.percent ?? 0}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-mist"
                            >
                              <i
                                className="block h-full rounded-full bg-sun transition-[width] duration-500 motion-reduce:transition-none"
                                style={{ width: `${output.progress?.percent ?? 5}%` }}
                              />
                            </div>
                          </>
                        ) : output.status === 'failed' ? (
                          <p className="mt-0.5 text-[12px] leading-snug text-red-800">
                            {output.error ?? t('That did not work.')}
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOpen(output.id)}
                            className="mt-1 text-[12.5px] font-bold text-navy underline"
                          >
                            {t('Open')}
                          </button>
                        )}
                      </div>

                      <span className="flex shrink-0 flex-col">
                        {output.status === 'failed' ? (
                          <button
                            type="button"
                            aria-label={t('Try again')}
                            onClick={() => void start(output.type as StudioType)}
                            className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-mist hover:text-navy"
                          >
                            <RotateCw className="h-4 w-4" aria-hidden />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label={t('Remove')}
                          onClick={() => void remove(output.id)}
                          className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ── Notes ───────────────────────────────────────────────────── */}
        <section className="mt-5" aria-labelledby="notes-heading">
          <div className="flex items-center justify-between gap-2">
            <h3
              id="notes-heading"
              className="text-[13px] font-extrabold uppercase tracking-wider text-navy"
            >
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
                onClick={() => void createNote()}
                disabled={saving || !draft.trim()}
                className="mt-2 h-11 w-full rounded-xl bg-sun text-[13.5px] font-bold text-navy transition hover:bg-sun-dark disabled:opacity-50"
              >
                {saving ? t('Saving…') : t('Save note')}
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('Loading…')}
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
                      onClick={() => void removeNote(note.id)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-[12.5px] leading-relaxed text-slate-600">
                    {note.body}
                  </p>
                  {note.origin === 'saved_reply' ? (
                    <p className="mt-1.5 inline-flex rounded-full bg-mist px-2 py-0.5 text-[10.5px] font-bold text-slate-600">
                      {t('From a reply')}
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

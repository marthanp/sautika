'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  Copy,
  FolderOpen,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  copyNotebook,
  createNotebook,
  deleteNotebook,
  listNotebooks,
  renameNotebook,
  type NotebookSummary,
} from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';
import AIChatbot from '@/components/chat/AIChatbot';

type Sort = 'recent' | 'title';

/** Suggestions for a new notebook, so the dialog is not an empty box. */
const EMOJI_CHOICES = ['📚', '🔢', '🔬', '📖', '🌍', '🌱', '💡', '🎯'];

/**
 * Fuzzy enough for a misspelling: every letter of the query must appear in the
 * title in order. "mathz" still finds "Mathematics notes". Dyslexia-friendly
 * search is a Phase 8 requirement and this is the shared primitive.
 */
export function looseMatch(title: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = title.toLowerCase();
  if (haystack.includes(needle)) return true;

  let index = 0;
  for (const character of needle) {
    if (character === ' ') continue;
    index = haystack.indexOf(character, index);
    if (index === -1) return false;
    index += 1;
  }
  return true;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotebooksHome() {
  const t = useUITranslation();
  const router = useRouter();

  const [notebooks, setNotebooks] = useState<NotebookSummary[]>([]);
  const [featured, setFeatured] = useState<NotebookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (): Promise<
    { notebooks: NotebookSummary[]; featured: NotebookSummary[] } | { message: string }
  > => {
    try {
      return await listNotebooks();
    } catch (loadError) {
      return { message: loadError instanceof Error ? loadError.message : 'Could not load your notebooks.' };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void load().then((result) => {
      if (cancelled) return;
      if ('message' in result) setError(result.message);
      else {
        setNotebooks(result.notebooks);
        setFeatured(result.featured);
        setError('');
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  const refresh = (): void => {
    void load().then((result) => {
      if ('message' in result) return;
      setNotebooks(result.notebooks);
      setFeatured(result.featured);
    });
  };

  const visible = useMemo(() => {
    const filtered = notebooks.filter((notebook) => looseMatch(notebook.title, query));
    return [...filtered].sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [notebooks, query, sort]);

  const visibleFeatured = useMemo(
    () => featured.filter((notebook) => looseMatch(notebook.title, query)),
    [featured, query],
  );

  const onRename = async (notebook: NotebookSummary): Promise<void> => {
    const next = window.prompt(t('Rename this notebook'), notebook.title);
    if (!next || next.trim() === notebook.title) return;
    setBusyId(notebook.id);
    try {
      await renameNotebook(notebook.id, { title: next.trim() });
      refresh();
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : t('Could not save the change.'));
    } finally {
      setBusyId(null);
      setMenuOpenFor(null);
    }
  };

  const onDelete = async (notebook: NotebookSummary): Promise<void> => {
    const confirmed = window.confirm(
      t('Delete this notebook and everything in it? This cannot be undone.'),
    );
    if (!confirmed) return;
    setBusyId(notebook.id);
    try {
      await deleteNotebook(notebook.id);
      setNotebooks((current) => current.filter((entry) => entry.id !== notebook.id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('Could not delete the notebook.'));
    } finally {
      setBusyId(null);
      setMenuOpenFor(null);
    }
  };

  const onCopy = async (notebook: NotebookSummary): Promise<void> => {
    setBusyId(notebook.id);
    try {
      const { notebookId } = await copyNotebook(notebook.id);
      router.push(`/notebook/${notebookId}`);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : t('Could not copy the notebook.'));
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1330px]">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-bold tracking-wider text-navy sm:text-[13px]">
            <FolderOpen className="h-4 w-4" aria-hidden /> {t('NOTEBOOK')}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-navy sm:text-[32px]">
            {t('Your notebooks')}
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-slate-500 sm:text-[14px]">
            {t('Each notebook keeps its own sources, questions and study material in one place.')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-navy px-5 text-[14px] font-bold text-white transition hover:bg-navy-2"
        >
          <Plus className="h-4 w-4" aria-hidden /> {t('New notebook')}
        </button>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-[360px]">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('Search your notebooks')}
            aria-label={t('Search your notebooks')}
            className="h-11 w-full rounded-full border border-line bg-white pl-11 pr-4 text-[14px] text-ink focus:border-navy focus:outline-none"
          />
        </div>
        <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4 text-[13px] font-semibold text-slate-600">
          {t('Sort')}
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
            aria-label={t('Sort notebooks')}
            className="bg-transparent text-[13px] font-bold text-navy focus:outline-none"
          >
            <option value="recent">{t('Recent')}</option>
            <option value="title">{t('Title')}</option>
          </select>
        </label>
      </div>

      {/* ── Featured ─────────────────────────────────────────────────────── */}
      {visibleFeatured.length > 0 ? (
        <section className="mt-8" aria-labelledby="featured-heading">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sun-dark" aria-hidden />
            <h2 id="featured-heading" className="text-[17px] font-extrabold text-navy">
              {t('Featured notebooks')}
            </h2>
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {t('Built from the curriculum. Make a copy to add your own notes.')}
          </p>

          <ul className="-mx-1 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scrollbar-none">
            {visibleFeatured.map((notebook) => (
              <li key={notebook.id} className="w-[250px] shrink-0 snap-start">
                <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-sun">
                  <Link
                    href={`/notebook/${notebook.id}`}
                    className="min-w-0 flex-1 rounded-xl focus-visible:outline-none"
                  >
                    <span aria-hidden className="text-2xl">
                      {notebook.emoji}
                    </span>
                    <h3 className="mt-2 line-clamp-2 text-[15px] font-bold text-navy">{notebook.title}</h3>
                    <p className="mt-1 text-[12.5px] text-slate-500">
                      {notebook.subject ? `${notebook.subject} · ` : ''}
                      {notebook.sourceCount === 1
                        ? t('1 source')
                        : `${notebook.sourceCount} ${t('sources')}`}
                    </p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onCopy(notebook)}
                    disabled={busyId === notebook.id}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-mist text-[13px] font-bold text-navy transition hover:bg-sun disabled:opacity-60"
                  >
                    {busyId === notebook.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Copy className="h-4 w-4" aria-hidden />
                    )}
                    {t('Make a copy')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── Mine ─────────────────────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="mine-heading">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-navy" aria-hidden />
          <h2 id="mine-heading" className="text-[17px] font-extrabold text-navy">
            {t('My notebooks')}
          </h2>
        </div>

        {loading ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('Loading your notebooks…')}
          </p>
        ) : visible.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-8 text-center">
            <p aria-hidden className="text-3xl">
              📓
            </p>
            <h3 className="mt-2 text-[17px] font-bold text-navy">
              {query ? t('Nothing matched that search') : t('Create your first notebook')}
            </h3>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13.5px] leading-relaxed text-slate-500">
              {query
                ? t('Try fewer letters, or clear the search.')
                : t('Add your notes, a photo of your book or a PDF, then ask questions about them.')}
            </p>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-bold text-navy transition hover:bg-mist"
              >
                <X className="h-4 w-4" aria-hidden /> {t('Clear search')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-sun px-5 text-sm font-bold text-navy transition hover:bg-sun-dark"
              >
                <Plus className="h-4 w-4" aria-hidden /> {t('Create your first notebook')}
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((notebook) => (
              <li key={notebook.id} className="relative">
                <div className="flex h-full flex-col rounded-2xl border border-line bg-white p-5 transition hover:border-sun">
                  <div className="flex items-start justify-between gap-2">
                    <span aria-hidden className="text-2xl">
                      {notebook.emoji}
                    </span>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={t('More options')}
                        aria-expanded={menuOpenFor === notebook.id}
                        onClick={() =>
                          setMenuOpenFor((current) => (current === notebook.id ? null : notebook.id))
                        }
                        className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-mist"
                      >
                        {busyId === notebook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <MoreVertical className="h-4 w-4" aria-hidden />
                        )}
                      </button>

                      {menuOpenFor === notebook.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void onRename(notebook)}
                            className="flex h-11 w-full items-center px-4 text-left text-[13.5px] font-semibold text-navy transition hover:bg-mist"
                          >
                            {t('Rename')}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => void onDelete(notebook)}
                            className="flex h-11 w-full items-center gap-2 px-4 text-left text-[13.5px] font-semibold text-red-700 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden /> {t('Delete')}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <Link href={`/notebook/${notebook.id}`} className="mt-2 min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[17px] font-extrabold text-navy">{notebook.title}</h3>
                    <p className="mt-1.5 text-[12.5px] text-slate-500">
                      {notebook.sourceCount === 1
                        ? t('1 source')
                        : `${notebook.sourceCount} ${t('sources')}`}
                      {' · '}
                      {formatDate(notebook.updatedAt)}
                    </p>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {creating ? (
        <NewNotebookDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => router.push(`/notebook/${id}`)}
        />
      ) : null}

      <AIChatbot context="Learner is reviewing their notebook collection." />
    </div>
  );
}

function NewNotebookDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const t = useUITranslation();
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = async (): Promise<void> => {
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { notebook } = await createNotebook({ title: title.trim(), emoji });
      onCreated(notebook.id);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t('Could not create the notebook.'));
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-notebook-title"
      className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4"
    >
      <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h2 id="new-notebook-title" className="text-[20px] font-extrabold text-navy">
            {t('New notebook')}
          </h2>
          <button
            type="button"
            aria-label={t('Close')}
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-mist"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <label htmlFor="notebook-title" className="mt-4 block text-[13px] font-bold text-navy">
          {t('What is it about?')}
        </label>
        <input
          id="notebook-title"
          ref={inputRef}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit();
          }}
          placeholder={t('For example: Biology revision')}
          className="mt-1.5 h-12 w-full rounded-xl border border-line px-4 text-[14px] text-ink focus:border-navy focus:outline-none"
        />

        <fieldset className="mt-4">
          <legend className="text-[13px] font-bold text-navy">{t('Pick an icon')}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                aria-pressed={emoji === choice}
                aria-label={choice}
                onClick={() => setEmoji(choice)}
                className="grid h-11 w-11 place-items-center rounded-xl border border-line text-xl transition aria-pressed:border-navy aria-pressed:bg-sun"
              >
                {choice}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-900">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || !title.trim()}
          className="mt-5 h-12 w-full rounded-xl bg-sun text-[15px] font-bold text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t('Creating…') : t('Create notebook')}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Check, FileText, Loader2, MessageSquare, Pencil, Sparkles } from 'lucide-react';
import AddSourceDialog from './AddSourceDialog';
import ChatPane from './ChatPane';
import SourceReader from './SourceReader';
import SourcesPane from './SourcesPane';
import StudioPane from './StudioPane';
import {
  deleteSource,
  listSources,
  loadNotebook,
  renameNotebook,
  retrySource,
  type NotebookDetail,
  type SourceSummary,
} from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';
import type { VoiceLang } from '@/types';

type Tab = 'sources' | 'chat' | 'studio';

/** While anything is still being read, poll so the chips go green on their own. */
const POLL_MS = 4000;

export default function NotebookWorkspace({ notebookId }: { notebookId: string }) {
  const t = useUITranslation();

  const [notebook, setNotebook] = useState<NotebookDetail | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('chat');
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reader, setReader] = useState<{ sourceId: string; chunkId?: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [notesVersion, setNotesVersion] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  /** Ticks every source that is ready, which is what a learner expects on open. */
  const selectReady = (list: SourceSummary[]): Set<string> =>
    new Set(list.filter((source) => source.status === 'ready').map((source) => source.id));

  useEffect(() => {
    let cancelled = false;
    void loadNotebook(notebookId)
      .then((result) => {
        if (cancelled) return;
        setNotebook(result.notebook);
        setSources(result.sources);
        setSelected(selectReady(result.sources));
        setTitleDraft(result.notebook.title);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : t('Could not open that notebook.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [notebookId, t]);

  const refreshSources = useCallback(async (): Promise<SourceSummary[] | null> => {
    try {
      const result = await listSources(notebookId);
      return result.sources;
    } catch {
      return null;
    }
  }, [notebookId]);

  const applySources = useCallback((list: SourceSummary[]): void => {
    setSources((current) => {
      // Tick anything that has just turned ready, leaving the learner's own
      // choices alone.
      const newlyReady = list.filter(
        (source) =>
          source.status === 'ready' &&
          current.find((entry) => entry.id === source.id)?.status !== 'ready',
      );
      if (newlyReady.length > 0) {
        setSelected((chosen) => {
          const next = new Set(chosen);
          for (const source of newlyReady) next.add(source.id);
          return next;
        });
      }
      return list;
    });
  }, []);

  // Poll only while something is unfinished, then stop.
  const pending = sources.some((source) => source.status === 'queued' || source.status === 'processing');
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void refreshSources().then((list) => {
        if (!cancelled && list) applySources(list);
      });
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [pending, refreshSources, applySources]);

  const reload = (): void => {
    void refreshSources().then((list) => {
      if (list) applySources(list);
    });
  };

  const toggle = (id: string): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelected((current) => (current.size === sources.length ? new Set() : selectReady(sources)));
  };

  const removeSource = async (id: string): Promise<void> => {
    setBusyId(id);
    try {
      await deleteSource(id);
      setSources((current) => current.filter((source) => source.id !== id));
      setSelected((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t('Could not remove that source.'));
    } finally {
      setBusyId(null);
    }
  };

  const retry = async (id: string): Promise<void> => {
    setBusyId(id);
    try {
      await retrySource(id);
      reload();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : t('Could not try that source again.'));
    } finally {
      setBusyId(null);
    }
  };

  const saveTitle = async (): Promise<void> => {
    if (!notebook || !titleDraft.trim() || titleDraft.trim() === notebook.title) {
      setRenaming(false);
      return;
    }
    try {
      await renameNotebook(notebook.id, { title: titleDraft.trim() });
      setNotebook({ ...notebook, title: titleDraft.trim() });
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : t('Could not save the change.'));
    } finally {
      setRenaming(false);
    }
  };

  const openCitation = (sourceId: string, chunkId: string): void => {
    setReader({ sourceId, chunkId });
  };

  const readyCount = sources.filter((source) => source.status === 'ready').length;

  if (loading) {
    return (
      <p className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        {t('Opening your notebook…')}
      </p>
    );
  }

  if (!notebook) {
    return (
      <div className="p-6">
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error || t('Could not open that notebook.')}</span>
        </p>
        <Link
          href="/notebook"
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-bold text-navy transition hover:bg-mist"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> {t('Back to your notebooks')}
        </Link>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof FileText; count?: number }[] = [
    { id: 'sources', label: t('Sources'), icon: FileText, count: sources.length },
    { id: 'chat', label: t('Chat'), icon: MessageSquare },
    { id: 'studio', label: t('Studio'), icon: Sparkles },
  ];

  return (
    <div className="flex h-[calc(100vh-150px)] min-h-[520px] flex-col lg:h-[calc(100vh-130px)]">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-2 border-b border-line px-1 pb-3">
        <Link
          href="/notebook"
          aria-label={t('Back to your notebooks')}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-mist hover:text-navy"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden />
        </Link>

        <span aria-hidden className="text-xl">
          {notebook.emoji}
        </span>

        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                ref={titleRef}
                value={titleDraft}
                autoFocus
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveTitle();
                  if (event.key === 'Escape') {
                    setTitleDraft(notebook.title);
                    setRenaming(false);
                  }
                }}
                aria-label={t('Notebook name')}
                className="h-11 min-w-0 flex-1 rounded-xl border border-line px-3 text-[16px] font-bold text-navy focus:border-navy focus:outline-none"
              />
              <button
                type="button"
                aria-label={t('Save')}
                onClick={() => void saveTitle()}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sun text-navy"
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
            </div>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-[17px] font-extrabold text-navy sm:text-[19px]">
                {notebook.title}
              </h1>
              {notebook.canEdit ? (
                <button
                  type="button"
                  aria-label={t('Rename this notebook')}
                  onClick={() => setRenaming(true)}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-mist hover:text-navy"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null}
            </div>
          )}
          <p className="truncate text-[12px] text-slate-500">
            {readyCount === 1 ? t('1 source ready') : `${readyCount} ${t('sources ready')}`}
            {notebook.isFeatured ? ` · ${t('Featured, read only')}` : ''}
          </p>
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => setError('')} className="shrink-0 font-bold underline">
            {t('Dismiss')}
          </button>
        </p>
      ) : null}

      {/* ── Panes ────────────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(0,25fr)_minmax(0,50fr)_minmax(0,25fr)] lg:gap-3 lg:pt-3">
        <section
          aria-label={t('Sources')}
          className={`h-full min-h-0 rounded-2xl border border-line bg-white lg:block ${
            tab === 'sources' ? 'block' : 'hidden'
          }`}
        >
          <SourcesPane
            sources={sources}
            selected={selected}
            canEdit={notebook.canEdit}
            loading={false}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onOpenReader={(sourceId) => setReader({ sourceId })}
            onAdd={() => setAdding(true)}
            onDelete={(id) => void removeSource(id)}
            onRetry={(id) => void retry(id)}
            busyId={busyId}
          />
        </section>

        <section
          aria-label={t('Chat')}
          className={`h-full min-h-0 rounded-2xl border border-line bg-white lg:block ${
            tab === 'chat' ? 'block' : 'hidden'
          }`}
        >
          <ChatPane
            notebookId={notebook.id}
            language={notebook.language as VoiceLang}
            sources={sources}
            selected={selected}
            onOpenCitation={openCitation}
            onNoteSaved={() => setNotesVersion((current) => current + 1)}
            pendingQuestion={pendingQuestion}
            onPendingQuestionUsed={() => setPendingQuestion(null)}
          />
        </section>

        <section
          aria-label={t('Studio')}
          className={`h-full min-h-0 rounded-2xl border border-line bg-white lg:block ${
            tab === 'studio' ? 'block' : 'hidden'
          }`}
        >
          <StudioPane
            notebookId={notebook.id}
            language={notebook.language}
            selected={selected}
            readySources={readyCount}
            notesVersion={notesVersion}
            onOpenCitation={openCitation}
            onAsk={(question) => {
              setPendingQuestion(question);
              setTab('chat');
            }}
          />
        </section>
      </div>

      {/* ── Phone tabs ───────────────────────────────────────────────────── */}
      <nav
        aria-label={t('Notebook sections')}
        className="mt-2 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-white p-1 lg:hidden"
      >
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            type="button"
            aria-selected={tab === id}
            role="tab"
            onClick={() => setTab(id)}
            className="flex h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11.5px] font-bold text-slate-600 transition aria-selected:bg-sun aria-selected:text-navy"
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {count !== undefined && count > 0 ? ` (${count})` : ''}
          </button>
        ))}
      </nav>

      {adding ? (
        <AddSourceDialog
          notebookId={notebook.id}
          onClose={() => setAdding(false)}
          onAdded={reload}
        />
      ) : null}

      {reader ? (
        <SourceReader
          // A new source means a new mount, so the panel never shows the
          // previous source's text while the next one loads.
          key={`${reader.sourceId}:${reader.chunkId ?? ''}`}
          sourceId={reader.sourceId}
          highlightChunkId={reader.chunkId}
          onClose={() => setReader(null)}
          onAsk={(question) => {
            setPendingQuestion(question);
            setTab('chat');
          }}
        />
      ) : null}
    </div>
  );
}

'use client';

import { AlertTriangle, CheckCircle2, FileText, Globe, Image as ImageIcon, Loader2, Mic, Plus, RotateCw, Trash2 } from 'lucide-react';
import type { SourceSummary } from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';
import type { SourceKind } from '@/types/notebook';

const KIND_ICON: Record<SourceKind, typeof FileText> = {
  pdf: FileText,
  docx: FileText,
  text: FileText,
  course: FileText,
  image: ImageIcon,
  url: Globe,
  audio: Mic,
};

interface Props {
  sources: SourceSummary[];
  selected: Set<string>;
  canEdit: boolean;
  loading: boolean;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onOpenReader: (sourceId: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  busyId: string | null;
}

/**
 * The Sources pane: what the notebook knows, and which of it the tutor may
 * use. Only ticked sources are sent to chat and Studio, which is the whole
 * point of the checkboxes.
 */
export default function SourcesPane({
  sources,
  selected,
  canEdit,
  loading,
  onToggle,
  onToggleAll,
  onOpenReader,
  onAdd,
  onDelete,
  onRetry,
  busyId,
}: Props) {
  const t = useUITranslation();
  const allSelected = sources.length > 0 && selected.size === sources.length;
  const readyCount = sources.filter((source) => source.status === 'ready').length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="text-[15px] font-extrabold text-navy">{t('Sources')}</h2>
        {canEdit ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex h-11 items-center gap-1.5 rounded-full bg-navy px-4 text-[13px] font-bold text-white transition hover:bg-navy-2"
          >
            <Plus className="h-4 w-4" aria-hidden /> {t('Add')}
          </button>
        ) : null}
      </div>

      {sources.length > 0 ? (
        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
          <label className="flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onToggleAll}
              className="h-4 w-4 accent-navy"
            />
            {t('Select all')}
          </label>
          <span className="text-[12px] text-slate-500">
            {selected.size} / {sources.length}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {loading ? (
          <p className="flex items-center gap-2 px-2 py-4 text-[13px] text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('Loading sources…')}
          </p>
        ) : sources.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p aria-hidden className="text-2xl">
              📄
            </p>
            <h3 className="mt-2 text-[14.5px] font-bold text-navy">{t('No sources yet')}</h3>
            <p className="mt-1 text-[12.5px] leading-relaxed text-slate-500">
              {t('Add a PDF, a photo of your notes, a web page or some typed text. The tutor answers only from what you add.')}
            </p>
            {canEdit ? (
              <button
                type="button"
                onClick={onAdd}
                className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-sun px-5 text-[13px] font-bold text-navy transition hover:bg-sun-dark"
              >
                <Plus className="h-4 w-4" aria-hidden /> {t('Add sources')}
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-1">
            {sources.map((source) => {
              const Icon = KIND_ICON[source.kind] ?? FileText;
              const isReady = source.status === 'ready';
              const isFailed = source.status === 'failed';
              const busy = busyId === source.id;

              return (
                <li key={source.id} className="rounded-xl px-2 py-1.5 transition hover:bg-mist">
                  <div className="flex items-start gap-2">
                    <label className="flex min-h-[44px] items-center pl-1 pr-1">
                      <input
                        type="checkbox"
                        checked={selected.has(source.id)}
                        disabled={!isReady}
                        onChange={() => onToggle(source.id)}
                        aria-label={`${t('Use this source')}: ${source.title}`}
                        className="h-4 w-4 accent-navy disabled:opacity-40"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => onOpenReader(source.id)}
                      className="min-w-0 flex-1 py-1.5 text-left"
                    >
                      <span className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
                        <span className="line-clamp-2 text-[13.5px] font-semibold text-navy">
                          {source.title}
                        </span>
                      </span>

                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-900">
                            <CheckCircle2 className="h-3 w-3" aria-hidden /> {t('Ready')}
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-900">
                            <AlertTriangle className="h-3 w-3" aria-hidden /> {t('Failed')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sun/30 px-2 py-0.5 text-[11px] font-bold text-navy">
                            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                            {source.status === 'queued' ? t('Waiting') : t('Reading…')}
                          </span>
                        )}
                        {source.guide?.keyTopics?.[0] ? (
                          <span className="truncate text-[11px] text-slate-500">
                            {source.guide.keyTopics.slice(0, 2).join(' · ')}
                          </span>
                        ) : null}
                      </span>

                      {isFailed && source.error ? (
                        <span className="mt-1 block text-[11.5px] leading-snug text-red-800">
                          {source.error}
                        </span>
                      ) : null}
                    </button>

                    {canEdit ? (
                      <span className="flex shrink-0 flex-col">
                        {isFailed ? (
                          <button
                            type="button"
                            aria-label={`${t('Try again')}: ${source.title}`}
                            onClick={() => onRetry(source.id)}
                            disabled={busy}
                            className="grid h-11 w-11 place-items-center rounded-xl text-slate-500 transition hover:bg-white hover:text-navy"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                            ) : (
                              <RotateCw className="h-4 w-4" aria-hidden />
                            )}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          aria-label={`${t('Remove')}: ${source.title}`}
                          onClick={() => onDelete(source.id)}
                          disabled={busy}
                          className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {sources.length > 0 && readyCount === 0 ? (
        <p className="border-t border-line px-4 py-3 text-[12px] leading-relaxed text-slate-500">
          {t('Your sources are still being read. You can ask questions as soon as one says Ready.')}
        </p>
      ) : null}
    </div>
  );
}

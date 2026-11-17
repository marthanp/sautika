'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { readSource, type SourceChunkView, type SourceSummary } from '@/lib/notebooks/client';
import { useUITranslation } from '@/lib/useUITranslation';

interface Props {
  sourceId: string;
  /** Scroll to and highlight this chunk, when a citation opened the reader. */
  highlightChunkId?: string;
  onClose: () => void;
  onAsk?: (question: string) => void;
}

/**
 * Reads one source, with its guide on top and the full text below.
 *
 * The text is rendered chunk by chunk, which is what makes "click a citation,
 * land on the passage" work: each chunk carries the id the citation names, so
 * the right one can be scrolled into view and highlighted.
 */
export default function SourceReader({ sourceId, highlightChunkId, onClose, onAsk }: Props) {
  const t = useUITranslation();
  const [source, setSource] = useState<SourceSummary | null>(null);
  const [chunks, setChunks] = useState<SourceChunkView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const highlightRef = useRef<HTMLParagraphElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // The parent keys this component by `sourceId`, so a different source gets a
  // fresh mount. That is why nothing is reset here: the effect only ever sets
  // state from a callback.
  useEffect(() => {
    let cancelled = false;

    void readSource(sourceId)
      .then((result) => {
        if (cancelled) return;
        setSource(result.source);
        setChunks(result.chunks);
      })
      .catch((readError: unknown) => {
        if (cancelled) return;
        setError(readError instanceof Error ? readError.message : t('Could not open that source.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sourceId, t]);

  // Scroll the cited passage into view once the text is on screen.
  useEffect(() => {
    if (loading || !highlightChunkId) return;
    const node = highlightRef.current;
    if (!node) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    node.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [loading, highlightChunkId, chunks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={source ? `${t('Source')}: ${source.title}` : t('Source')}
      className="fixed inset-0 z-40 flex flex-col bg-navy/50"
    >
      {/* Click-away on desktop; on a phone the panel fills the screen. */}
      <button
        type="button"
        aria-label={t('Close')}
        onClick={onClose}
        className="hidden flex-1 cursor-default lg:block"
      />

      <div className="flex min-h-0 flex-1 flex-col bg-white lg:absolute lg:bottom-0 lg:right-0 lg:top-0 lg:w-[min(620px,88vw)] lg:border-l lg:border-line">
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('Source')}
            </p>
            <h2 className="line-clamp-2 text-[16px] font-extrabold text-navy">
              {source?.title ?? t('Loading…')}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t('Close')}
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-mist"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="flex items-center gap-2 text-[13px] text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('Opening the source…')}
            </p>
          ) : error ? (
            <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-[13px] text-red-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          ) : (
            <>
              {source?.guide ? (
                <section className="rounded-2xl bg-mist p-4">
                  <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-navy">
                    {t('Source guide')}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink">{source.guide.summary}</p>

                  {source.guide.keyTopics.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {source.guide.keyTopics.map((topic) => (
                        <li
                          key={topic}
                          className="rounded-full bg-white px-2.5 py-1 text-[12px] font-semibold text-navy"
                        >
                          {topic}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {source.guide.suggestedQuestions.length > 0 && onAsk ? (
                    <div className="mt-3">
                      <p className="text-[12px] font-bold text-slate-600">{t('Try asking')}</p>
                      <ul className="mt-1.5 space-y-1.5">
                        {source.guide.suggestedQuestions.map((question) => (
                          <li key={question}>
                            <button
                              type="button"
                              onClick={() => {
                                onAsk(question);
                                onClose();
                              }}
                              className="min-h-[44px] w-full rounded-xl bg-white px-3 py-2 text-left text-[13px] font-semibold text-navy transition hover:bg-sun"
                            >
                              {question}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {chunks.length === 0 ? (
                <p className="mt-4 text-[13px] leading-relaxed text-slate-500">
                  {source?.status === 'ready'
                    ? t('This source has no readable text.')
                    : t('This source is still being read. Come back in a moment.')}
                </p>
              ) : (
                <article className="mt-4 space-y-3">
                  {chunks.map((chunk) => {
                    const highlighted = chunk.id === highlightChunkId;
                    return (
                      <p
                        key={chunk.id}
                        ref={highlighted ? highlightRef : undefined}
                        // 65 characters is the dyslexia-friendly line length.
                        className={`max-w-[65ch] whitespace-pre-line text-[14.5px] leading-[1.7] ${
                          highlighted
                            ? 'rounded-xl bg-sun/30 px-3 py-2 text-ink ring-2 ring-sun'
                            : 'text-slate-700'
                        }`}
                      >
                        {chunk.page !== undefined ? (
                          <span className="mr-2 align-top text-[11px] font-bold text-slate-400">
                            {t('p.')}
                            {chunk.page}
                          </span>
                        ) : null}
                        {chunk.text}
                      </p>
                    );
                  })}
                </article>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

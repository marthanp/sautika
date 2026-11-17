'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Pause, Play, RotateCw, SkipForward } from 'lucide-react';
import { useUITranslation } from '@/lib/useUITranslation';
import type {
  AudioOverviewPayload,
  DataTablePayload,
  FlashcardsPayload,
  InfographicPayload,
  MindMapNode,
  MindMapPayload,
  QuizPayload,
  ReportPayload,
  SlideDeckPayload,
  StudioPayload,
  VideoOverviewPayload,
} from '@/lib/studio/types';

/**
 * Renders a finished Studio output.
 *
 * One component per kind, chosen on `payload.kind`. Each one is a real view of
 * the data rather than a JSON dump: a flashcard flips, a table sorts and
 * exports, a mind map pans, a deck presents, an overview plays.
 *
 * Animations use transform and opacity only, and are switched off under
 * `prefers-reduced-motion` by the `motion-reduce` utilities.
 */

interface Props {
  payload: StudioPayload;
  /** Opens the passage a citation points at. */
  onOpenCitation?: (sourceId: string, chunkId: string) => void;
  onAsk?: (question: string) => void;
}

export default function StudioOutputView({ payload, onOpenCitation, onAsk }: Props) {
  switch (payload.kind) {
    case 'report':
      return <ReportView payload={payload} onOpenCitation={onOpenCitation} />;
    case 'flashcards':
      return <FlashcardsView payload={payload} />;
    case 'quiz':
      return <QuizView payload={payload} />;
    case 'mind_map':
      return <MindMapView payload={payload} onAsk={onAsk} />;
    case 'infographic':
      return <InfographicView payload={payload} />;
    case 'data_table':
      return <DataTableView payload={payload} />;
    case 'slide_deck':
      return <SlideDeckView payload={payload} />;
    case 'audio_overview':
      return <AudioOverviewView payload={payload} />;
    case 'video_overview':
      return <VideoOverviewView payload={payload} />;
    default:
      return null;
  }
}

/** Renders the `[n]` markers in generated text as buttons. */
function withCitations(
  text: string,
  citations: ReportPayload['citations'],
  onOpen?: (sourceId: string, chunkId: string) => void,
): React.ReactNode[] {
  return text.split(/(\[\d{1,2}\])/g).map((part, index) => {
    const match = /^\[(\d{1,2})\]$/.exec(part);
    if (!match) return <span key={index}>{part}</span>;

    const n = Number(match[1]);
    const citation = citations.find((entry) => entry.n === n);
    if (!citation || !onOpen) {
      return (
        <sup key={index} className="mx-0.5 text-[10px] font-bold text-slate-400">
          {n}
        </sup>
      );
    }
    return (
      <button
        key={index}
        type="button"
        onClick={() => onOpen(citation.sourceId, citation.chunkId)}
        title={citation.quote}
        aria-label={`Open source ${n}`}
        className="mx-0.5 inline-flex min-w-[20px] items-center justify-center rounded bg-sun/40 px-1 align-super text-[10px] font-bold text-navy transition hover:bg-sun"
      >
        {n}
      </button>
    );
  });
}

// ── Report ──────────────────────────────────────────────────────────────────

/** Enough Markdown for what the generators actually produce. */
function ReportView({
  payload,
  onOpenCitation,
}: {
  payload: ReportPayload;
  onOpenCitation?: (sourceId: string, chunkId: string) => void;
}) {
  const blocks = payload.markdown.split(/\n{2,}/);

  return (
    <article className="max-w-[65ch] space-y-3">
      {blocks.map((block, index) => {
        const heading = /^(#{2,4})\s+(.*)$/.exec(block.trim());
        if (heading) {
          const level = heading[1].length;
          const text = heading[2];
          return level <= 2 ? (
            <h3 key={index} className="pt-2 text-[15px] font-extrabold text-navy">
              {text}
            </h3>
          ) : (
            <h4 key={index} className="pt-1 text-[13.5px] font-bold text-navy">
              {text}
            </h4>
          );
        }

        const lines = block.split('\n');
        if (lines.every((line) => /^\s*([-*]|\d+\.)\s+/.test(line))) {
          return (
            <ul key={index} className="space-y-1.5 pl-5">
              {lines.map((line, position) => (
                <li
                  key={position}
                  className="list-disc text-[13.5px] leading-[1.7] text-slate-700"
                >
                  {withCitations(
                    line.replace(/^\s*([-*]|\d+\.)\s+/, ''),
                    payload.citations,
                    onOpenCitation,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className="text-[13.5px] leading-[1.7] text-slate-700">
            {withCitations(block, payload.citations, onOpenCitation)}
          </p>
        );
      })}
    </article>
  );
}

// ── Flashcards ──────────────────────────────────────────────────────────────

function FlashcardsView({ payload }: { payload: FlashcardsPayload }) {
  const t = useUITranslation();
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  /** Cards the learner did not know, so they come round again. */
  const [again, setAgain] = useState<number[]>([]);
  const [knew, setKnew] = useState(0);

  const card = payload.cards[index];
  const done = index >= payload.cards.length;

  const next = (remembered: boolean): void => {
    if (remembered) setKnew((current) => current + 1);
    else setAgain((current) => [...current, index]);
    setShowBack(false);
    setIndex((current) => current + 1);
  };

  if (done) {
    return (
      <div className="py-4 text-center">
        <p aria-hidden className="text-3xl">
          {again.length === 0 ? '🎉' : '👍'}
        </p>
        <p className="mt-2 text-[15px] font-bold text-navy">
          {knew} / {payload.cards.length} {t('remembered')}
        </p>
        {again.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setIndex(again[0]);
              setAgain([]);
              setShowBack(false);
            }}
            className="mt-3 inline-flex h-11 items-center gap-2 rounded-full bg-sun px-5 text-[13.5px] font-bold text-navy"
          >
            <RotateCw className="h-4 w-4" aria-hidden /> {t('Practise the hard ones')}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] font-semibold text-slate-500">
        {index + 1} / {payload.cards.length}
      </p>

      <button
        type="button"
        onClick={() => setShowBack((current) => !current)}
        aria-label={showBack ? t('Show the question') : t('Show the answer')}
        className="mt-2 min-h-[140px] w-full rounded-2xl border border-line bg-white p-5 text-left transition-transform duration-200 motion-reduce:transition-none hover:scale-[1.01]"
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {showBack ? t('Answer') : t('Question')}
        </p>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed text-ink">
          {showBack ? card.back : card.front}
        </p>
        {!showBack ? (
          <p className="mt-3 text-[12px] text-slate-500">{t('Tap to see the answer')}</p>
        ) : null}
      </button>

      {showBack ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => next(false)}
            className="h-11 flex-1 rounded-xl border border-line bg-white text-[13px] font-bold text-navy transition hover:bg-mist"
          >
            {t('Again')}
          </button>
          <button
            type="button"
            onClick={() => next(true)}
            className="h-11 flex-1 rounded-xl bg-sun text-[13px] font-bold text-navy transition hover:bg-sun-dark"
          >
            {t('I knew it')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Quiz ────────────────────────────────────────────────────────────────────

/** The same question always shuffles the same way, so options never jump. */
function seededShuffle<T>(values: T[], seed: string): T[] {
  let state = 7;
  for (let index = 0; index < seed.length; index += 1) {
    state = (state * 31 + seed.charCodeAt(index)) & 0x7fffffff;
  }
  const out = [...values];
  for (let index = out.length - 1; index > 0; index -= 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const swap = state % (index + 1);
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

function QuizView({ payload }: { payload: QuizPayload }) {
  const t = useUITranslation();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const question = payload.questions[index];
  const options = useMemo(
    () => (question ? seededShuffle([question.a, ...question.d], question.q) : []),
    [question],
  );

  if (!question) {
    return (
      <div className="py-4 text-center">
        <p aria-hidden className="text-3xl">
          🏁
        </p>
        <p className="mt-2 text-[15px] font-bold text-navy">
          {score} / {payload.questions.length}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] font-semibold text-slate-500">
        {index + 1} / {payload.questions.length}
      </p>
      <p className="mt-2 text-[14.5px] font-bold leading-relaxed text-navy">{question.q}</p>

      <ul className="mt-3 space-y-2">
        {options.map((option) => {
          const isAnswer = option === question.a;
          const chosen = picked === option;
          const state = picked === null ? 'idle' : isAnswer ? 'right' : chosen ? 'wrong' : 'dim';

          return (
            <li key={option}>
              <button
                type="button"
                disabled={picked !== null}
                onClick={() => {
                  setPicked(option);
                  if (isAnswer) setScore((current) => current + 1);
                }}
                className={`min-h-[44px] w-full rounded-xl border px-4 py-2.5 text-left text-[13.5px] font-semibold transition ${
                  state === 'right'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : state === 'wrong'
                      ? 'border-red-300 bg-red-50 text-red-900'
                      : state === 'dim'
                        ? 'border-line bg-white text-slate-400'
                        : 'border-line bg-white text-navy hover:border-sun hover:bg-sun/20'
                }`}
              >
                {option}
              </button>
            </li>
          );
        })}
      </ul>

      {picked !== null ? (
        <div className="mt-3 rounded-xl bg-mist p-3">
          <p className="text-[13px] leading-relaxed text-ink">{question.e}</p>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setIndex((current) => current + 1);
            }}
            className="mt-3 h-11 w-full rounded-xl bg-navy text-[13px] font-bold text-white"
          >
            {index + 1 === payload.questions.length ? t('See my score') : t('Next question')}
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── Mind map ────────────────────────────────────────────────────────────────

function MindMapBranch({
  node,
  depth,
  onAsk,
}: {
  node: MindMapNode;
  depth: number;
  onAsk?: (question: string) => void;
}) {
  const t = useUITranslation();
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = Boolean(node.children?.length);

  return (
    <li>
      <div className="flex items-start gap-1">
        {hasChildren ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? t('Collapse') : t('Expand')}
            onClick={() => setOpen((current) => !current)}
            className="grid h-11 w-7 shrink-0 place-items-center text-slate-500"
          >
            {open ? (
              <ChevronDown className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronRight className="h-4 w-4" aria-hidden />
            )}
          </button>
        ) : (
          <span aria-hidden className="w-7" />
        )}

        <button
          type="button"
          onClick={() => onAsk?.(`${t('Tell me more about')} ${node.label}`)}
          className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-left transition hover:bg-sun/20 ${
            depth === 0 ? 'text-[15px] font-extrabold text-navy' : 'text-[13.5px] font-semibold text-ink'
          }`}
        >
          {node.label}
          {node.sourceRefs?.length ? (
            <span className="ml-1.5 align-super text-[10px] font-bold text-slate-400">
              {node.sourceRefs.join(',')}
            </span>
          ) : null}
        </button>
      </div>

      {hasChildren && open ? (
        <ul className="ml-4 border-l border-line pl-2">
          {node.children?.map((child, index) => (
            <MindMapBranch key={`${child.label}-${index}`} node={child} depth={depth + 1} onAsk={onAsk} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function MindMapView({
  payload,
  onAsk,
}: {
  payload: MindMapPayload;
  onAsk?: (question: string) => void;
}) {
  const t = useUITranslation();
  return (
    <div>
      <p className="mb-2 text-[12px] text-slate-500">{t('Tap a branch to ask about it.')}</p>
      <ul>
        <MindMapBranch node={payload.root} depth={0} onAsk={onAsk} />
      </ul>
    </div>
  );
}

// ── Infographic ─────────────────────────────────────────────────────────────

function InfographicView({ payload }: { payload: InfographicPayload }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 print:border-0">
      <h3 className="text-[17px] font-extrabold text-navy">{payload.title}</h3>
      {payload.subtitle ? (
        <p className="mt-1 text-[13px] text-slate-600">{payload.subtitle}</p>
      ) : null}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {payload.facts.map((fact) => (
          <li key={fact.label} className="rounded-xl bg-mist p-3">
            <p className="text-[20px] font-extrabold leading-tight text-navy">{fact.value}</p>
            <p className="mt-1 text-[12.5px] leading-snug text-slate-600">{fact.label}</p>
          </li>
        ))}
      </ul>

      {payload.steps?.length ? (
        <ol className="mt-4 space-y-2">
          {payload.steps.map((step, index) => (
            <li key={step} className="flex gap-2 text-[13px] leading-relaxed text-slate-700">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sun text-[11px] font-bold text-navy">
                {index + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

// ── Data table ──────────────────────────────────────────────────────────────

function DataTableView({ payload }: { payload: DataTablePayload }) {
  const t = useUITranslation();
  const [sort, setSort] = useState<{ column: number; direction: 1 | -1 } | null>(null);

  const rows = useMemo(() => {
    if (!sort) return payload.rows;
    return [...payload.rows].sort((a, b) => {
      const left = a[sort.column] ?? '';
      const right = b[sort.column] ?? '';
      const numeric = Number(left.replace(/[^\d.-]/g, '')) - Number(right.replace(/[^\d.-]/g, ''));
      // Sort numerically when both cells really are numbers.
      if (Number.isFinite(numeric) && /\d/.test(left) && /\d/.test(right)) {
        return numeric * sort.direction;
      }
      return left.localeCompare(right) * sort.direction;
    });
  }, [payload.rows, sort]);

  const downloadCsv = (): void => {
    const escape = (cell: string): string =>
      /[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
    const csv = [payload.columns, ...rows].map((row) => row.map(escape).join(',')).join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${payload.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'table'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-navy">{payload.title}</h3>
        <button
          type="button"
          onClick={downloadCsv}
          className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-bold text-navy transition hover:bg-mist"
        >
          <Download className="h-4 w-4" aria-hidden /> {t('CSV')}
        </button>
      </div>

      <div className="mt-2 -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr>
              {payload.columns.map((column, index) => (
                <th key={column} scope="col" className="border-b border-line p-0">
                  <button
                    type="button"
                    onClick={() =>
                      setSort((current) =>
                        current?.column === index
                          ? { column: index, direction: current.direction === 1 ? -1 : 1 }
                          : { column: index, direction: 1 },
                      )
                    }
                    aria-label={`${t('Sort by')} ${column}`}
                    className="flex min-h-[44px] w-full items-center gap-1 px-2 text-[12px] font-bold text-navy"
                  >
                    {column}
                    {sort?.column === index ? (
                      <span aria-hidden>{sort.direction === 1 ? '▲' : '▼'}</span>
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="odd:bg-mist/50">
                {row.map((cell, position) => (
                  <td key={position} className="px-2 py-2 text-[12.5px] leading-snug text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Slides ──────────────────────────────────────────────────────────────────

function SlideDeckView({ payload }: { payload: SlideDeckPayload }) {
  const t = useUITranslation();
  const [index, setIndex] = useState(0);
  const slide = payload.slides[index];

  return (
    <div>
      <h3 className="text-[14px] font-extrabold text-navy">{payload.title}</h3>

      <div className="mt-2 rounded-2xl border border-line bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {index + 1} / {payload.slides.length}
        </p>
        <h4 className="mt-1 text-[16px] font-extrabold text-navy">{slide.title}</h4>
        <ul className="mt-3 space-y-2 pl-5">
          {slide.bullets.map((bullet) => (
            <li key={bullet} className="list-disc text-[13.5px] leading-relaxed text-slate-700">
              {bullet}
            </li>
          ))}
        </ul>
        {slide.notes ? (
          <p className="mt-3 border-t border-line pt-2 text-[12px] italic leading-relaxed text-slate-500">
            {t('Say')}: {slide.notes}
          </p>
        ) : null}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
          className="h-11 flex-1 rounded-xl border border-line bg-white text-[13px] font-bold text-navy disabled:opacity-40"
        >
          {t('Back')}
        </button>
        <button
          type="button"
          onClick={() => setIndex((current) => Math.min(payload.slides.length - 1, current + 1))}
          disabled={index >= payload.slides.length - 1}
          className="h-11 flex-1 rounded-xl bg-sun text-[13px] font-bold text-navy disabled:opacity-40"
        >
          {t('Next')}
        </button>
      </div>
    </div>
  );
}

// ── Audio and video overviews ───────────────────────────────────────────────

/** Plays a dialogue in order, highlighting the line being spoken. */
function useDialoguePlayer(lines: { text: string; audioUrl?: string }[]) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(-1);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const stop = (): void => {
    audio?.pause();
    setAudio(null);
    setPlaying(false);
    setCurrent(-1);
  };

  const playFrom = (start: number): void => {
    audio?.pause();

    const playable = lines
      .map((line, index) => ({ line, index }))
      .filter((entry) => entry.line.audioUrl && entry.index >= start);

    if (playable.length === 0) return;
    setPlaying(true);

    let position = 0;
    const step = (): void => {
      if (position >= playable.length) {
        setPlaying(false);
        setCurrent(-1);
        return;
      }
      const entry = playable[position];
      setCurrent(entry.index);
      const element = new Audio(entry.line.audioUrl);
      element.onended = () => {
        position += 1;
        step();
      };
      // One silent line should not end the whole overview.
      element.onerror = () => {
        position += 1;
        step();
      };
      setAudio(element);
      void element.play().catch(() => {
        position += 1;
        step();
      });
    };
    step();
  };

  return { playing, current, playFrom, stop };
}

function AudioOverviewView({ payload }: { payload: AudioOverviewPayload }) {
  const t = useUITranslation();
  const { playing, current, playFrom, stop } = useDialoguePlayer(payload.lines);
  const hasAudio = payload.lines.some((line) => line.audioUrl);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-navy">{payload.title}</h3>
        {hasAudio ? (
          <button
            type="button"
            onClick={() => (playing ? stop() : playFrom(0))}
            className="flex h-11 items-center gap-1.5 rounded-full bg-sun px-4 text-[13px] font-bold text-navy"
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {playing ? t('Pause') : t('Play')}
          </button>
        ) : null}
      </div>

      {!hasAudio ? (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          {t('The voices could not be recorded, but you can still read the conversation.')}
        </p>
      ) : null}

      <ol className="mt-3 space-y-2">
        {payload.lines.map((line, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => (line.audioUrl ? playFrom(index) : undefined)}
              className={`w-full rounded-xl px-3 py-2 text-left transition ${
                current === index ? 'bg-sun/30 ring-1 ring-sun' : 'hover:bg-mist'
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {line.speaker === 'teacher' ? t('Teacher') : t('Student')}
              </span>
              <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink">
                {line.text}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function VideoOverviewView({ payload }: { payload: VideoOverviewPayload }) {
  const t = useUITranslation();
  const { playing, current, playFrom, stop } = useDialoguePlayer(payload.lines);
  const slideIndex = Math.max(0, Math.min(payload.slides.length - 1, current === -1 ? 0 : current));
  const slide = payload.slides[slideIndex];
  const hasAudio = payload.lines.some((line) => line.audioUrl);

  return (
    <div>
      <h3 className="text-[14px] font-extrabold text-navy">{payload.title}</h3>

      {/* Narrated slides: the deck is the picture, the dialogue the voice. */}
      <div className="mt-2 aspect-video w-full overflow-hidden rounded-2xl border border-line bg-navy p-4 text-white">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-sun">
          {slideIndex + 1} / {payload.slides.length}
        </p>
        <h4 className="mt-1 text-[15px] font-extrabold">{slide?.title}</h4>
        <ul className="mt-2 space-y-1 pl-4">
          {slide?.bullets.slice(0, 4).map((bullet) => (
            <li key={bullet} className="list-disc text-[12.5px] leading-snug text-white/90">
              {bullet}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => (playing ? stop() : playFrom(0))}
          disabled={!hasAudio}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-sun text-[13px] font-bold text-navy disabled:opacity-40"
        >
          {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
          {playing ? t('Pause') : t('Play')}
        </button>
        <button
          type="button"
          onClick={() => playFrom(slideIndex + 1)}
          disabled={!hasAudio || slideIndex >= payload.slides.length - 1}
          className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-4 text-[13px] font-bold text-navy disabled:opacity-40"
        >
          <SkipForward className="h-4 w-4" aria-hidden /> {t('Next')}
        </button>
      </div>

      {!hasAudio ? (
        <p className="mt-2 text-[12px] leading-relaxed text-slate-500">
          {t('The narration could not be recorded, but you can still read the slides.')}
        </p>
      ) : null}
    </div>
  );
}

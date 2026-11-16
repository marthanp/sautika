'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Square,
  Volume2,
  Wand2,
} from 'lucide-react';
import { splitCitations, stripCitations } from '@/lib/notebooks/citations';
import {
  loadChat,
  saveNote,
  streamChat,
  type ChatMessageView,
  type SourceSummary,
} from '@/lib/notebooks/client';
import { useVoice } from '@/hooks/useVoice';
import { useUITranslation } from '@/lib/useUITranslation';
import type { Citation } from '@/types/notebook';
import type { VoiceLang } from '@/types';

interface Props {
  notebookId: string;
  language: VoiceLang;
  sources: SourceSummary[];
  selected: Set<string>;
  onOpenCitation: (sourceId: string, chunkId: string) => void;
  onNoteSaved: () => void;
  /** A question handed over from a source guide's suggestions. */
  pendingQuestion: string | null;
  onPendingQuestionUsed: () => void;
}

interface PendingReply {
  text: string;
  citations: Citation[];
  provider?: string;
  stage: string;
}

/** Opening prompts, so an empty notebook is not an empty box. */
const STARTERS = [
  'Summarise these sources in simple words',
  'What are the key points I should revise?',
  'Make 3 questions to test me',
];

export default function ChatPane({
  notebookId,
  language,
  sources,
  selected,
  onOpenCitation,
  onNoteSaved,
  pendingQuestion,
  onPendingQuestionUsed,
}: Props) {
  const t = useUITranslation();
  const { recording, processing, toggleMic, speak } = useVoice();

  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<PendingReply | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const readyCount = sources.filter((source) => source.status === 'ready').length;
  const selectedCount = selected.size;

  useEffect(() => {
    let cancelled = false;
    void loadChat(notebookId)
      .then((result) => {
        if (!cancelled) setMessages(result.messages);
      })
      .catch(() => {
        // An empty conversation is the normal case; nothing to report.
      });
    return () => {
      cancelled = true;
    };
  }, [notebookId]);

  // Keep the newest message in view as tokens arrive.
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  const ask = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      if (selectedCount === 0) {
        setError(t('Tick at least one source first, so the tutor knows what to read.'));
        return;
      }

      setError('');
      setQuestion('');
      setMessages((current) => [
        ...current,
        {
          id: `local-${Date.now()}`,
          role: 'user',
          content: trimmed,
          language,
          citations: [],
          createdAt: new Date().toISOString(),
        },
      ]);
      setPending({ text: '', citations: [], stage: 'retrieving' });

      const controller = new AbortController();
      abortRef.current = controller;

      await streamChat(
        notebookId,
        { question: trimmed, sourceIds: [...selected], language },
        {
          onStatus: (status) => {
            setPending((current) =>
              current ? { ...current, stage: status.stage, provider: status.provider } : current,
            );
          },
          onToken: (token) => {
            setPending((current) => (current ? { ...current, text: current.text + token } : current));
          },
          onCitation: (citation) => {
            setPending((current) =>
              current && !current.citations.some((entry) => entry.n === citation.n)
                ? { ...current, citations: [...current.citations, citation] }
                : current,
            );
          },
          onDone: (result) => {
            setPending(null);
            setMessages((current) => [
              ...current,
              {
                id: `reply-${Date.now()}`,
                role: 'assistant',
                content: result.answer,
                language,
                citations: result.citations,
                provider: result.provider,
                createdAt: new Date().toISOString(),
              },
            ]);
          },
          onError: (message) => {
            setPending(null);
            setError(message);
          },
        },
        controller.signal,
      );

      abortRef.current = null;
    },
    [language, notebookId, pending, selected, selectedCount, t],
  );

  // A suggested question handed over from a source guide. Asking is deferred
  // to a timer so the effect body itself does not set state, which would
  // cascade a render while the reader is still closing.
  useEffect(() => {
    if (!pendingQuestion) return;
    const question = pendingQuestion;
    const timer = window.setTimeout(() => {
      onPendingQuestionUsed();
      void ask(question);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pendingQuestion, onPendingQuestionUsed, ask]);

  const stop = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(null);
  };

  const copy = async (message: ChatMessageView): Promise<void> => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError(t('Your browser would not let us copy that.'));
    }
  };

  const keep = async (message: ChatMessageView): Promise<void> => {
    try {
      await saveNote(notebookId, { body: message.content, origin: 'saved_reply' });
      setSavedId(message.id);
      onNoteSaved();
      window.setTimeout(() => setSavedId(null), 2000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('Could not save the note.'));
    }
  };

  const simpler = (message: ChatMessageView): void => {
    void ask(
      `${t('Say this again in simpler words, keeping the citations:')} "${stripCitations(message.content).slice(0, 400)}"`,
    );
  };

  /** Renders `[2]` as a button that opens the passage it points at. */
  const withCitations = (message: ChatMessageView): ReactNode[] =>
    splitCitations(message.content).map((part, index) => {
      if (part.kind !== 'citation') return <span key={index}>{part.text}</span>;

      const citation = message.citations.find((entry) => entry.n === part.n);
      if (!citation) {
        return (
          <sup key={index} className="mx-0.5 text-[10px] font-bold text-slate-400">
            {part.n}
          </sup>
        );
      }

      return (
        <button
          key={index}
          type="button"
          onClick={() => onOpenCitation(citation.sourceId, citation.chunkId)}
          title={citation.quote}
          aria-label={`${t('Open source')} ${part.n}`}
          className="mx-0.5 inline-flex min-w-[20px] items-center justify-center rounded bg-sun/40 px-1 align-super text-[10px] font-bold text-navy transition hover:bg-sun"
        >
          {part.n}
        </button>
      );
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={Boolean(pending)}
      >
        {messages.length === 0 && !pending ? (
          <div className="mx-auto max-w-[52ch] py-6 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-sun-dark" aria-hidden />
            <h2 className="mt-3 text-[18px] font-extrabold text-navy">
              {readyCount === 0 ? t('Add a source to begin') : t('Ask about your sources')}
            </h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500">
              {readyCount === 0
                ? t('Once a source says Ready, you can ask questions and every answer will point back to it.')
                : t('Every answer cites the passage it came from, so you can check it.')}
            </p>

            {readyCount > 0 ? (
              <ul className="mt-5 space-y-2">
                {STARTERS.map((starter) => (
                  <li key={starter}>
                    <button
                      type="button"
                      onClick={() => void ask(t(starter))}
                      className="min-h-[44px] w-full rounded-xl border border-line bg-white px-4 py-2.5 text-left text-[13.5px] font-semibold text-navy transition hover:border-sun hover:bg-sun/20"
                    >
                      {t(starter)}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <ul className="mx-auto max-w-[70ch] space-y-4">
          {messages.map((message) =>
            message.role === 'user' ? (
              <li key={message.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-navy px-4 py-2.5 text-[14.5px] leading-relaxed text-white">
                  {message.content}
                </p>
              </li>
            ) : (
              <li key={message.id}>
                <div className="rounded-2xl rounded-bl-md bg-mist px-4 py-3">
                  <p className="max-w-[65ch] whitespace-pre-line text-[14.5px] leading-[1.7] text-ink">
                    {withCitations(message)}
                  </p>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void keep(message)}
                    className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-mist hover:text-navy"
                  >
                    {savedId === message.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                    ) : null}
                    {savedId === message.id ? t('Saved') : t('Save to note')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(message)}
                    className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-mist hover:text-navy"
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden />
                    ) : (
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {copiedId === message.id ? t('Copied') : t('Copy')}
                  </button>
                  <button
                    type="button"
                    onClick={() => void speak(stripCitations(message.content), language)}
                    className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-mist hover:text-navy"
                  >
                    <Volume2 className="h-3.5 w-3.5" aria-hidden /> {t('Read aloud')}
                  </button>
                  <button
                    type="button"
                    onClick={() => simpler(message)}
                    className="flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-mist hover:text-navy"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden /> {t('Simpler')}
                  </button>
                </div>
              </li>
            ),
          )}

          {pending ? (
            <li>
              <div className="rounded-2xl rounded-bl-md bg-mist px-4 py-3">
                {pending.text ? (
                  <p className="max-w-[65ch] whitespace-pre-line text-[14.5px] leading-[1.7] text-ink">
                    {pending.text}
                  </p>
                ) : (
                  <p className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-600">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {pending.stage === 'retrieving'
                      ? t('Looking through your sources…')
                      : pending.stage === 'answering'
                        ? t('Writing the answer…')
                        : t('Thinking…')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={stop}
                className="mt-1.5 flex h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-slate-600 transition hover:bg-mist hover:text-navy"
              >
                <Square className="h-3.5 w-3.5" aria-hidden /> {t('Stop')}
              </button>
            </li>
          ) : null}
        </ul>
      </div>

      {error ? (
        <p
          role="alert"
          className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12.5px] leading-relaxed text-amber-950"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}

      <div className="border-t border-line bg-white px-3 py-3">
        <div className="mx-auto flex max-w-[70ch] items-end gap-2">
          <button
            type="button"
            aria-label={recording ? t('Stop recording') : t('Ask with your voice')}
            aria-pressed={recording}
            onClick={() =>
              void toggleMic(
                language,
                (text) => setQuestion((current) => (current ? `${current} ${text}` : text)),
                (message) => setError(message),
              )
            }
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line text-navy transition hover:bg-mist aria-pressed:bg-sun"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <Mic className={`h-5 w-5 ${recording ? 'animate-pulse' : ''}`} aria-hidden />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <label htmlFor="notebook-question" className="sr-only">
              {t('Your question')}
            </label>
            <textarea
              id="notebook-question"
              ref={composerRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void ask(question);
                }
              }}
              rows={1}
              placeholder={t('Ask about your sources…')}
              className="max-h-[120px] min-h-[48px] w-full resize-y rounded-xl border border-line px-4 py-3 text-[14.5px] leading-relaxed text-ink focus:border-navy focus:outline-none"
            />
            <p className="mt-1 text-[11.5px] text-slate-500">
              {selectedCount === 0
                ? t('No sources ticked')
                : selectedCount === 1
                  ? t('1 source')
                  : `${selectedCount} ${t('sources')}`}
              {' · '}
              {t('Enter sends, Shift+Enter adds a line')}
            </p>
          </div>

          <button
            type="button"
            aria-label={t('Send')}
            onClick={() => void ask(question)}
            disabled={!question.trim() || Boolean(pending)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-sun text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

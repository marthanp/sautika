'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bot,
  Loader2,
  Mic,
  Send,
  Volume2,
  X,
  MessageSquare,
  Square,
} from 'lucide-react';
import { useVoice } from '@/hooks/useVoice';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';
import type { VoiceLang } from '@/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface PendingReply {
  text: string;
  stage: string;
}

interface AIChatbotProps {
  /** Optional context string to include with messages (e.g., current course/lesson info). */
  context?: string;
}

/**
 * Streams a chat request to `/api/chat` and calls the provided callbacks as
 * Server-Sent Events arrive.
 */
async function streamChat(
  message: string,
  language: string,
  history: { role: string; content: string }[],
  callbacks: {
    onStatus: (status: { stage: string; provider?: string }) => void;
    onToken: (token: string) => void;
    onDone: (result: { answer: string; provider?: string; translated?: boolean }) => void;
    onError: (message: string) => void;
  },
  signal?: AbortSignal,
): Promise<void> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language, history }),
      signal,
    });

    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      callbacks.onError(j?.error ?? 'Something went wrong. Please try again.');
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      callbacks.onError('Could not read the response.');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let eventType = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith('data: ') && eventType) {
          try {
            const data = JSON.parse(line.slice(6));
            switch (eventType) {
              case 'status':
                callbacks.onStatus(data);
                break;
              case 'token':
                callbacks.onToken(data.text);
                break;
              case 'done':
                callbacks.onDone(data);
                break;
              case 'error':
                callbacks.onError(data.error);
                break;
            }
          } catch {
            // Ignore malformed SSE lines
          }
          eventType = '';
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) return;
    callbacks.onError(error instanceof Error ? error.message : 'Connection lost. Please try again.');
  }
}

/** Floating AI chatbot widget for the Notebook and Learning pages. */
export default function AIChatbot({ context }: AIChatbotProps) {
  const t = useUITranslation();
  const { recording, processing, speaking, toggleMic, speak, stopSpeaking } = useVoice();
  const dialect = useApp((state) => state.dialect) as VoiceLang;
  const readAloudRate = useApp((state) => state.readAloudRate);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState<PendingReply | null>(null);
  const [error, setError] = useState('');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, pending]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      setError('');
      setInput('');

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmed,
      };
      setMessages((current) => [...current, userMessage]);
      setPending({ text: '', stage: 'thinking' });

      const controller = new AbortController();
      abortRef.current = controller;

      // Build history from last 8 messages
      const historyForApi = messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const messageWithContext = context
        ? `[Context: ${context}]\n\n${trimmed}`
        : trimmed;

      await streamChat(
        messageWithContext,
        dialect,
        historyForApi,
        {
          onStatus: (status) => {
            setPending((current) =>
              current ? { ...current, stage: status.stage } : current,
            );
          },
          onToken: (token) => {
            setPending((current) =>
              current ? { ...current, text: current.text + token } : current,
            );
          },
          onDone: (result) => {
            setPending(null);
            setMessages((current) => [
              ...current,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.answer,
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
    [context, dialect, messages, pending],
  );

  const stop = (): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPending(null);
  };

  const readAloud = (message: ChatMessage): void => {
    if (speaking && speakingId === message.id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(message.id);
    void speak(message.content, dialect, { rate: readAloudRate }).then(() => {
      setSpeakingId(null);
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('Open AI Chat')}
          className="fixed bottom-20 right-5 sm:bottom-22 sm:right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-sun to-amber-500 px-4 py-2.5 text-navy font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
        >
          <Bot className="h-5 w-5" />
          <span className="text-xs sm:text-[13px]">{t('Ask Sautika')}</span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-20 right-5 sm:bottom-22 sm:right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl dark:border-white/10 dark:bg-navy-2 sm:h-[560px] sm:w-[400px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-sun/20 to-amber-50 px-4 py-3 dark:border-white/10 dark:from-sun/10 dark:to-navy-2">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-sun/30 dark:bg-sun/20">
                <Bot className="h-4 w-4 text-navy dark:text-sun" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy dark:text-white">
                  {t('Sautika AI')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Ask me anything about your lessons')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t('Close chat')}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
            aria-live="polite"
            aria-busy={Boolean(pending)}
          >
            {messages.length === 0 && !pending ? (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-sun/20">
                  <Bot className="h-6 w-6 text-sun-dark" />
                </div>
                <h4 className="mt-3 text-sm font-bold text-navy dark:text-white">
                  {t('Hello! I\'m Sautika AI')}
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('I can help you understand your lessons, answer questions, and explain concepts. Try asking me something!')}
                </p>
                <div className="mt-4 grid w-full gap-2">
                  {[
                    t('Help me understand this topic'),
                    t('Give me practice questions'),
                    t('Explain in simpler words'),
                  ].map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => void ask(starter)}
                      className="rounded-xl border border-line bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:border-sun hover:bg-sun/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-sun dark:hover:bg-sun/10"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <ul className="space-y-3">
              {messages.map((msg) =>
                msg.role === 'user' ? (
                  <li key={msg.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3 py-2 text-[13px] leading-relaxed text-white dark:bg-blue-900">
                      {msg.content}
                    </p>
                  </li>
                ) : (
                  <li key={msg.id}>
                    <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-mist px-3 py-2.5 dark:bg-white/5">
                      <p className="whitespace-pre-line text-[13px] leading-[1.65] text-ink dark:text-slate-200">
                        {msg.content}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => readAloud(msg)}
                        aria-label={
                          speaking && speakingId === msg.id
                            ? t('Stop reading')
                            : t('Read aloud')
                        }
                        className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-500 transition hover:bg-mist hover:text-navy dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                      >
                        {speaking && speakingId === msg.id ? (
                          <Square className="h-3 w-3" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        {speaking && speakingId === msg.id
                          ? t('Stop')
                          : t('Listen')}
                      </button>
                    </div>
                  </li>
                ),
              )}

              {pending ? (
                <li>
                  <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-mist px-3 py-2.5 dark:bg-white/5">
                    {pending.text ? (
                      <p className="whitespace-pre-line text-[13px] leading-[1.65] text-ink dark:text-slate-200">
                        {pending.text}
                      </p>
                    ) : (
                      <p className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <Loader2
                          className="h-3.5 w-3.5 animate-spin"
                          aria-hidden
                        />
                        {pending.stage === 'thinking'
                          ? t('Thinking…')
                          : t('Writing the answer…')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={stop}
                    className="mt-1 flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-slate-500 transition hover:bg-mist hover:text-navy dark:text-slate-400 dark:hover:bg-white/5"
                  >
                    <Square className="h-3 w-3" aria-hidden /> {t('Stop')}
                  </button>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Error */}
          {error ? (
            <p
              role="alert"
              className="mx-3 mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}

          {/* Composer */}
          <div className="border-t border-line bg-white px-3 py-2.5 dark:border-white/10 dark:bg-navy-2">
            <div className="flex items-end gap-2">
              {/* Mic button */}
              <button
                type="button"
                aria-label={
                  recording ? t('Stop recording') : t('Speak your question')
                }
                aria-pressed={recording}
                onClick={() =>
                  void toggleMic(
                    dialect,
                    (text) => {
                      setInput('');
                      void ask(text);
                    },
                    (message) => setError(message),
                  )
                }
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border text-navy transition dark:text-white ${
                  recording
                    ? 'border-sun bg-sun/30 dark:border-sun dark:bg-sun/20'
                    : 'border-line hover:bg-mist dark:border-white/10 dark:hover:bg-white/5'
                }`}
              >
                {processing ? (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden
                  />
                ) : (
                  <Mic
                    className={`h-4 w-4 ${recording ? 'animate-pulse text-red-500' : ''}`}
                    aria-hidden
                  />
                )}
              </button>

              {/* Text input */}
              <div className="min-w-0 flex-1">
                <label htmlFor="ai-chat-input" className="sr-only">
                  {t('Your message')}
                </label>
                <textarea
                  id="ai-chat-input"
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void ask(input);
                    }
                  }}
                  rows={1}
                  placeholder={t('Ask Sautika anything…')}
                  className="max-h-[80px] min-h-[40px] w-full resize-none rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] leading-relaxed text-ink placeholder:text-slate-400 focus:border-navy focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-sun"
                />
              </div>

              {/* Send button */}
              <button
                type="button"
                aria-label={t('Send')}
                onClick={() => void ask(input)}
                disabled={!input.trim() || Boolean(pending)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sun text-navy transition hover:bg-sun-dark disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

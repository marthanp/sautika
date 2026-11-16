'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Volume2,
  Pause,
  Play,
  Square,
  SkipForward,
  SkipBack,
} from 'lucide-react';
import { useApp } from '@/store/useApp';
import { useUITranslation } from '@/lib/useUITranslation';
import { triggerFeedback } from '@/lib/feedback';

interface TextChunk {
  text: string;
  element: HTMLElement | null;
}

const BROWSER_LANG_MAP: Record<string, string> = {
  eng: 'en-GB',
  swa: 'sw-KE',
  lug: 'lg-UG',
  ach: 'ach-UG',
  teo: 'teo-UG',
  nyn: 'nyn-UG',
  luo: 'luo-KE',
  kik: 'ki-KE',
  kin: 'rw-RW',
  ibo: 'ig-NG',
  yor: 'yo-NG',
  hau: 'ha-NG',
  zul: 'zu-ZA',
  xho: 'xh-ZA',
  afr: 'af-ZA',
  som: 'so-SO',
  amh: 'am-ET',
  fra: 'fr-FR',
  por: 'pt-PT',
};

export default function PageAudioReader() {
  const pathname = usePathname();
  const dialect = useApp((state) => state.dialect || 'eng');
  const t = useUITranslation();

  const [status, setStatus] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [hasVoiceSupport, setHasVoiceSupport] = useState(true);

  const activeIndexRef = useRef(0);
  const chunksRef = useRef<TextChunk[]>([]);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);

  // Sync refs for reliable async callbacks
  activeIndexRef.current = currentIndex;
  chunksRef.current = chunks;
  isPlayingRef.current = status === 'playing';
  speedRef.current = speed;

  // Check voice synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setHasVoiceSupport(false);
    }
  }, []);

  // Clear visual highlights on page
  const clearHighlights = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.sautika-reading-highlight').forEach((el) => {
      el.classList.remove('sautika-reading-highlight');
    });
  }, []);

  // Highlight a specific element
  const highlightElement = useCallback((element: HTMLElement | null) => {
    clearHighlights();
    if (!element) return;
    element.classList.add('sautika-reading-highlight');
    try {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {
      // scrollIntoView fallback
    }
  }, [clearHighlights]);

  // Stop reading cleanly
  const stopReading = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    clearHighlights();
    setStatus('idle');
    setChunks([]);
    setCurrentIndex(0);
  }, [clearHighlights]);

  // Cancel and reset on route/page change
  useEffect(() => {
    stopReading();
  }, [pathname, stopReading]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      clearHighlights();
    };
  }, [clearHighlights]);

  // Find the best voice matching dialect
  const getVoice = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    const targetLang = (BROWSER_LANG_MAP[dialect] || 'en-GB').toLowerCase();
    const targetPrefix = targetLang.split('-')[0];

    // 1. Exact match
    const exact = voices.find((v) => v.lang.toLowerCase() === targetLang);
    if (exact) return exact;

    // 2. Prefix match
    const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(targetPrefix));
    if (prefix) return prefix;

    // 3. English regional match
    const en = voices.find(
      (v) =>
        v.lang.toLowerCase().startsWith('en') &&
        (v.lang.includes('GB') || v.lang.includes('KE') || v.lang.includes('US')),
    );
    if (en) return en;

    return voices[0] || null;
  }, [dialect]);

  // Speak a specific chunk index
  const speakChunk = useCallback(
    (index: number, chunkList: TextChunk[]) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (index < 0 || index >= chunkList.length) {
        stopReading();
        return;
      }

      window.speechSynthesis.cancel();
      const current = chunkList[index];
      highlightElement(current.element);
      setCurrentIndex(index);
      setStatus('playing');

      const utterance = new SpeechSynthesisUtterance(current.text);
      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = BROWSER_LANG_MAP[dialect] || 'en-GB';
      }
      utterance.rate = speedRef.current;

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const nextIndex = index + 1;
        if (nextIndex < chunkList.length) {
          speakChunk(nextIndex, chunkList);
        } else {
          stopReading();
          triggerFeedback('success');
        }
      };

      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') return;
        const nextIndex = index + 1;
        if (nextIndex < chunkList.length) {
          speakChunk(nextIndex, chunkList);
        } else {
          stopReading();
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [dialect, getVoice, highlightElement, stopReading],
  );

  // Extract readable chunks from the current page
  const extractPageChunks = useCallback((): TextChunk[] => {
    if (typeof document === 'undefined') return [];

    // Check user text selection first (allows listening to any selected paragraph)
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 2) {
      return [{ text: selection, element: null }];
    }

    const main = document.querySelector('main');
    if (!main) return [];

    const elements = main.querySelectorAll<HTMLElement>(
      'h1, h2, h3, h4, p, li, blockquote, [data-readable="true"]',
    );

    const result: TextChunk[] = [];
    const seen = new Set<string>();

    elements.forEach((el) => {
      // Ignore audio reader itself, floating widgets, dialogs, sr-only, hidden elements
      if (
        el.closest('[data-audio-ignore="true"]') ||
        el.closest('aside[aria-label="Quick Dialect Switcher"]') ||
        el.closest('.sr-only') ||
        el.getAttribute('aria-hidden') === 'true'
      ) {
        return;
      }

      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return;
      }

      const raw = (el.textContent || '').trim().replace(/\s+/g, ' ');
      // Filter out tiny snippets, symbols, or duplicates
      if (raw.length < 3 || seen.has(raw)) return;
      seen.add(raw);

      // Split into sentence-length chunks (up to ~180 chars)
      const sentences = raw.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [raw];
      sentences.forEach((sentence) => {
        const s = sentence.trim();
        if (s.length > 2) {
          result.push({ text: s, element: el });
        }
      });
    });

    return result;
  }, []);

  // Handle start reading
  const handleStart = () => {
    triggerFeedback('chip');
    const pageChunks = extractPageChunks();
    if (pageChunks.length === 0) return;

    setChunks(pageChunks);
    speakChunk(0, pageChunks);
  };

  // Handle pause / resume
  const handlePauseResume = () => {
    triggerFeedback('chip');
    if (status === 'playing') {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setStatus('paused');
    } else if (status === 'paused') {
      speakChunk(activeIndexRef.current, chunksRef.current);
    }
  };

  // Next / Prev chunk
  const handleNext = () => {
    triggerFeedback('chip');
    const nextIdx = activeIndexRef.current + 1;
    if (nextIdx < chunksRef.current.length) {
      speakChunk(nextIdx, chunksRef.current);
    }
  };

  const handlePrev = () => {
    triggerFeedback('chip');
    const prevIdx = Math.max(0, activeIndexRef.current - 1);
    speakChunk(prevIdx, chunksRef.current);
  };

  // Cycle speed
  const toggleSpeed = () => {
    triggerFeedback('chip');
    const nextSpeed = speed === 1 ? 1.25 : speed === 1.25 ? 0.85 : 1;
    setSpeed(nextSpeed);
    speedRef.current = nextSpeed;
    if (status === 'playing') {
      speakChunk(activeIndexRef.current, chunksRef.current);
    }
  };

  const handleStop = () => {
    triggerFeedback('record-stop');
    stopReading();
  };

  if (!hasVoiceSupport) return null;

  return (
    <div data-audio-ignore="true" className="relative z-20 flex items-center">
      {status === 'idle' ? (
        <button
          type="button"
          onClick={handleStart}
          aria-label={t('Listen to page')}
          title={t('Listen to page content')}
          className="group flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-[0_4px_16px_rgba(0,23,49,0.08)] backdrop-blur-md transition-all duration-200 hover:border-sun hover:shadow-[0_6px_20px_rgba(255,196,0,0.2)] hover:scale-[1.02] active:scale-95 dark:border-white/15 dark:bg-navy-2/95 dark:text-white dark:hover:border-sun"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-sun/20 text-navy group-hover:bg-sun dark:text-sun dark:group-hover:text-navy transition-colors">
            <Volume2 className="h-3 w-3" />
          </span>
          <span className="tracking-tight">{t('Listen to page')}</span>
        </button>
      ) : (
        <div
          role="region"
          aria-label={t('Page audio player')}
          className="flex items-center gap-1.5 rounded-full border border-sun/60 bg-white/98 px-3 py-1.5 text-xs font-bold text-slate-800 shadow-md backdrop-blur-md dark:border-sun/50 dark:bg-navy-2/98 dark:text-white animate-kinetic-entry sm:gap-2"
        >
          {/* Animated sound wave bars */}
          <span className="flex items-end gap-0.5 h-3.5 pr-0.5 text-sun" aria-hidden="true">
            <span
              className={`w-0.5 rounded-full bg-sun transition-all duration-300 ${
                status === 'playing' ? 'h-3 animate-pulse' : 'h-1.5'
              }`}
            />
            <span
              className={`w-0.5 rounded-full bg-sun transition-all duration-300 ${
                status === 'playing' ? 'h-3.5 animate-bounce' : 'h-2'
              }`}
              style={{ animationDuration: '650ms' }}
            />
            <span
              className={`w-0.5 rounded-full bg-sun transition-all duration-300 ${
                status === 'playing' ? 'h-2 animate-pulse' : 'h-1'
              }`}
              style={{ animationDuration: '800ms' }}
            />
          </span>

          {/* Status text */}
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            {status === 'paused' ? t('Paused') : t('Reading')} ({currentIndex + 1}/{chunks.length})
          </span>

          {/* Previous */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex <= 0}
            aria-label={t('Previous sentence')}
            title={t('Previous sentence')}
            className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <SkipBack className="h-3 w-3" />
          </button>

          {/* Pause / Resume */}
          <button
            type="button"
            onClick={handlePauseResume}
            aria-label={status === 'paused' ? t('Resume reading') : t('Pause reading')}
            title={status === 'paused' ? t('Resume reading') : t('Pause reading')}
            className="grid h-6 w-6 place-items-center rounded-full bg-sun text-navy hover:bg-sun-dark transition-colors shadow-xs"
          >
            {status === 'paused' ? (
              <Play className="h-3 w-3 fill-navy" />
            ) : (
              <Pause className="h-3 w-3 fill-navy" />
            )}
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={handleNext}
            disabled={currentIndex >= chunks.length - 1}
            aria-label={t('Next sentence')}
            title={t('Next sentence')}
            className="grid h-6 w-6 place-items-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-navy disabled:opacity-30 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <SkipForward className="h-3 w-3" />
          </button>

          {/* Speed control */}
          <button
            type="button"
            onClick={toggleSpeed}
            aria-label={t('Change playback speed')}
            title={`${speed}x speed`}
            className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            {speed}x
          </button>

          {/* Stop */}
          <button
            type="button"
            onClick={handleStop}
            aria-label={t('Stop reading')}
            title={t('Stop reading')}
            className="grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
          >
            <Square className="h-2.5 w-2.5 fill-current" />
          </button>
        </div>
      )}
    </div>
  );
}

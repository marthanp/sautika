'use client';
/**
 * useUITranslation — lightweight UI translation hook for Sautika.
 *
 * Usage:
 *   const t = useUITranslation();
 *   <h1>{t('Study Hub')}</h1>
 *
 * - Returns the English string immediately (no flash).
 * - When dialect !== 'eng', silently fetches a translation and swaps in.
 * - Results are cached in memory so repeated calls are instant.
 * - Falls back to English on any error.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/useApp';

// ── Module-level caches so the data survives re-renders ─────────────────────
// cache[dialectCode][englishString] = translatedString
const cache: Record<string, Record<string, string>> = {};
// Pending promises to prevent duplicate inflight requests
const inflight: Record<string, Record<string, Promise<string>>> = {};

async function fetchTranslation(text: string, targetLang: string): Promise<string> {
  if (targetLang === 'eng') return text;

  cache[targetLang] ??= {};
  inflight[targetLang] ??= {};

  const cached = cache[targetLang][text];
  if (cached !== undefined) return cached;

  if (text in inflight[targetLang]) return inflight[targetLang][text];

  const promise = (async () => {
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: 'eng', targetLanguage: targetLang }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      const translated = res.ok && data.text ? data.text : text;
      cache[targetLang][text] = translated;
      return translated;
    } catch {
      cache[targetLang][text] = text; // fall back to English
      return text;
    } finally {
      delete inflight[targetLang][text];
    }
  })();

  inflight[targetLang][text] = promise;
  return promise;
}

/**
 * Returns a translation function `t(englishString)` that returns a string.
 * The returned value starts as English and reactively updates once the
 * translation from Sunbird AI arrives.
 */
export function useUITranslation(): (english: string) => string {
  const dialect = useApp((s) => s.dialect);
  // Map of english → translated for the current dialect in this component
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const dialectRef = useRef(dialect);
  dialectRef.current = dialect;

  // Queue of strings that have been requested via t() during this render
  const requested = useRef<Set<string>>(new Set());

  // After each render, kick off any pending translation requests
  useEffect(() => {
    if (dialect === 'eng' || requested.current.size === 0) return;
    const strings = [...requested.current];
    requested.current = new Set();

    void Promise.all(
      strings.map(async (text) => {
        const result = await fetchTranslation(text, dialect);
        return { text, result };
      })
    ).then((results) => {
      // Only apply if dialect hasn't changed during the fetch
      if (dialectRef.current !== dialect) return;
      setTranslations((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const { text, result } of results) {
          if (next[text] !== result) { next[text] = result; changed = true; }
        }
        return changed ? next : prev;
      });
    });
  });

  // Reset translations when dialect changes
  useEffect(() => {
    setTranslations({});
    requested.current = new Set();
  }, [dialect]);

  const t = useCallback(
    (english: string): string => {
      if (dialect === 'eng') return english;
      const hit = translations[english];
      if (hit !== undefined) return hit;
      // Check module cache synchronously (available from prior renders / other components)
      const moduleHit = cache[dialect]?.[english];
      if (moduleHit !== undefined) return moduleHit;
      // Schedule fetch
      requested.current.add(english);
      return english; // Return English while loading
    },
    [dialect, translations]
  );

  return t;
}

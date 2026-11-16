'use client';
/**
 * useUITranslation: interface translation for Sautika.
 *
 *   const t = useUITranslation();
 *   <h1>{t('Study Hub')}</h1>
 *
 * - English renders immediately, so there is never a blank flash.
 * - Misses are queued and sent as one batched request per language, not one per label.
 * - The cache is mirrored to localStorage, so a learner's chosen language still
 *   shows while they are offline.
 * - Any failure falls back to the English string.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useApp } from '@/store/useApp';

const STORAGE_KEY = 'sautika-ui-translations-v1';
const FLUSH_DELAY_MS = 30;
const CHUNK_SIZE = 40;
const SAVE_DEBOUNCE_MS = 500;
const MAX_STORED_ENTRIES = 4000;

// cache[languageCode][englishString] = translatedString
const cache: Record<string, Record<string, string>> = {};
// Strings waiting to be sent, per language.
const queued: Record<string, Set<string>> = {};
// Strings already in flight, so a re-render does not ask for them twice.
const inflight: Record<string, Set<string>> = {};

const listeners = new Set<() => void>();
let version = 0;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let loadedFromStorage = false;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): number {
  return version;
}

function getServerSnapshot(): number {
  return 0;
}

function publish(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function loadFromStorage(): void {
  if (loadedFromStorage || typeof window === 'undefined') return;
  loadedFromStorage = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return;
    let restored = 0;
    for (const [language, entries] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof entries !== 'object' || entries === null) continue;
      cache[language] ??= {};
      for (const [english, translated] of Object.entries(entries as Record<string, unknown>)) {
        if (typeof translated !== 'string') continue;
        cache[language][english] = translated;
        restored += 1;
      }
    }
    if (restored > 0) publish();
  } catch {
    // A private window, cleared site data or a quota error: carry on in memory.
  }
}

function scheduleSave(): void {
  if (typeof window === 'undefined') return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      let budget = MAX_STORED_ENTRIES;
      const payload: Record<string, Record<string, string>> = {};
      for (const [language, entries] of Object.entries(cache)) {
        if (budget <= 0) break;
        const slice = Object.entries(entries).slice(0, budget);
        if (slice.length === 0) continue;
        payload[language] = Object.fromEntries(slice);
        budget -= slice.length;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage is full or blocked; the in-memory cache still works.
    }
  }, SAVE_DEBOUNCE_MS);
}

function enqueue(language: string, text: string): void {
  queued[language] ??= new Set();
  inflight[language] ??= new Set();
  if (inflight[language].has(text)) return;
  queued[language].add(text);

  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, FLUSH_DELAY_MS);
}

async function flush(): Promise<void> {
  const work: { language: string; texts: string[] }[] = [];
  for (const [language, set] of Object.entries(queued)) {
    if (set.size === 0) continue;
    const texts = [...set];
    set.clear();
    inflight[language] ??= new Set();
    for (const text of texts) inflight[language].add(text);
    work.push({ language, texts });
  }
  if (work.length === 0) return;

  let changed = false;

  for (const { language, texts } of work) {
    for (let index = 0; index < texts.length; index += CHUNK_SIZE) {
      const chunk = texts.slice(index, index + CHUNK_SIZE);
      cache[language] ??= {};
      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            texts: chunk,
            sourceLanguage: 'eng',
            targetLanguage: language,
          }),
        });
        const data = (await res.json()) as { texts?: unknown };
        const translated = Array.isArray(data.texts) ? data.texts : [];
        chunk.forEach((text, position) => {
          const value = translated[position];
          cache[language][text] = typeof value === 'string' && value ? value : text;
          changed = true;
        });
      } catch {
        // Remember the English fallback so we do not retry on every render.
        for (const text of chunk) {
          cache[language][text] = text;
          changed = true;
        }
      } finally {
        for (const text of chunk) inflight[language]?.delete(text);
      }
    }
  }

  if (changed) {
    publish();
    scheduleSave();
  }
}

/**
 * Returns `t(english)`, which gives the translated label once it has arrived and
 * the English original until then.
 */
export function useUITranslation(): (english: string) => string {
  const dialect = useApp((state) => state.dialect);
  // Subscribing to the shared cache keeps every component in step without
  // each one holding its own copy of the translations.
  const cacheVersion = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Read the saved cache after mount, so the server and client render the same
  // first pass and the learner's language reappears offline.
  useEffect(() => {
    loadFromStorage();
  }, []);

  return useCallback(
    (english: string): string => {
      if (dialect === 'eng' || !english) return english;
      void cacheVersion;
      const hit = cache[dialect]?.[english];
      if (hit !== undefined) return hit;
      enqueue(dialect, english);
      return english;
    },
    [dialect, cacheVersion],
  );
}

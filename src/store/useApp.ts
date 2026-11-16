import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, Theme, DyslexiaFont, DyslexiaSpacing, DyslexiaLineHeight, ReadingTint, VoiceLang } from '@/types';
import type { Note } from '@/data/catalog';

/**
 * A note the learner saved while the save to `/api/account` was failing.
 * It is persisted with the rest of the store, so it survives a refresh and a
 * closed tab, and `LearnerDataSync` flushes the queue once the network returns.
 */
export interface PendingNote {
  note: Note;
  /** Epoch ms, so the queue stays in the order the learner wrote them. */
  queuedAt: number;
  /** Number of failed flush attempts, used to stop retrying a note the server rejects. */
  attempts: number;
}

/** A note the server keeps refusing is not worth retrying forever. */
export const MAX_PENDING_ATTEMPTS = 6;

interface AppState {
  xp: number; streak: number; lastDay: string; enrolled: string[]; done: Record<string, number>;
  activeCourse: string | null; tab: Tab; theme: Theme; colorMode: 'light' | 'dark'; scale: string; wide: boolean;
  font: DyslexiaFont; letterSpacing: DyslexiaSpacing; lineHeight: DyslexiaLineHeight; readingTint: ReadingTint;
  sidebarHidden: boolean;
  /** Notes waiting to reach the server. Never shown as saved without a badge. */
  pendingNotes: PendingNote[];
  /** Selected UI dialect. 'eng' = English (default). Changes translate the UI via Sunbird AI. */
  dialect: VoiceLang;
  queueNote: (note: Note) => void;
  dropPendingNote: (id: string | number) => void;
  markPendingAttempt: (id: string | number) => void;
  toggleSidebar: () => void;
  setSidebarHidden: (hidden: boolean) => void;
  setDialect: (dialect: VoiceLang) => void;
  touchStreak: () => void;
  startCourse: (id: string) => void;
  completeLesson: (courseId: string | undefined, index: number | undefined, xp: number) => void;
  setTab: (t: Tab) => void;
  setPrefs: (p: Partial<Pick<AppState, 'theme' | 'colorMode' | 'scale' | 'wide' | 'font' | 'letterSpacing' | 'lineHeight' | 'readingTint' | 'sidebarHidden' | 'dialect'>>) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 0, streak: 1, lastDay: '', enrolled: [], done: {}, activeCourse: null, tab: 'courses',
      theme: 'navy', colorMode: 'light', scale: '100%', wide: false,
      font: 'default', letterSpacing: 'normal', lineHeight: 'normal', readingTint: 'none',
      sidebarHidden: false,
      pendingNotes: [],
      dialect: 'eng',
      queueNote: (note) => set((s) => (
        s.pendingNotes.some((entry) => String(entry.note.id) === String(note.id))
          ? s
          : { pendingNotes: [...s.pendingNotes, { note, queuedAt: Date.now(), attempts: 0 }] }
      )),
      dropPendingNote: (id) => set((s) => ({
        pendingNotes: s.pendingNotes.filter((entry) => String(entry.note.id) !== String(id)),
      })),
      markPendingAttempt: (id) => set((s) => ({
        pendingNotes: s.pendingNotes
          .map((entry) => (String(entry.note.id) === String(id) ? { ...entry, attempts: entry.attempts + 1 } : entry))
          .filter((entry) => entry.attempts < MAX_PENDING_ATTEMPTS),
      })),
      toggleSidebar: () => set((s) => ({ sidebarHidden: !s.sidebarHidden })),
      setSidebarHidden: (sidebarHidden) => set({ sidebarHidden }),
      setDialect: (dialect) => set({ dialect }),
      touchStreak: () => {
        const today = new Date().toDateString();
        const { lastDay, streak } = get();
        if (lastDay === today) return;
        const yesterday = new Date(Date.now() - 864e5).toDateString();
        set({ streak: lastDay === yesterday ? streak + 1 : 1, lastDay: today });
      },
      startCourse: (id) => set((s) => ({ activeCourse: id, tab: 'learn', enrolled: s.enrolled.includes(id) ? s.enrolled : [...s.enrolled, id] })),
      completeLesson: (courseId, index, xp) => set((s) => ({
        xp: s.xp + xp,
        done: courseId && index !== undefined && (s.done[courseId] ?? 0) === index ? { ...s.done, [courseId]: index + 1 } : s.done,
      })),
      setTab: (tab) => set({ tab }),
      setPrefs: (p) => set(p),
    }),
    { name: 'sautika-app' },
  ),
);

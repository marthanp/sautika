import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tab, Theme, DyslexiaFont, DyslexiaSpacing, DyslexiaLineHeight, ReadingTint } from '@/types';

interface AppState {
  xp: number; streak: number; lastDay: string; enrolled: string[]; done: Record<string, number>;
  activeCourse: string | null; tab: Tab; theme: Theme; colorMode: 'light' | 'dark'; scale: string; wide: boolean;
  font: DyslexiaFont; letterSpacing: DyslexiaSpacing; lineHeight: DyslexiaLineHeight; readingTint: ReadingTint;
  touchStreak: () => void;
  startCourse: (id: string) => void;
  completeLesson: (courseId: string | undefined, index: number | undefined, xp: number) => void;
  setTab: (t: Tab) => void;
  setPrefs: (p: Partial<Pick<AppState, 'theme' | 'colorMode' | 'scale' | 'wide' | 'font' | 'letterSpacing' | 'lineHeight' | 'readingTint'>>) => void;
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 0, streak: 1, lastDay: '', enrolled: [], done: {}, activeCourse: null, tab: 'courses',
      theme: 'navy', colorMode: 'light', scale: '100%', wide: false,
      font: 'default', letterSpacing: 'normal', lineHeight: 'normal', readingTint: 'none',
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

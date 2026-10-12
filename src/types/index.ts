export type Category = 'Science' | 'Math' | 'Languages' | 'Digital Literacy' | 'Social Studies';
export type LevelGroup =
  | 'Baby class to top class'
  | 'P.1 to P.4'
  | 'P.5 to P.7'
  | 'S.1 to S.4'
  | 'S.5 to S.6';
export type Item =
  | { k: 'm'; q: string; a: string; d: [string, string] }
  | { k: 'b'; q: string; a: string; x: string[] };
export interface Lesson { title: string; items: Item[] }
export interface Course {
  id: string; cat: Category; title: string; emoji: string; color: string; level: string;
  levelGroup?: LevelGroup; author?: string; sourceUrl?: string; description?: string;
  ttsLang?: string; lessons: Lesson[];
}
export interface Source { id: string; userId: string; name: string; text: string; on: boolean }
export type Theme = 'navy' | 'parchment' | 'contrast';
export type DyslexiaFont = 'default' | 'opendyslexic' | 'lexend' | 'atkinson' | 'comic-neue';
export type DyslexiaSpacing = 'normal' | 'relaxed' | 'wide';
export type DyslexiaLineHeight = 'normal' | 'relaxed' | 'loose';
export type ReadingTint = 'none' | 'cream' | 'yellow' | 'peach' | 'mint' | 'blue';
export type Tab = 'courses' | 'learn' | 'notebook';
export type VoiceLang = 'en' | 'swa' | 'lug';
export interface Session { title: string; items: Item[]; courseId?: string; lessonIndex?: number; ttsLang?: string }

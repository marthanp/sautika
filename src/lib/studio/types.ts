import type { Citation, StudioType } from '@/types/notebook';

/** What each Studio output stores in `payload`. */

export interface ReportPayload {
  kind: 'report';
  template: 'study_guide' | 'briefing' | 'revision_sheet' | 'explain_simply';
  title: string;
  /** Markdown, with `[n]` citation markers kept. */
  markdown: string;
  citations: Citation[];
}

export interface Flashcard {
  front: string;
  back: string;
  /** The `[n]` the card came from. */
  n?: number;
}

export interface FlashcardsPayload {
  kind: 'flashcards';
  cards: Flashcard[];
}

export interface QuizQuestion {
  q: string;
  a: string;
  d: [string, string];
  e: string;
}

export interface QuizPayload {
  kind: 'quiz';
  difficulty: 'easy' | 'normal' | 'hard';
  questions: QuizQuestion[];
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
  /** Citation numbers supporting this branch. */
  sourceRefs?: number[];
}

export interface MindMapPayload {
  kind: 'mind_map';
  root: MindMapNode;
}

export interface InfographicPayload {
  kind: 'infographic';
  title: string;
  subtitle?: string;
  facts: { label: string; value: string; n?: number }[];
  /** An ordered process, when the sources describe one. */
  steps?: string[];
}

export interface DataTablePayload {
  kind: 'data_table';
  title: string;
  columns: string[];
  rows: string[][];
}

export interface Slide {
  title: string;
  bullets: string[];
  notes: string;
}

export interface SlideDeckPayload {
  kind: 'slide_deck';
  title: string;
  slides: Slide[];
}

export interface DialogueLine {
  speaker: 'teacher' | 'student';
  text: string;
  /** Filled in once the line has been synthesised. */
  audioUrl?: string;
}

export interface AudioOverviewPayload {
  kind: 'audio_overview';
  title: string;
  length: 'short' | 'standard';
  lines: DialogueLine[];
}

export interface VideoOverviewPayload {
  kind: 'video_overview';
  title: string;
  slides: Slide[];
  lines: DialogueLine[];
}

export type StudioPayload =
  | ReportPayload
  | FlashcardsPayload
  | QuizPayload
  | MindMapPayload
  | InfographicPayload
  | DataTablePayload
  | SlideDeckPayload
  | AudioOverviewPayload
  | VideoOverviewPayload;

/** Options a learner can set before a generator runs. */
export interface StudioRequest {
  type: StudioType;
  notebookId: string;
  userId: string;
  sourceIds: string[];
  language: string;
  /** Report template, quiz difficulty, audio length, focus topic. */
  template?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  count?: number;
  length?: 'short' | 'standard';
  focus?: string;
}

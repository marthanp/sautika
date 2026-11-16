/**
 * Types for the notebook workspace: a notebook holds sources, the sources are
 * chunked and embedded for retrieval, and the chat, notes and Studio outputs
 * all hang off the notebook.
 *
 * Every document carries `userId` from Clerk. Nothing is ever read by
 * `notebookId` alone: the owner is always part of the filter.
 */

export type SourceKind = 'pdf' | 'docx' | 'image' | 'text' | 'url' | 'audio' | 'course';
export type SourceStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type ChatRole = 'user' | 'assistant';
export type NoteOrigin = 'manual' | 'saved_reply' | 'studio';
export type StudioType =
  | 'audio_overview'
  | 'video_overview'
  | 'mind_map'
  | 'report'
  | 'flashcards'
  | 'quiz'
  | 'infographic'
  | 'data_table'
  | 'slide_deck';
export type StudioStatus = 'queued' | 'running' | 'ready' | 'failed';

export interface Notebook {
  _id: string;
  userId: string;
  title: string;
  emoji: string;
  coverKey?: string;
  /** The language the learner studies this notebook in, as a Sunbird code. */
  language: string;
  subject?: string;
  /** Set when the notebook was built from a curriculum course. */
  courseId?: string;
  /** Featured notebooks are read-only; a learner takes a copy to add to them. */
  isFeatured: boolean;
  sourceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** The auto-written overview the Sources pane shows for one source. */
export interface SourceGuide {
  summary: string;
  keyTopics: string[];
  suggestedQuestions: string[];
}

export interface NotebookSource {
  _id: string;
  notebookId: string;
  userId: string;
  kind: SourceKind;
  title: string;
  /** R2 object key for an upload. */
  r2Key?: string;
  /** Original address for a `url` source. */
  url?: string;
  status: SourceStatus;
  /** Learner-facing reason the source failed, never a raw provider message. */
  error?: string;
  language: string;
  charCount: number;
  guide?: SourceGuide;
  createdAt: Date;
  updatedAt: Date;
}

export interface SourceChunk {
  _id: string;
  sourceId: string;
  notebookId: string;
  userId: string;
  /** Position of the chunk in its source, from 0. */
  ord: number;
  text: string;
  /** 1-based page number, when the source had pages. */
  page?: number;
  charStart: number;
  charEnd: number;
  embedding?: number[];
}

export interface Citation {
  /** The `[n]` marker the reply used. */
  n: number;
  sourceId: string;
  chunkId: string;
  /** The passage the answer leaned on, for the hover card and the reader. */
  quote: string;
}

export interface ChatMessage {
  _id: string;
  notebookId: string;
  userId: string;
  role: ChatRole;
  content: string;
  language: string;
  citations?: Citation[];
  /** Which LLM answered, for the latency logs. */
  provider?: string;
  createdAt: Date;
}

export interface NotebookNote {
  _id: string;
  notebookId: string;
  userId: string;
  title: string;
  body: string;
  origin: NoteOrigin;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudioOutput {
  _id: string;
  notebookId: string;
  userId: string;
  type: StudioType;
  status: StudioStatus;
  language: string;
  /** Shape depends on `type`; each generator documents its own. */
  payload: unknown;
  /** R2 key for generated audio or a rendered file. */
  r2Key?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Progress published by a background job, for source chips and Studio tiles. */
export interface JobProgress {
  stage: string;
  percent: number;
  message: string;
}

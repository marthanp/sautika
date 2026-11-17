import type { Collection, Db } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import type {
  ChatMessage,
  Notebook,
  NotebookNote,
  NotebookSource,
  SourceChunk,
  StudioOutput,
} from '@/types/notebook';

/**
 * Typed access to the notebook collections, plus the one-time index setup.
 *
 * Naming note: the brief calls the source collection `sources`, but a
 * `sources` collection already exists for the old flat note board, with a
 * strict validator that requires `name`, `text` and `enabled`. Reusing it
 * would have rejected either the old documents or the new ones, so the
 * notebook sources live in `notebook_sources` and the old collection is left
 * alone for the migration to read.
 */

export const COLLECTIONS = {
  notebooks: 'notebooks',
  sources: 'notebook_sources',
  chunks: 'source_chunks',
  chat: 'chat_messages',
  notes: 'notebook_notes',
  studio: 'studio_outputs',
} as const;

/**
 * The owner of the featured notebooks. They belong to the platform rather
 * than to a learner: `assertNotebookAccess` lets anyone read a notebook with
 * `isFeatured: true`, and lets nobody write one.
 */
export const FEATURED_OWNER = '__featured__';

/** The name of the Atlas Vector Search index; see database/vector-index.json. */
export const VECTOR_INDEX = 'source_chunks_vector';
/** The name of the keyword index used when embeddings are unavailable. */
export const TEXT_INDEX = 'source_chunks_text';

export async function notebooksCollection(): Promise<Collection<Notebook>> {
  return (await getDatabase()).collection<Notebook>(COLLECTIONS.notebooks);
}

export async function sourcesCollection(): Promise<Collection<NotebookSource>> {
  return (await getDatabase()).collection<NotebookSource>(COLLECTIONS.sources);
}

export async function chunksCollection(): Promise<Collection<SourceChunk>> {
  return (await getDatabase()).collection<SourceChunk>(COLLECTIONS.chunks);
}

export async function chatCollection(): Promise<Collection<ChatMessage>> {
  return (await getDatabase()).collection<ChatMessage>(COLLECTIONS.chat);
}

export async function notebookNotesCollection(): Promise<Collection<NotebookNote>> {
  return (await getDatabase()).collection<NotebookNote>(COLLECTIONS.notes);
}

export async function studioCollection(): Promise<Collection<StudioOutput>> {
  return (await getDatabase()).collection<StudioOutput>(COLLECTIONS.studio);
}

/**
 * Creates the ordinary indexes. Safe to call repeatedly: Mongo ignores a
 * definition it already has. The Atlas Vector Search index is not created
 * here, because it is an Atlas-level resource; see the README.
 */
export async function ensureNotebookIndexes(db?: Db): Promise<void> {
  const database = db ?? (await getDatabase());

  await Promise.all([
    database.collection(COLLECTIONS.notebooks).createIndexes([
      { key: { userId: 1, updatedAt: -1 }, name: 'notebooks_recent' },
      { key: { isFeatured: 1, subject: 1 }, name: 'notebooks_featured' },
      { key: { userId: 1, courseId: 1 }, name: 'notebooks_by_course' },
    ]),
    database.collection(COLLECTIONS.sources).createIndexes([
      { key: { notebookId: 1, status: 1 }, name: 'sources_by_status' },
      { key: { userId: 1, createdAt: -1 }, name: 'sources_recent' },
    ]),
    database.collection(COLLECTIONS.chunks).createIndexes([
      { key: { sourceId: 1, ord: 1 }, name: 'chunks_in_order' },
      { key: { userId: 1, notebookId: 1 }, name: 'chunks_owner' },
      // Keyword fallback for retrieval when embeddings are not available.
      { key: { text: 'text' }, name: TEXT_INDEX, default_language: 'english' },
    ]),
    database.collection(COLLECTIONS.chat).createIndexes([
      { key: { notebookId: 1, createdAt: 1 }, name: 'chat_in_order' },
      { key: { userId: 1, createdAt: -1 }, name: 'chat_recent' },
    ]),
    database.collection(COLLECTIONS.notes).createIndexes([
      { key: { notebookId: 1, createdAt: 1 }, name: 'notebook_notes_in_order' },
      { key: { userId: 1, updatedAt: -1 }, name: 'notebook_notes_recent' },
    ]),
    database.collection(COLLECTIONS.studio).createIndexes([
      { key: { notebookId: 1, createdAt: -1 }, name: 'studio_recent' },
      { key: { userId: 1, type: 1 }, name: 'studio_by_type' },
    ]),
  ]);
}

/**
 * Returns the notebook when this user owns it (or it is featured and so
 * readable by everyone), and null otherwise. Every route that takes a
 * `notebookId` from the client goes through this first.
 */
export async function assertNotebookAccess(
  userId: string,
  notebookId: string,
  options: { write?: boolean } = {},
): Promise<Notebook | null> {
  const notebooks = await notebooksCollection();
  const notebook = await notebooks.findOne({ _id: notebookId });
  if (!notebook) return null;

  if (notebook.userId === userId) return notebook;
  // A featured notebook is shared reference material: readable, never writable.
  if (!options.write && notebook.isFeatured) return notebook;
  return null;
}

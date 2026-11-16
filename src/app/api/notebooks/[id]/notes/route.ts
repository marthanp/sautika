import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import { assertNotebookAccess, notebookNotesCollection } from '@/lib/notebooks/schema';
import type { NoteOrigin, NotebookNote } from '@/types/notebook';

export const runtime = 'nodejs';

const MAX_TITLE = 200;
const MAX_BODY = 50_000;
const ORIGINS: NoteOrigin[] = ['manual', 'saved_reply', 'studio'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serialize(note: NotebookNote) {
  return {
    id: note._id,
    title: note.title,
    body: note.body,
    origin: note.origin,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}

/** The notes saved inside one notebook, oldest first. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-notes-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const notes = await notebookNotesCollection();
  const list = await notes.find({ notebookId, userId }).sort({ createdAt: 1 }).limit(300).toArray();
  return Response.json({ notes: list.map(serialize) });
}

/**
 * Saves a note: written by hand, kept from a chat reply, or produced by
 * Studio. Unlike the old note board this never reports success unless the
 * write landed, so the client can show the real error.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-notes-write', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  // A note belongs to the learner, so even a featured notebook is a valid
  // place to keep one; it is the notebook itself that stays read-only.
  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const text = typeof body.body === 'string' ? body.body.slice(0, MAX_BODY) : '';
  if (!text.trim()) {
    return Response.json({ error: 'A note needs some text.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, MAX_TITLE)
    // Fall back to the first line, which is what a saved reply usually wants.
    : text.split('\n', 1)[0].slice(0, 80) || 'Note';

  const origin = typeof body.origin === 'string' && ORIGINS.includes(body.origin as NoteOrigin)
    ? (body.origin as NoteOrigin)
    : 'manual';

  const now = new Date();
  const note: NotebookNote = {
    _id: randomUUID(),
    notebookId,
    userId,
    title,
    body: text,
    origin,
    createdAt: now,
    updatedAt: now,
  };

  const notes = await notebookNotesCollection();
  await notes.insertOne(note);

  return Response.json({ note: serialize(note) }, { status: 201 });
}

/** Removes one note. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-notes-write', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const noteId = req.nextUrl.searchParams.get('noteId') ?? '';
  if (!noteId) return Response.json({ error: 'A note is required.' }, { status: 400 });

  const notes = await notebookNotesCollection();
  const result = await notes.deleteOne({ _id: noteId, notebookId, userId });
  if (result.deletedCount === 0) {
    return Response.json({ error: 'Note not found.' }, { status: 404 });
  }

  return Response.json({ deleted: true });
}

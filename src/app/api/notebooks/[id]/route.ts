import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import {
  assertNotebookAccess,
  chatCollection,
  chunksCollection,
  notebookNotesCollection,
  notebooksCollection,
  sourcesCollection,
  studioCollection,
} from '@/lib/notebooks/schema';
import { isSunbirdLanguage } from '@/lib/sunbird-languages';
import type { Notebook, NotebookSource } from '@/types/notebook';

export const runtime = 'nodejs';

const MAX_TITLE = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeNotebook(notebook: Notebook) {
  return {
    id: notebook._id,
    title: notebook.title,
    emoji: notebook.emoji,
    language: notebook.language,
    subject: notebook.subject,
    courseId: notebook.courseId,
    isFeatured: notebook.isFeatured,
    sourceCount: notebook.sourceCount,
    /** False for a featured notebook the learner is only reading. */
    canEdit: notebook.userId !== undefined,
    createdAt: notebook.createdAt,
    updatedAt: notebook.updatedAt,
  };
}

function serializeSource(source: NotebookSource) {
  return {
    id: source._id,
    kind: source.kind,
    title: source.title,
    status: source.status,
    error: source.error,
    language: source.language,
    charCount: source.charCount,
    guide: source.guide,
    url: source.url,
    createdAt: source.createdAt,
  };
}

/** One notebook with its sources, for the notebook view. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const notebook = await assertNotebookAccess(userId, id);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const sources = await sourcesCollection();
  const list = await sources
    .find({ notebookId: id }, { projection: { rawText: 0 } })
    .sort({ createdAt: 1 })
    .limit(300)
    .toArray();

  return Response.json({
    notebook: {
      ...serializeNotebook(notebook),
      canEdit: notebook.userId === userId && !notebook.isFeatured,
    },
    sources: list.map(serializeSource),
  });
}

/** Renames a notebook, changes its emoji or its study language. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-write', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const notebook = await assertNotebookAccess(userId, id, { write: true });
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

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (typeof body.title === 'string') {
    const title = body.title.trim().slice(0, MAX_TITLE);
    if (!title) return Response.json({ error: 'Give your notebook a name.' }, { status: 400 });
    update.title = title;
  }
  if (typeof body.emoji === 'string' && body.emoji.trim()) {
    update.emoji = body.emoji.trim().slice(0, 8);
  }
  if (typeof body.language === 'string') {
    if (!isSunbirdLanguage(body.language)) {
      return Response.json({ error: 'That language is not supported.' }, { status: 400 });
    }
    update.language = body.language;
  }

  const notebooks = await notebooksCollection();
  await notebooks.updateOne({ _id: id, userId }, { $set: update });
  const updated = await notebooks.findOne({ _id: id, userId });

  return Response.json({ notebook: updated ? serializeNotebook(updated) : null });
}

/** Deletes a notebook and everything inside it. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-write', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const notebook = await assertNotebookAccess(userId, id, { write: true });
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const [notebooks, sources, chunks, chat, notes, studio] = await Promise.all([
    notebooksCollection(),
    sourcesCollection(),
    chunksCollection(),
    chatCollection(),
    notebookNotesCollection(),
    studioCollection(),
  ]);

  // Children first: a crash mid-delete must not leave rows no one can reach.
  await Promise.all([
    chunks.deleteMany({ notebookId: id, userId }),
    sources.deleteMany({ notebookId: id, userId }),
    chat.deleteMany({ notebookId: id, userId }),
    notes.deleteMany({ notebookId: id, userId }),
    studio.deleteMany({ notebookId: id, userId }),
  ]);
  await notebooks.deleteOne({ _id: id, userId });

  return Response.json({ deleted: true });
}

/** Copies a featured notebook so the learner can add their own sources. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('notebook-write', 30);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id } = await params;

  const original = await assertNotebookAccess(userId, id);
  if (!original) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const now = new Date();
  const copyId = randomUUID();
  const [notebooks, sources, chunks] = await Promise.all([
    notebooksCollection(),
    sourcesCollection(),
    chunksCollection(),
  ]);

  await notebooks.insertOne({
    _id: copyId,
    userId,
    title: original.title,
    emoji: original.emoji,
    language: original.language,
    ...(original.subject ? { subject: original.subject } : {}),
    ...(original.courseId ? { courseId: original.courseId } : {}),
    isFeatured: false,
    sourceCount: original.sourceCount,
    createdAt: now,
    updatedAt: now,
  });

  // Copy the sources and their chunks, so the copy is searchable immediately
  // without paying to embed the same curriculum text again.
  const originalSources = await sources.find({ notebookId: id }).toArray();
  for (const source of originalSources) {
    const newSourceId = randomUUID();
    await sources.insertOne({
      ...source,
      _id: newSourceId,
      notebookId: copyId,
      userId,
      createdAt: now,
      updatedAt: now,
    });

    const originalChunks = await chunks.find({ sourceId: source._id }).toArray();
    if (originalChunks.length > 0) {
      await chunks.insertMany(
        originalChunks.map((chunk) => ({
          ...chunk,
          _id: `${newSourceId}_${chunk.ord}`,
          sourceId: newSourceId,
          notebookId: copyId,
          userId,
        })),
        { ordered: false },
      );
    }
  }

  return Response.json({ notebookId: copyId }, { status: 201 });
}

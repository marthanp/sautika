import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import { requestSourceIngest } from '@/lib/notebooks/events';
import { assertNotebookAccess, chunksCollection, notebooksCollection, sourcesCollection } from '@/lib/notebooks/schema';
import { isSunbirdLanguage } from '@/lib/sunbird-languages';
import type { NotebookSource, SourceKind } from '@/types/notebook';

export const runtime = 'nodejs';

const MAX_TITLE = 300;
/** A pasted note, not a book: the same ceiling the old note editor used. */
const MAX_PASTED_CHARS = 50_000;
const KINDS: SourceKind[] = ['pdf', 'docx', 'image', 'text', 'url', 'audio'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serialize(source: NotebookSource) {
  return {
    id: source._id,
    notebookId: source.notebookId,
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

/** The sources in one notebook, with their ingestion status. */
export async function GET(req: NextRequest): Promise<Response> {
  const guard = await guardUser('sources-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  const notebookId = req.nextUrl.searchParams.get('notebookId') ?? '';
  if (!notebookId) {
    return Response.json({ error: 'A notebook is required.' }, { status: 400 });
  }

  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const sources = await sourcesCollection();
  const list = await sources
    .find({ notebookId }, { projection: { rawText: 0 } })
    .sort({ createdAt: 1 })
    .limit(300)
    .toArray();

  return Response.json({ sources: list.map(serialize) });
}

/**
 * Adds a source to a notebook and queues it for processing.
 *
 * Three shapes:
 *  - an upload that has already landed in R2 (`r2Key` from /api/sources/upload-url)
 *  - pasted text (`text`)
 *  - a web address (`url`)
 *
 * The source is inserted as `queued` and the work is handed to Inngest, or run
 * inline when Inngest is not configured. Either way this returns immediately
 * and the Sources pane follows the status.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('sources-write', 40);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const notebookId = typeof body.notebookId === 'string' ? body.notebookId : '';
  if (!notebookId) {
    return Response.json({ error: 'A notebook is required.' }, { status: 400 });
  }

  const notebook = await assertNotebookAccess(userId, notebookId, { write: true });
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const kind = typeof body.kind === 'string' && KINDS.includes(body.kind as SourceKind)
    ? (body.kind as SourceKind)
    : null;
  if (!kind) {
    return Response.json({ error: 'That kind of source is not supported.' }, { status: 400 });
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim().slice(0, MAX_TITLE)
    : 'Untitled source';
  const language = typeof body.language === 'string' && isSunbirdLanguage(body.language)
    ? body.language
    : notebook.language;

  const r2Key = typeof body.r2Key === 'string' ? body.r2Key : undefined;
  const url = typeof body.url === 'string' ? body.url.trim() : undefined;
  const text = typeof body.text === 'string' ? body.text.slice(0, MAX_PASTED_CHARS) : undefined;

  // A source must carry something we can read.
  if (!r2Key && !url && !(text && text.trim())) {
    return Response.json(
      { error: 'Add a file, paste some text, or give a web address.' },
      { status: 400 },
    );
  }

  if (url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('not http');
      }
    } catch {
      return Response.json({ error: 'That web address does not look right.' }, { status: 400 });
    }
  }

  // The key is only trusted when it sits under this learner's own prefix,
  // so a crafted request cannot pull in another learner's upload.
  if (r2Key) {
    const safeUser = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (!r2Key.startsWith(`sources/${safeUser}/`)) {
      return Response.json({ error: 'That upload does not belong to you.' }, { status: 403 });
    }
  }

  const now = new Date();
  const sourceId = randomUUID();
  const source: NotebookSource & { rawText?: string } = {
    _id: sourceId,
    notebookId,
    userId,
    kind,
    title,
    ...(r2Key ? { r2Key } : {}),
    ...(url ? { url } : {}),
    status: 'queued',
    language,
    charCount: text ? text.length : 0,
    createdAt: now,
    updatedAt: now,
    ...(text ? { rawText: text } : {}),
  };

  const [sources, notebooks] = await Promise.all([sourcesCollection(), notebooksCollection()]);
  await sources.insertOne(source);
  await notebooks.updateOne(
    { _id: notebookId },
    { $inc: { sourceCount: 1 }, $set: { updatedAt: now } },
  );

  const { runner } = await requestSourceIngest(sourceId, userId, { kind, ...(url ? { url } : {}) });

  return Response.json({ source: serialize(source), runner }, { status: 201 });
}

/** Removes a source and its chunks. */
export async function DELETE(req: NextRequest): Promise<Response> {
  const guard = await guardUser('sources-write', 40);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  const sourceId = req.nextUrl.searchParams.get('id') ?? '';
  if (!sourceId) return Response.json({ error: 'A source is required.' }, { status: 400 });

  const [sources, chunks, notebooks] = await Promise.all([
    sourcesCollection(),
    chunksCollection(),
    notebooksCollection(),
  ]);

  const source = await sources.findOne({ _id: sourceId, userId });
  if (!source) return Response.json({ error: 'Source not found.' }, { status: 404 });

  await chunks.deleteMany({ sourceId, userId });
  await sources.deleteOne({ _id: sourceId, userId });

  const remaining = await sources.countDocuments({ notebookId: source.notebookId });
  await notebooks.updateOne(
    { _id: source.notebookId },
    { $set: { sourceCount: remaining, updatedAt: new Date() } },
  );

  return Response.json({ deleted: true });
}

import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import { ensureNotebookIndexes, notebooksCollection } from '@/lib/notebooks/schema';
import { isSunbirdLanguage } from '@/lib/sunbird-languages';
import type { Notebook } from '@/types/notebook';

export const runtime = 'nodejs';

const MAX_TITLE = 200;
const DEFAULT_EMOJI = '📚';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Only the fields the browser is allowed to see. */
function serialize(notebook: Notebook) {
  return {
    id: notebook._id,
    title: notebook.title,
    emoji: notebook.emoji,
    language: notebook.language,
    subject: notebook.subject,
    courseId: notebook.courseId,
    isFeatured: notebook.isFeatured,
    sourceCount: notebook.sourceCount,
    createdAt: notebook.createdAt,
    updatedAt: notebook.updatedAt,
  };
}

/**
 * The learner's notebooks, plus the featured ones built from the curriculum.
 * `?scope=mine` or `?scope=featured` narrows it.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const guard = await guardUser('notebooks', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  const scope = req.nextUrl.searchParams.get('scope') ?? 'all';
  const notebooks = await notebooksCollection();

  const [mine, featured] = await Promise.all([
    scope === 'featured'
      ? Promise.resolve([])
      : notebooks.find({ userId }).sort({ updatedAt: -1 }).limit(200).toArray(),
    scope === 'mine'
      ? Promise.resolve([])
      : notebooks.find({ isFeatured: true }).sort({ subject: 1, title: 1 }).limit(100).toArray(),
  ]);

  return Response.json({
    notebooks: mine.map(serialize),
    featured: featured.map(serialize),
  });
}

/** Creates an empty notebook for this learner. */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('notebooks-write', 30);
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

  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) {
    return Response.json({ error: 'Give your notebook a name.' }, { status: 400 });
  }

  const language =
    typeof body.language === 'string' && isSunbirdLanguage(body.language) ? body.language : 'eng';
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim().slice(0, 8) : DEFAULT_EMOJI;
  const subject = typeof body.subject === 'string' && body.subject.trim()
    ? body.subject.trim().slice(0, 100)
    : undefined;

  const now = new Date();
  const notebook: Notebook = {
    _id: randomUUID(),
    userId,
    title,
    emoji,
    language,
    ...(subject ? { subject } : {}),
    isFeatured: false,
    sourceCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const notebooks = await notebooksCollection();
  await notebooks.insertOne(notebook);
  // Cheap on a warm connection, and it means a fresh database needs no setup step.
  void ensureNotebookIndexes().catch(() => undefined);

  return Response.json({ notebook: serialize(notebook) }, { status: 201 });
}

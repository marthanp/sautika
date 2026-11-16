import type { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import { guardUser } from '@/lib/api-guard';
import { requestStudioGenerate } from '@/lib/notebooks/events';
import { assertNotebookAccess, studioCollection } from '@/lib/notebooks/schema';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import type { StudioOutput, StudioType } from '@/types/notebook';
import type { StudioRequest } from '@/lib/studio/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const TYPES: StudioType[] = [
  'audio_overview',
  'video_overview',
  'mind_map',
  'report',
  'flashcards',
  'quiz',
  'infographic',
  'data_table',
  'slide_deck',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serialize(output: StudioOutput & { progress?: unknown }) {
  return {
    id: output._id,
    type: output.type,
    status: output.status,
    language: output.language,
    payload: output.status === 'ready' ? output.payload : null,
    progress: output.progress ?? null,
    error: output.error,
    createdAt: output.createdAt,
    updatedAt: output.updatedAt,
  };
}

/** Everything Studio has built for this notebook, newest first. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('studio-read', 120);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const notebook = await assertNotebookAccess(userId, notebookId);
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  const studio = await studioCollection();
  const outputs = await studio
    .find({ notebookId, userId })
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  return Response.json({ outputs: outputs.map(serialize) });
}

/**
 * Asks Studio for an output.
 *
 * The row is created `queued` and the work handed to Inngest, or run inline
 * when Inngest is not configured. Either way this returns straight away and
 * the Studio pane follows the row's status, so a learner is never staring at a
 * frozen button.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('studio-write', 20);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

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

  const type = typeof body.type === 'string' && TYPES.includes(body.type as StudioType)
    ? (body.type as StudioType)
    : null;
  if (!type) {
    return Response.json({ error: 'That Studio output is not available.' }, { status: 400 });
  }

  const sourceIds = Array.isArray(body.sourceIds)
    ? body.sourceIds.filter((value): value is string => typeof value === 'string').slice(0, 100)
    : [];
  if (sourceIds.length === 0) {
    return Response.json(
      { error: 'Tick at least one source, then try again.' },
      { status: 400 },
    );
  }

  const language = typeof body.language === 'string' && isSunbirdLanguage(body.language)
    ? normalizeSunbirdLanguage(body.language)
    : normalizeSunbirdLanguage(notebook.language);

  const request: StudioRequest = {
    type,
    notebookId,
    userId,
    sourceIds,
    language,
    ...(typeof body.template === 'string' ? { template: body.template.slice(0, 40) } : {}),
    ...(body.difficulty === 'easy' || body.difficulty === 'hard' || body.difficulty === 'normal'
      ? { difficulty: body.difficulty }
      : {}),
    ...(typeof body.count === 'number' ? { count: Math.min(20, Math.max(3, body.count)) } : {}),
    ...(body.length === 'short' || body.length === 'standard' ? { length: body.length } : {}),
    ...(typeof body.focus === 'string' && body.focus.trim()
      ? { focus: body.focus.trim().slice(0, 120) }
      : {}),
  };

  const now = new Date();
  const outputId = randomUUID();
  const studio = await studioCollection();
  await studio.insertOne({
    _id: outputId,
    notebookId,
    userId,
    type,
    status: 'queued',
    language,
    payload: null,
    createdAt: now,
    updatedAt: now,
    // Kept so the worker can rebuild exactly what was asked for on a retry.
    request,
  } as StudioOutput & { request: StudioRequest });

  const { runner } = await requestStudioGenerate(outputId, userId, type);

  return Response.json({ outputId, status: 'queued', runner }, { status: 202 });
}

/** Removes one Studio output. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const guard = await guardUser('studio-write', 40);
  if (!guard.ok) return guard.response;
  const userId = guard.value;
  const { id: notebookId } = await params;

  const outputId = req.nextUrl.searchParams.get('outputId') ?? '';
  if (!outputId) return Response.json({ error: 'An output is required.' }, { status: 400 });

  const studio = await studioCollection();
  const result = await studio.deleteOne({ _id: outputId, notebookId, userId });
  if (result.deletedCount === 0) {
    return Response.json({ error: 'Output not found.' }, { status: 404 });
  }
  return Response.json({ deleted: true });
}

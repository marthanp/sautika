import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { assertNotebookAccess } from '@/lib/notebooks/schema';
import { classify, extensionOf, MAX_FILE_BYTES, SUPPORTED_TYPES_MESSAGE } from '@/lib/notebooks/extract';
import { createPresignedUploadUrl, learnerUploadKey } from '@/lib/r2';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A short-lived URL for uploading one file straight to R2.
 *
 * The browser uploads to R2 itself, so a 60-page PDF never has to stream
 * through a serverless function with a 60 second limit. The key is chosen
 * here, under the learner's own prefix, and never taken from the request: one
 * learner must not be able to write into another learner's space.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('source-upload-url', 40);
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
  const fileName = typeof body.fileName === 'string' ? body.fileName.trim() : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType : '';
  const size = typeof body.size === 'number' ? body.size : 0;

  if (!notebookId || !fileName) {
    return Response.json({ error: 'A notebook and a file name are required.' }, { status: 400 });
  }
  if (size > MAX_FILE_BYTES) {
    return Response.json(
      { error: 'That file is larger than 10 MB. Try a smaller photo or a single chapter.' },
      { status: 413 },
    );
  }

  const kind = classify(extensionOf(fileName), contentType);
  if (!kind) {
    return Response.json({ error: SUPPORTED_TYPES_MESSAGE }, { status: 415 });
  }

  const notebook = await assertNotebookAccess(userId, notebookId, { write: true });
  if (!notebook) {
    return Response.json({ error: 'Notebook not found.' }, { status: 404 });
  }

  try {
    const presigned = await createPresignedUploadUrl({
      key: learnerUploadKey(userId, fileName),
      contentType: contentType || 'application/octet-stream',
    });
    return Response.json({ ...presigned, kind });
  } catch (error) {
    // The reason stays in the server log; the learner gets one clear line.
    console.error('Could not presign an upload URL:', error);
    return Response.json(
      { error: 'Uploads are unavailable right now. Please try again in a moment.' },
      { status: 503 },
    );
  }
}

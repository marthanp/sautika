import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { assertNotebookAccess } from '@/lib/notebooks/schema';
import { classify, extensionOf, MAX_FILE_BYTES, SUPPORTED_TYPES_MESSAGE } from '@/lib/notebooks/extract';
import { deleteFromR2, downloadFromR2, learnerUploadKey, uploadToR2 } from '@/lib/r2';

export const runtime = 'nodejs';

const CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_CHUNKS = Math.ceil(MAX_FILE_BYTES / CHUNK_BYTES);

function isUploadId(value: string): boolean {
  return /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);
}

function tempKey(userId: string, uploadId: string, index: number): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `sources/.tmp/${safeUser}/${uploadId}/${index}`;
}

function temporaryKeys(userId: string, uploadId: string): string[] {
  return Array.from({ length: MAX_CHUNKS }, (_, index) => tempKey(userId, uploadId, index));
}

async function clearTemporaryChunks(userId: string, uploadId: string): Promise<void> {
  await Promise.all(temporaryKeys(userId, uploadId).map(deleteFromR2));
}

/**
 * Stores upload chunks on the server so browsers never need cross-origin
 * access to the R2 bucket. Each request stays below serverless body limits;
 * the final request assembles the chunks into the original source object.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('source-upload', 200);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'The upload request could not be read.' }, { status: 400 });
  }

  const action = form.get('action');
  const notebookId = form.get('notebookId');
  const uploadId = form.get('uploadId');
  if (
    typeof action !== 'string'
    || !['chunk', 'complete', 'abort'].includes(action)
    || typeof notebookId !== 'string'
    || !notebookId
    || typeof uploadId !== 'string'
    || !isUploadId(uploadId)
  ) {
    return Response.json({ error: 'The upload request is missing required information.' }, { status: 400 });
  }

  const notebook = await assertNotebookAccess(userId, notebookId, { write: true });
  if (!notebook) return Response.json({ error: 'Notebook not found.' }, { status: 404 });

  if (action === 'abort') {
    try {
      await clearTemporaryChunks(userId, uploadId);
      return Response.json({ aborted: true });
    } catch (error) {
      console.error('Could not clear temporary source-upload chunks:', error);
      return Response.json({ error: 'Could not clear the unfinished upload.' }, { status: 503 });
    }
  }

  if (action === 'chunk') {
    const indexValue = form.get('chunkIndex');
    const chunk = form.get('chunk');
    const index = typeof indexValue === 'string' ? Number(indexValue) : Number.NaN;
    if (
      !Number.isInteger(index)
      || index < 0
      || index >= MAX_CHUNKS
      || !(chunk instanceof File)
      || chunk.size === 0
      || chunk.size > CHUNK_BYTES
    ) {
      return Response.json({ error: 'That upload part is invalid. Please choose the file again.' }, { status: 400 });
    }

    try {
      await uploadToR2({
        key: tempKey(userId, uploadId, index),
        body: Buffer.from(await chunk.arrayBuffer()),
        contentType: 'application/octet-stream',
      });
      return Response.json({ stored: true });
    } catch (error) {
      console.error('Could not store a source-upload chunk:', error);
      return Response.json({ error: 'Could not save that part of the upload. Please try again.' }, { status: 503 });
    }
  }

  const fileName = form.get('fileName');
  const contentTypeValue = form.get('contentType');
  const sizeValue = form.get('size');
  const size = typeof sizeValue === 'string' ? Number(sizeValue) : Number.NaN;
  const contentType = typeof contentTypeValue === 'string' ? contentTypeValue : '';
  if (
    typeof fileName !== 'string'
    || !fileName.trim()
    || !Number.isInteger(size)
    || size <= 0
    || size > MAX_FILE_BYTES
  ) {
    return Response.json(
      { error: size > MAX_FILE_BYTES ? 'That file is larger than 10 MB. Try a smaller photo or a single chapter.' : 'The file details are invalid.' },
      { status: size > MAX_FILE_BYTES ? 413 : 400 },
    );
  }

  const kind = classify(extensionOf(fileName), contentType);
  if (!kind) {
    return Response.json({ error: SUPPORTED_TYPES_MESSAGE }, { status: 415 });
  }

  const chunkCount = Math.ceil(size / CHUNK_BYTES);
  let chunks: Buffer[];
  try {
    const stored = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => downloadFromR2(tempKey(userId, uploadId, index))),
    );
    chunks = stored.map((part, index) => {
      const expectedSize = Math.min(CHUNK_BYTES, size - index * CHUNK_BYTES);
      if (part.size !== expectedSize) throw new Error(`Upload part ${index} has an unexpected size.`);
      return part.body;
    });
  } catch (error) {
    console.error('Could not assemble source-upload chunks:', error);
    return Response.json(
      { error: 'The upload is incomplete or could not be read. Please choose the file again.' },
      { status: 503 },
    );
  }

  try {
    const saved = await uploadToR2({
      key: learnerUploadKey(userId, fileName),
      body: Buffer.concat(chunks, size),
      contentType: contentType || 'application/octet-stream',
    });
    try {
      await clearTemporaryChunks(userId, uploadId);
    } catch (error) {
      console.error('Could not clear completed source-upload chunks:', error);
    }
    return Response.json({ r2Key: saved.key, kind });
  } catch (error) {
    console.error('Could not save the completed source upload:', error);
    return Response.json({ error: 'Could not finish saving the upload. Please try again.' }, { status: 503 });
  }
}

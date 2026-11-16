/**
 * Browser-side calls to the notebook API, in one place.
 *
 * Every helper throws an `Error` whose message is already fit to show a
 * learner, so components can render `error.message` without sanitising it.
 */

import type { Citation, SourceGuide, SourceKind, SourceStatus } from '@/types/notebook';

export interface NotebookSummary {
  id: string;
  title: string;
  emoji: string;
  language: string;
  subject?: string;
  courseId?: string;
  isFeatured: boolean;
  sourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotebookDetail extends NotebookSummary {
  canEdit: boolean;
}

export interface SourceSummary {
  id: string;
  kind: SourceKind;
  title: string;
  status: SourceStatus;
  error?: string;
  language: string;
  charCount: number;
  guide?: SourceGuide;
  url?: string;
  createdAt: string;
}

export interface ChatMessageView {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  language: string;
  citations: Citation[];
  provider?: string;
  createdAt: string;
}

export interface NoteView {
  id: string;
  title: string;
  body: string;
  origin: 'manual' | 'saved_reply' | 'studio';
  createdAt: string;
  updatedAt: string;
}

export interface SourceChunkView {
  id: string;
  ord: number;
  text: string;
  page?: number;
  charStart: number;
  charEnd: number;
}

/** Reads the API's error message, or falls back to something usable. */
async function failure(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return new Error(body?.error ?? fallback);
}

async function getJson<T>(url: string, fallback: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw await failure(response, fallback);
  return response.json() as Promise<T>;
}

async function sendJson<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  if (!response.ok) throw await failure(response, fallback);
  return response.json() as Promise<T>;
}

export function listNotebooks(): Promise<{
  notebooks: NotebookSummary[];
  featured: NotebookSummary[];
}> {
  return getJson('/api/notebooks', 'Could not load your notebooks.');
}

export function createNotebook(input: {
  title: string;
  emoji?: string;
  subject?: string;
  language?: string;
}): Promise<{ notebook: NotebookSummary }> {
  return sendJson('/api/notebooks', 'POST', input, 'Could not create the notebook.');
}

export function renameNotebook(
  id: string,
  input: { title?: string; emoji?: string; language?: string },
): Promise<{ notebook: NotebookSummary | null }> {
  return sendJson(`/api/notebooks/${id}`, 'PATCH', input, 'Could not save the change.');
}

export function deleteNotebook(id: string): Promise<{ deleted: boolean }> {
  return sendJson(`/api/notebooks/${id}`, 'DELETE', undefined, 'Could not delete the notebook.');
}

export function copyNotebook(id: string): Promise<{ notebookId: string }> {
  return sendJson(`/api/notebooks/${id}`, 'POST', undefined, 'Could not copy the notebook.');
}

export function loadNotebook(id: string): Promise<{
  notebook: NotebookDetail;
  sources: SourceSummary[];
}> {
  return getJson(`/api/notebooks/${id}`, 'Could not open that notebook.');
}

export function listSources(notebookId: string): Promise<{ sources: SourceSummary[] }> {
  return getJson(`/api/sources?notebookId=${encodeURIComponent(notebookId)}`, 'Could not load the sources.');
}

export function addSource(input: {
  notebookId: string;
  kind: SourceKind;
  title?: string;
  text?: string;
  url?: string;
  r2Key?: string;
  language?: string;
}): Promise<{ source: SourceSummary; runner: string }> {
  return sendJson('/api/sources', 'POST', input, 'Could not add that source.');
}

export function deleteSource(id: string): Promise<{ deleted: boolean }> {
  return sendJson(`/api/sources?id=${encodeURIComponent(id)}`, 'DELETE', undefined, 'Could not remove that source.');
}

export function retrySource(id: string): Promise<{ processed: number }> {
  return sendJson(`/api/sources/process?id=${encodeURIComponent(id)}`, 'POST', undefined, 'Could not try that source again.');
}

export function readSource(id: string, from = 0): Promise<{
  source: SourceSummary & { notebookId: string };
  chunks: SourceChunkView[];
  total: number;
  nextFrom: number | null;
}> {
  return getJson(`/api/sources/${id}?from=${from}`, 'Could not open that source.');
}

export function loadChat(notebookId: string): Promise<{ messages: ChatMessageView[] }> {
  return getJson(`/api/notebooks/${notebookId}/chat`, 'Could not load the conversation.');
}

export function clearChat(notebookId: string): Promise<{ cleared: boolean }> {
  return sendJson(`/api/notebooks/${notebookId}/chat`, 'DELETE', undefined, 'Could not clear the conversation.');
}

export function listNotes(notebookId: string): Promise<{ notes: NoteView[] }> {
  return getJson(`/api/notebooks/${notebookId}/notes`, 'Could not load your notes.');
}

export function saveNote(
  notebookId: string,
  input: { title?: string; body: string; origin?: NoteView['origin'] },
): Promise<{ note: NoteView }> {
  return sendJson(`/api/notebooks/${notebookId}/notes`, 'POST', input, 'Could not save the note.');
}

export function deleteNote(notebookId: string, noteId: string): Promise<{ deleted: boolean }> {
  return sendJson(
    `/api/notebooks/${notebookId}/notes?noteId=${encodeURIComponent(noteId)}`,
    'DELETE',
    undefined,
    'Could not delete the note.',
  );
}

/** Asks for a presigned URL, then puts the file straight into R2. */
export async function uploadFile(
  notebookId: string,
  file: File,
): Promise<{ r2Key: string; kind: SourceKind }> {
  const presigned = await sendJson<{ url: string; key: string; kind: SourceKind }>(
    '/api/sources/upload-url',
    'POST',
    {
      notebookId,
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
      size: file.size,
    },
    'Could not start the upload.',
  );

  const put = await fetch(presigned.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) {
    throw new Error('The upload did not finish. Check your connection and try again.');
  }

  return { r2Key: presigned.key, kind: presigned.kind };
}

export interface ChatStreamHandlers {
  onStatus?: (status: { stage: string; provider?: string; retrieval?: string }) => void;
  onToken?: (text: string) => void;
  onCitation?: (citation: Citation & { page?: number }) => void;
  onDone: (result: {
    answer: string;
    citations: Citation[];
    provider: string;
    retrieval?: string;
    translated?: boolean;
    buffered?: boolean;
  }) => void;
  onError: (message: string) => void;
}

/**
 * Reads the chat SSE stream with `fetch` and a stream reader, which is all
 * this needs — no EventSource (it cannot POST) and no library.
 */
export async function streamChat(
  notebookId: string,
  input: { question: string; sourceIds: string[]; language?: string },
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/notebooks/${notebookId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    handlers.onError('You seem to be offline. Your question is still here — try again.');
    return;
  }

  if (!response.ok || !response.body) {
    const error = await failure(response, 'The tutor could not answer just now.');
    handlers.onError(error.message);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let settled = false;

  const handle = (event: string, raw: string): void => {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }

    if (event === 'token') {
      handlers.onToken?.((data as { text: string }).text);
      return;
    }
    if (event === 'status') {
      handlers.onStatus?.(data as { stage: string });
      return;
    }
    if (event === 'citation') {
      handlers.onCitation?.(data as Citation & { page?: number });
      return;
    }
    if (event === 'done') {
      settled = true;
      handlers.onDone(data as Parameters<ChatStreamHandlers['onDone']>[0]);
      return;
    }
    if (event === 'error') {
      settled = true;
      handlers.onError((data as { error: string }).error);
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        let event = 'message';
        const dataLines: string[] = [];
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length > 0) handle(event, dataLines.join('\n'));

        boundary = buffer.indexOf('\n\n');
      }
    }
  } catch (error) {
    if (!signal?.aborted) {
      console.warn('Chat stream ended early:', error);
      if (!settled) handlers.onError('The answer stopped partway. Please try again.');
      return;
    }
  } finally {
    reader.releaseLock();
  }

  // The stream closed without a `done`: say so rather than leaving a spinner.
  if (!settled && !signal?.aborted) {
    handlers.onError('The answer stopped partway. Please try again.');
  }
}

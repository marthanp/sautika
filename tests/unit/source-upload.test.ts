import { afterEach, describe, expect, it, vi } from 'vitest';
import { addSource, uploadFile } from '@/lib/notebooks/client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('uploadFile', () => {
  it('sends large files in same-origin chunks and returns the saved source key', async () => {
    const requests: { action: string; chunkSize?: number }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const form = init?.body as FormData;
        const action = form.get('action') as string;
        const chunk = form.get('chunk');
        requests.push({
          action,
          ...(chunk instanceof File ? { chunkSize: chunk.size } : {}),
        });

        return Response.json(
          action === 'complete'
            ? { r2Key: 'sources/learner/notes.pdf', kind: 'pdf' }
            : { stored: true },
        );
      }),
    );

    const file = new File([new Uint8Array(3 * 1024 * 1024 + 17)], 'notes.pdf', {
      type: 'application/pdf',
    });
    const result = await uploadFile('notebook-1', file);

    expect(result).toEqual({ r2Key: 'sources/learner/notes.pdf', kind: 'pdf' });
    expect(requests).toEqual([
      { action: 'chunk', chunkSize: 3 * 1024 * 1024 },
      { action: 'chunk', chunkSize: 17 },
      { action: 'complete' },
    ]);
  });

  it('rejects files over 10 MB before sending a request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'notes.pdf', {
      type: 'application/pdf',
    });
    await expect(uploadFile('notebook-1', file)).rejects.toThrow('larger than 10 MB');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('addSource', () => {
  it.each([
    {
      label: 'pasted text',
      input: { notebookId: 'notebook-1', kind: 'text' as const, title: 'Notes', text: 'Study notes' },
    },
    {
      label: 'a web page',
      input: { notebookId: 'notebook-1', kind: 'url' as const, title: 'Lesson', url: 'https://example.com/lesson' },
    },
  ])('submits $label through the shared sources API', async ({ input }) => {
    const fetchMock = vi.fn(async () => Response.json({ source: {}, runner: 'inline' }));
    vi.stubGlobal('fetch', fetchMock);

    await addSource(input);

    expect(fetchMock).toHaveBeenCalledWith('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  });
});

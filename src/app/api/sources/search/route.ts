import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { searchWeb, webSearchConfigured } from '@/lib/notebooks/web-search';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_QUERY_CHARS = 200;

/** Whether the feature is switched on at all, so the UI can hide it. */
export async function GET(): Promise<Response> {
  const guard = await guardUser('source-search', 120);
  if (!guard.ok) return guard.response;

  return Response.json({ available: webSearchConfigured() });
}

/**
 * Suggests web pages a learner could add as sources.
 *
 * Nothing is added here. The results are suggestions, and the learner
 * confirms each one before it becomes a source, which is what keeps a
 * notebook made of material someone actually chose.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('source-search', 20);
  if (!guard.ok) return guard.response;

  if (!webSearchConfigured()) {
    return Response.json(
      { error: 'Searching the web is not switched on.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const query = typeof record?.query === 'string' ? record.query.trim().slice(0, MAX_QUERY_CHARS) : '';
  if (!query) {
    return Response.json({ error: 'Type what you are looking for.' }, { status: 400 });
  }

  const depth = record?.depth === 'deep' ? 'deep' : 'fast';

  try {
    const { results, provider } = await searchWeb(query, depth);
    return Response.json({ results, provider });
  } catch (error) {
    // The provider's own message stays in the log.
    console.error('Web source search failed:', error);
    return Response.json(
      { error: 'We could not search just now. Try again in a moment.' },
      { status: 502 },
    );
  }
}

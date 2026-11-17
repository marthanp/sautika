/**
 * Finding web pages a learner could add as sources.
 *
 * Two providers, chosen by whichever key is set: Brave Search and Tavily.
 * With neither key the feature reports itself unavailable and the UI hides it,
 * rather than showing a search box that cannot search.
 *
 * Nothing found here becomes a source on its own. The learner picks from the
 * results, which is the point: a notebook should only ever contain material
 * someone chose to put in it.
 */

export interface WebResult {
  title: string;
  url: string;
  /** The provider's own snippet, shown so a learner can judge before adding. */
  snippet: string;
  /** The site, for showing where a result comes from. */
  host: string;
}

export type SearchDepth = 'fast' | 'deep';

const MAX_RESULTS = 5;
const DEEP_RESULTS = 10;
const TIMEOUT_MS = 15_000;

export function webSearchConfigured(): boolean {
  return Boolean(process.env.BRAVE_SEARCH_API_KEY || process.env.TAVILY_API_KEY);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function tidy(results: WebResult[], limit: number): WebResult[] {
  const seen = new Set<string>();
  const out: WebResult[] = [];

  for (const result of results) {
    if (!result.url || !result.title) continue;
    const host = hostOf(result.url);
    if (!host) continue;
    // One result per site: five pages from one domain is not a range of sources.
    if (seen.has(host)) continue;
    seen.add(host);
    out.push({ ...result, host, snippet: result.snippet.slice(0, 300) });
    if (out.length >= limit) break;
  }

  return out;
}

async function searchBrave(query: string, limit: number): Promise<WebResult[]> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return [];

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(limit));

  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': key },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Brave Search responded with ${response.status}`);

  const data = (await response.json()) as {
    web?: { results?: { title?: string; url?: string; description?: string }[] };
  };

  return (data.web?.results ?? []).map((result) => ({
    title: (result.title ?? '').replace(/<[^>]+>/g, ''),
    url: result.url ?? '',
    snippet: (result.description ?? '').replace(/<[^>]+>/g, ''),
    host: '',
  }));
}

async function searchTavily(query: string, limit: number, depth: SearchDepth): Promise<WebResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return [];

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      max_results: limit,
      search_depth: depth === 'deep' ? 'advanced' : 'basic',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Tavily responded with ${response.status}`);

  const data = (await response.json()) as {
    results?: { title?: string; url?: string; content?: string }[];
  };

  return (data.results ?? []).map((result) => ({
    title: result.title ?? '',
    url: result.url ?? '',
    snippet: result.content ?? '',
    host: '',
  }));
}

/**
 * Searches for pages about `query`.
 *
 * `fast` runs one search and returns up to five suggestions. `deep` asks for
 * more and ranks them, which is why it belongs in a background job rather
 * than in a request a learner is waiting on.
 */
export async function searchWeb(
  query: string,
  depth: SearchDepth = 'fast',
): Promise<{ results: WebResult[]; provider: string }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], provider: 'none' };
  if (!webSearchConfigured()) {
    throw new Error('Searching the web is not switched on.');
  }

  const limit = depth === 'deep' ? DEEP_RESULTS : MAX_RESULTS;

  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      return { results: tidy(await searchBrave(trimmed, limit), limit), provider: 'Brave Search' };
    } catch (error) {
      console.warn('Brave Search failed, trying the next provider:', error);
    }
  }

  if (process.env.TAVILY_API_KEY) {
    try {
      return { results: tidy(await searchTavily(trimmed, limit, depth), limit), provider: 'Tavily' };
    } catch (error) {
      console.warn('Tavily search failed:', error);
    }
  }

  throw new Error('Web search is unavailable right now.');
}

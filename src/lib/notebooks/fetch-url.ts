/**
 * Reading a web page as study text.
 *
 * No parser library: the markup is stripped with a handful of passes, which is
 * enough for the curriculum pages, blog posts and wiki articles a learner
 * actually adds, and avoids shipping a DOM into a serverless function.
 *
 * Anything that is not plainly a public web page is refused, because this
 * fetch happens on our server with our network: a request to an internal
 * address would be a way to reach things a learner cannot.
 */

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 20_000;
const MAX_CHARS = 200_000;

/** Blocks that never contain the text of the page. */
const STRIP_BLOCKS = /<(script|style|noscript|svg|head|nav|footer|aside|form|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi;
/** Tags that should become a paragraph break rather than disappear. */
const BLOCK_TAGS = /<\/?(p|div|br|li|tr|h[1-6]|section|article|blockquote)\b[^>]*>/gi;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z]+;/gi, ' ');
}

/** The page title, which makes a better source name than the bare URL. */
export function titleFromHtml(html: string): string | null {
  const match = /<title[^>]*>([\s\S]{1,300}?)<\/title>/i.exec(html);
  if (!match) return null;
  const title = decodeEntities(match[1]).replace(/\s+/g, ' ').trim();
  return title || null;
}

/** Turns HTML into readable paragraphs. */
export function htmlToText(html: string): string {
  const withoutBlocks = html.replace(STRIP_BLOCKS, ' ');
  const withBreaks = withoutBlocks.replace(BLOCK_TAGS, '\n');
  const withoutTags = withBreaks.replace(/<[^>]+>/g, ' ');

  return decodeEntities(withoutTags)
    // Tidy the whitespace without collapsing paragraph breaks.
    .replace(/[ \t ]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_CHARS);
}

/** Refuses anything that is not a plain public http(s) address. */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('That web address does not look right.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only web addresses starting with http or https can be added.');
  }

  const host = url.hostname.toLowerCase();
  // A server-side fetch must not become a way to reach our own network.
  const isLocal =
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^0\./.test(host);
  if (isLocal || !host.includes('.')) {
    throw new Error('That address is not a public web page.');
  }

  return url;
}

/**
 * Fetches a page and returns its readable text, with the title on the first
 * line so the chunker treats it as a heading.
 */
export async function fetchReadableText(raw: string): Promise<string> {
  const url = assertPublicUrl(raw);

  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      // A generic client name: nothing about the learner goes to the site.
      'User-Agent': 'SautikaBot/1.0 (+https://sautika.vercel.app)',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`That page answered with status ${response.status}.`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) {
    throw new Error('That link is not a web page we can read.');
  }

  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) {
    throw new Error('That page is too large to read.');
  }

  const html = (await response.text()).slice(0, MAX_BYTES);
  const text = /text\/plain/i.test(contentType) ? html.trim().slice(0, MAX_CHARS) : htmlToText(html);

  if (text.length < 120) {
    throw new Error('We could not find readable text on that page.');
  }

  const title = titleFromHtml(html);
  return title ? `# ${title}\n\n${text}` : text;
}

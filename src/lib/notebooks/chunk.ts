/**
 * Splits a source into retrieval chunks.
 *
 * A chunk is a span of the original text, never a rewrite of it:
 * `fullText.slice(chunk.charStart, chunk.charEnd) === chunk.text` always
 * holds. That invariant is what lets the source reader scroll to the exact
 * passage a citation points at, and it is covered by the tests.
 *
 * Boundaries follow the shape of the document: headings start a new chunk,
 * paragraphs are kept whole where they fit, and only an over-long paragraph is
 * cut, at a sentence end where there is one.
 */

/** Target size. Big enough to hold an idea, small enough to cite precisely. */
export const TARGET_CHARS = 800;
/** Repeated tail of the previous chunk, so a sentence split across two chunks is still retrievable. */
export const OVERLAP_CHARS = 120;
/** A single paragraph longer than this is cut rather than kept whole. */
export const MAX_CHARS = 1_400;

export interface Chunk {
  ord: number;
  text: string;
  page?: number;
  charStart: number;
  charEnd: number;
}

export interface PageSpan {
  page: number;
  charStart: number;
  charEnd: number;
}

export interface ChunkOptions {
  targetChars?: number;
  overlapChars?: number;
  maxChars?: number;
  /** Page boundaries in the same coordinates as the text, from a PDF. */
  pages?: PageSpan[];
}

interface Span {
  start: number;
  end: number;
}

// A markdown heading, a numbered section title, or a line in capitals
// (textbook chapter titles, which scanned curriculum notes are full of).
const HEADING = /^\s{0,3}(#{1,6}\s|\d+[.)]\s+[A-Z]|[A-Z][A-Z \d.,:;'()&/-]{6,}$)/;

/** True when a block looks like a heading, which should open a new chunk. */
function isHeading(block: string): boolean {
  const firstLine = block.split('\n', 1)[0] ?? '';
  return HEADING.test(firstLine) && firstLine.length <= 120;
}

/** Paragraph spans of the text, with their surrounding blank lines excluded. */
function paragraphSpans(text: string): Span[] {
  const spans: Span[] = [];
  const pattern = /\n[ \t]*\n+/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    spans.push({ start: cursor, end: match.index });
    cursor = match.index + match[0].length;
  }
  spans.push({ start: cursor, end: text.length });

  return spans
    .map((span) => trimSpan(text, span))
    .filter((span) => span.end > span.start);
}

/** Moves a span's edges inward past whitespace. */
function trimSpan(text: string, span: Span): Span {
  let { start, end } = span;
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return { start, end };
}

/** Cuts an over-long paragraph at sentence ends, falling back to a hard cut. */
function splitLongSpan(text: string, span: Span, maxChars: number): Span[] {
  const parts: Span[] = [];
  let start = span.start;

  while (span.end - start > maxChars) {
    const limit = start + maxChars;
    const window = text.slice(start, limit);
    // Prefer a sentence end, then any whitespace, then give up and cut.
    const sentence = Math.max(
      window.lastIndexOf('. '),
      window.lastIndexOf('! '),
      window.lastIndexOf('? '),
      window.lastIndexOf('\n'),
    );
    let cut: number;
    if (sentence > maxChars * 0.4) {
      cut = start + sentence + 1;
    } else {
      const space = window.lastIndexOf(' ');
      cut = space > maxChars * 0.4 ? start + space : limit;
    }
    parts.push(trimSpan(text, { start, end: cut }));
    start = cut;
  }

  const tail = trimSpan(text, { start, end: span.end });
  if (tail.end > tail.start) parts.push(tail);
  return parts.filter((part) => part.end > part.start);
}

/** The page a chunk starts on, or undefined when the source has no pages. */
function pageAt(offset: number, pages?: PageSpan[]): number | undefined {
  if (!pages || pages.length === 0) return undefined;
  for (const page of pages) {
    if (offset >= page.charStart && offset < page.charEnd) return page.page;
  }
  // Past the last recorded page: attribute it to the last one.
  return pages[pages.length - 1]?.page;
}

/**
 * Moves `start` back by up to `overlap` characters to repeat the tail of the
 * previous chunk, snapping forward to a word boundary and never reaching past
 * `floor` (the previous chunk's midpoint), so a chunk cannot swallow the one
 * before it.
 */
function withOverlap(text: string, start: number, overlap: number, floor: number): number {
  if (overlap <= 0) return start;
  let from = Math.max(floor, start - overlap);
  if (from === start) return start;
  // Snap forward so a chunk never opens mid-word.
  while (from < start && !/\s/.test(text[from - 1] ?? ' ')) from += 1;
  while (from < start && /\s/.test(text[from])) from += 1;
  return from < start ? from : start;
}

export function chunkText(text: string, options: ChunkOptions = {}): Chunk[] {
  const targetChars = options.targetChars ?? TARGET_CHARS;
  const overlapChars = options.overlapChars ?? OVERLAP_CHARS;
  const maxChars = options.maxChars ?? MAX_CHARS;

  if (!text.trim()) return [];

  // Flatten paragraphs into blocks, cutting any that are too long on their own.
  const blocks: { span: Span; heading: boolean }[] = [];
  for (const span of paragraphSpans(text)) {
    const block = text.slice(span.start, span.end);
    const heading = isHeading(block);
    if (span.end - span.start <= maxChars) {
      blocks.push({ span, heading });
      continue;
    }
    for (const part of splitLongSpan(text, span, maxChars)) {
      blocks.push({ span: part, heading: heading && part.start === span.start });
    }
  }

  const chunks: Chunk[] = [];
  let current: Span | null = null;
  /** Set when the current chunk opens with a heading, which skips the overlap. */
  let openedWithHeading = false;
  let previous: Span | null = null;

  const flush = (): void => {
    if (!current) return;
    // A heading is the title of what follows, so it must be the first thing in
    // the chunk: no tail of the previous section in front of it.
    const floor = previous ? previous.start + Math.floor((previous.end - previous.start) / 2) : 0;
    const start =
      chunks.length === 0 || openedWithHeading
        ? current.start
        : withOverlap(text, current.start, overlapChars, floor);

    const chunk: Chunk = {
      ord: chunks.length,
      text: text.slice(start, current.end),
      charStart: start,
      charEnd: current.end,
    };
    // The page is where the chunk's own content starts; the overlap in front
    // is context repeated from the chunk before it.
    const page = pageAt(current.start, options.pages);
    if (page !== undefined) chunk.page = page;

    chunks.push(chunk);
    previous = { ...current };
    current = null;
  };

  for (const block of blocks) {
    if (!current) {
      current = { ...block.span };
      openedWithHeading = block.heading;
      continue;
    }
    const grown = block.span.end - current.start;
    // A heading opens a new chunk, and so does passing the target size.
    if (block.heading || grown > targetChars) {
      flush();
      current = { ...block.span };
      openedWithHeading = block.heading;
      continue;
    }
    current.end = block.span.end;
  }
  flush();

  return chunks;
}

/**
 * Chunks a paged source (a PDF), returning the joined text so callers can
 * store it and resolve `charStart`/`charEnd` against it later.
 */
export function chunkPages(
  pages: { page: number; text: string }[],
  options: Omit<ChunkOptions, 'pages'> = {},
): { text: string; chunks: Chunk[] } {
  const separator = '\n\n';
  const spans: PageSpan[] = [];
  let joined = '';

  for (const page of pages) {
    if (joined) joined += separator;
    const charStart = joined.length;
    joined += page.text;
    spans.push({ page: page.page, charStart, charEnd: joined.length + separator.length });
  }

  return { text: joined, chunks: chunkText(joined, { ...options, pages: spans }) };
}

/**
 * Text extraction for uploads, shared by `/api/ocr` and the source ingestion
 * pipeline so there is one implementation of "read this file".
 *
 * PDFs come back page by page, because the chunker needs page numbers to tell
 * a learner where a cited passage lives.
 */

import mammoth from 'mammoth';

export type FileKind = 'text' | 'docx' | 'pdf' | 'image';

export interface ExtractedPage {
  page: number;
  text: string;
}

export interface Extracted {
  text: string;
  /** Present only for PDFs, in reading order. */
  pages?: ExtractedPage[];
  kind: FileKind;
}

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'text']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);

export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** What Sautika can read, in learner-facing words. */
export const SUPPORTED_TYPES_MESSAGE =
  'Sautika can read PDF, Word (.docx), text, Markdown, CSV, JSON and photos of notes.';

/** Decides how to read an upload, or null when the type is not supported. */
export function classify(ext: string, mimeType: string): FileKind | null {
  if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/') || mimeType === 'application/json') {
    return 'text';
  }
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith('image/')) return 'image';
  return null;
}

/** The extension of a file name, lower-cased and without the dot. */
export function extensionOf(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() ?? '';
}

function normalise(value: string): string {
  return value.replace(/\r\n/g, '\n').trim();
}

/**
 * pdf-parse v2 exports a `PDFParse` class whose `getText()` returns per-page
 * text; v1 exported a function with only the whole document. Both are handled
 * so the code survives either version being installed.
 */
export async function extractPdf(buffer: Buffer): Promise<{ text: string; pages?: ExtractedPage[] }> {
  try {
    const mod = (await import('pdf-parse')) as unknown as {
      PDFParse?: new (options: { data: Buffer }) => {
        getText: () => Promise<{ text?: string; pages?: { num: number; text: string }[] }>;
        destroy?: () => Promise<void> | void;
      };
      default?: (buffer: Buffer) => Promise<{ text?: string }>;
    };

    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy?.();

      const pages = (result.pages ?? [])
        .map((page) => ({ page: page.num, text: normalise(page.text ?? '') }))
        .filter((page) => page.text.length > 0);

      if (pages.length > 0) {
        return { text: pages.map((page) => page.text).join('\n\n'), pages };
      }
      return { text: normalise(result.text ?? '') };
    }

    if (typeof mod.default === 'function') {
      const result = await mod.default(buffer);
      return { text: normalise(result?.text ?? '') };
    }

    console.warn('pdf-parse exposed neither PDFParse nor a default function.');
    return { text: '' };
  } catch (error) {
    console.warn('pdf-parse error:', error);
    return { text: '' };
  }
}

/** OCR.Space first (two keys), then tesseract.js locally. */
export async function extractImage(buffer: Buffer, mimeType: string): Promise<string> {
  const ocrKeys = Array.from(
    new Set([process.env.OCR_SPACE_API_KEY, process.env.OCR_SPACE_API_KEY_FALLBACK]),
  ).filter((key): key is string => Boolean(key));

  for (const key of ocrKeys) {
    try {
      const form = new FormData();
      form.append(
        'base64Image',
        `data:${mimeType || 'image/jpeg'};base64,${buffer.toString('base64')}`,
      );
      form.append('apikey', key);
      form.append('language', 'eng');
      form.append('OCREngine', '2');
      form.append('isOverlayRequired', 'false');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) continue;

      const json = (await response.json()) as {
        ParsedResults?: { ParsedText?: string }[];
        IsErroredOnProcessing?: boolean;
      };
      const text = (json.ParsedResults ?? [])
        .map((result) => result.ParsedText ?? '')
        .join('\n')
        .trim();
      if (text) return text;
    } catch (error) {
      console.warn('OCR.Space attempt failed, trying the next option:', error);
    }
  }

  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const result = await worker.recognize(buffer);
    await worker.terminate();
    return result.data.text;
  } catch (error) {
    console.error('Tesseract fallback failed:', error);
    return '';
  }
}

/**
 * Reads a buffer into text. Throws a learner-facing message for a type we
 * cannot read; returns empty text when a supported file yields nothing, which
 * the caller reports as a failed source rather than saving as a note.
 */
export async function extractBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<Extracted> {
  const kind = classify(extensionOf(fileName), mimeType || '');
  if (!kind) throw new Error(SUPPORTED_TYPES_MESSAGE);

  if (kind === 'text') {
    return { kind, text: normalise(buffer.toString('utf-8')) };
  }
  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return { kind, text: normalise(result.value) };
  }
  if (kind === 'pdf') {
    const result = await extractPdf(buffer);
    return result.pages
      ? { kind, text: result.text, pages: result.pages }
      : { kind, text: result.text };
  }
  return { kind, text: normalise(await extractImage(buffer, mimeType)) };
}

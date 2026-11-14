import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { guardUser } from '@/lib/api-guard';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json', 'text']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif']);

type FileKind = 'text' | 'docx' | 'pdf' | 'image';

/** Decides how to read the upload, or null when we do not support the type. */
function classify(ext: string, mimeType: string): FileKind | null {
  if (TEXT_EXTENSIONS.has(ext) || mimeType.startsWith('text/') || mimeType === 'application/json') {
    return 'text';
  }
  if (ext === 'docx' || mimeType.includes('wordprocessingml')) return 'docx';
  if (ext === 'pdf' || mimeType === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext) || mimeType.startsWith('image/')) return 'image';
  return null;
}

/**
 * Universal document text extraction and OCR.
 * Accepts multipart/form-data with a "file" field:
 * - PDF (pdf-parse v2, with a v1 fallback)
 * - Word .docx (mammoth)
 * - Plain text, Markdown, CSV, JSON
 * - Images (OCR.Space, falling back to tesseract.js)
 */
export async function POST(req: NextRequest) {
  const guard = await guardUser('ocr', 10);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'That file is empty.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: 'That file is larger than 10 MB. Try a smaller photo or a single chapter.' },
        { status: 413 },
      );
    }

    const fileName = file.name;
    const fileType = file.type || '';
    const ext = fileName.toLowerCase().split('.').pop() || '';
    const kind = classify(ext, fileType);

    if (!kind) {
      return NextResponse.json(
        {
          error:
            'Sautika can read PDF, Word (.docx), text, Markdown, CSV, JSON and photos of notes.',
        },
        { status: 415 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    if (kind === 'text') {
      extractedText = buffer.toString('utf-8');
    } else if (kind === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    } else if (kind === 'pdf') {
      extractedText = await extractPdfText(buffer);
    } else {
      extractedText = await extractImageText(buffer, fileType);
    }

    extractedText = extractedText.replace(/\r\n/g, '\n').trim();

    if (!extractedText) {
      extractedText = `(No readable text could be extracted from ${fileName})`;
    }

    // Short learner-facing summary, if any LLM provider is configured.
    let summary = '';
    let aiProvider = '';
    if (extractedText.length > 50) {
      try {
        const { generateAIResponse } = await import('@/lib/llm-providers');
        const aiResult = await generateAIResponse({
          prompt:
            'Summarise this study document into 4 short bullet points a student can revise from.',
          systemPrompt:
            'You are Sautika, an encouraging study assistant for East African students. Keep summaries clear, concise and structured.',
          maxTokens: 500,
          heuristicSource: extractedText.slice(0, 12_000),
        });
        summary = aiResult.text;
        aiProvider = aiResult.provider;
      } catch (sumErr) {
        console.warn('AI summary generation error:', sumErr);
      }
    }

    // Keep the original file in R2 under a per-user prefix so one learner's
    // uploads are never guessable from another learner's key.
    let r2Url: string | undefined;
    let r2Key: string | undefined;
    try {
      const { uploadToR2 } = await import('@/lib/r2');
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uploadResult = await uploadToR2({
        key: `uploads/${safeUserId}/${Date.now()}_${safeName}`,
        body: buffer,
        contentType: fileType || 'application/octet-stream',
        metadata: { originalName: safeName },
      });
      r2Url = uploadResult.url;
      r2Key = uploadResult.key;
    } catch (r2Err) {
      console.warn('R2 document upload skipped/failed:', r2Err);
    }

    return NextResponse.json({
      success: true,
      fileName,
      text: extractedText,
      summary: summary || undefined,
      aiProvider: aiProvider || undefined,
      characterCount: extractedText.length,
      r2Url,
      r2Key,
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: 'We could not read that file. Try a clearer photo or another format.' },
      { status: 500 },
    );
  }
}

/**
 * pdf-parse v2 exports a `PDFParse` class; v1 exported a function.
 * Support both so the route survives either version being installed.
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const mod = (await import('pdf-parse')) as any;
    if (mod.PDFParse) {
      const parser = new mod.PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy?.();
      return typeof result?.text === 'string' ? result.text : '';
    }
    if (typeof mod.default === 'function') {
      const result = await mod.default(buffer);
      return typeof result?.text === 'string' ? result.text : '';
    }
    console.warn('pdf-parse exposed neither PDFParse nor a default function.');
    return '';
  } catch (pdfErr) {
    console.warn('pdf-parse error:', pdfErr);
    return '';
  }
}

async function extractImageText(buffer: Buffer, fileType: string): Promise<string> {
  const ocrKeys = Array.from(
    new Set([process.env.OCR_SPACE_API_KEY, process.env.OCR_SPACE_API_KEY_FALLBACK]),
  ).filter(Boolean) as string[];

  for (const key of ocrKeys) {
    try {
      const ocrFormData = new FormData();
      ocrFormData.append(
        'base64Image',
        `data:${fileType || 'image/jpeg'};base64,${buffer.toString('base64')}`,
      );
      ocrFormData.append('apikey', key);
      ocrFormData.append('language', 'eng');
      ocrFormData.append('OCREngine', '2');
      ocrFormData.append('isOverlayRequired', 'false');

      const ocrRes = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: ocrFormData,
        signal: AbortSignal.timeout(30_000),
      });

      if (!ocrRes.ok) continue;
      const ocrJson = (await ocrRes.json()) as {
        ParsedResults?: { ParsedText?: string }[];
        IsErroredOnProcessing?: boolean;
      };
      const text = (ocrJson.ParsedResults ?? [])
        .map((r) => r.ParsedText || '')
        .join('\n')
        .trim();
      if (text) return text;
    } catch (ocrApiErr) {
      console.warn('OCR.Space attempt failed, trying the next option:', ocrApiErr);
    }
  }

  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const ret = await worker.recognize(buffer);
    await worker.terminate();
    return ret.data.text;
  } catch (tessErr) {
    console.error('Tesseract fallback failed:', tessErr);
    return '';
  }
}

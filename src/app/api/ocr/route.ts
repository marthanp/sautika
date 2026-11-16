import { NextRequest, NextResponse } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import {
  classify,
  extensionOf,
  extractBuffer,
  MAX_FILE_BYTES,
  SUPPORTED_TYPES_MESSAGE,
} from '@/lib/notebooks/extract';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Universal document text extraction and OCR.
 * Accepts multipart/form-data with a "file" field:
 * - PDF (pdf-parse v2, with a v1 fallback)
 * - Word .docx (mammoth)
 * - Plain text, Markdown, CSV, JSON
 * - Images (OCR.Space, falling back to tesseract.js)
 *
 * The reading itself lives in `src/lib/notebooks/extract.ts`, shared with the
 * source ingestion pipeline so there is one implementation of each format.
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

    if (!classify(extensionOf(fileName), fileType)) {
      return NextResponse.json({ error: SUPPORTED_TYPES_MESSAGE }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractBuffer(buffer, fileName, fileType);
    let extractedText = extracted.text;

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

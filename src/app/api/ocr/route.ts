import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

/**
 * Universal Document Text Extraction and OCR Route
 * Accepts multipart/form-data with a "file" field.
 * Handles:
 * - PDF documents (via pdf-parse)
 * - Microsoft Word documents (.docx via mammoth)
 * - Plain text / Markdown (.txt, .md, .csv, .json)
 * - Images (PNG, JPG, JPEG, WEBP) using OCR API (OCR.Space) with fallback to tesseract.js
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileName = file.name;
    const fileType = file.type || '';
    const buffer = Buffer.from(await file.arrayBuffer());
    let extractedText = '';

    const ext = fileName.toLowerCase().split('.').pop() || '';

    // 1. Plain text, markdown, csv, json
    if (['txt', 'md', 'csv', 'json', 'text'].includes(ext) || fileType.startsWith('text/')) {
      extractedText = buffer.toString('utf-8');
    }
    // 2. Word documents (.docx)
    else if (ext === 'docx' || fileType.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value;
    }
    // 3. PDF documents
    else if (ext === 'pdf' || fileType === 'application/pdf') {
      try {
        // dynamic import of pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
      } catch (pdfErr) {
        console.warn('pdf-parse error, trying fallback:', pdfErr);
      }
    }
    // 4. Images (.png, .jpg, .jpeg, .webp, .bmp, .gif)
    else if (
      ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'].includes(ext) ||
      fileType.startsWith('image/')
    ) {
      // Attempt 1: OCR.Space cloud API (read securely from environment variables)
      const primaryKey = process.env.OCR_SPACE_API_KEY;
      const fallbackKey = process.env.OCR_SPACE_API_KEY_FALLBACK;
      const ocrKeys = Array.from(new Set([primaryKey, fallbackKey])).filter(Boolean) as string[];

      for (const key of ocrKeys) {
        if (extractedText) break;
        try {
          const ocrFormData = new FormData();
          ocrFormData.append('base64Image', `data:${fileType || 'image/jpeg'};base64,${buffer.toString('base64')}`);
          ocrFormData.append('apikey', key);
          ocrFormData.append('language', 'eng');
          ocrFormData.append('isOverlayRequired', 'false');

          const ocrRes = await fetch('https://api.ocr.space/parse/image', {
            method: 'POST',
            body: ocrFormData,
          });

          if (ocrRes.ok) {
            const ocrJson = (await ocrRes.json()) as {
              ParsedResults?: { ParsedText?: string }[];
              IsErroredOnProcessing?: boolean;
            };
            if (ocrJson.ParsedResults && ocrJson.ParsedResults.length > 0) {
              const text = ocrJson.ParsedResults.map((r) => r.ParsedText || '').join('\n').trim();
              if (text) {
                extractedText = text;
                break;
              }
            }
          }
        } catch (ocrApiErr) {
          console.warn('OCR.Space API attempt failed, trying next option:', ocrApiErr);
        }
      }

      // Fallback: Local Tesseract.js if OCR api was empty
      if (!extractedText) {
        try {
          const { createWorker } = await import('tesseract.js');
          const worker = await createWorker('eng');
          const ret = await worker.recognize(buffer);
          extractedText = ret.data.text;
          await worker.terminate();
        } catch (tessErr) {
          console.error('Tesseract fallback failed:', tessErr);
        }
      }
    } else {
      // Generic binary / text fallback
      extractedText = buffer.toString('utf-8');
    }

    // Clean up text
    extractedText = extractedText.replace(/\r\n/g, '\n').trim();

    if (!extractedText) {
      extractedText = `(No readable text could be extracted from ${fileName})`;
    }

    // Generate concise learner summary with active LLM providers
    let summary = '';
    let aiProvider = '';
    if (extractedText.length > 50) {
      try {
        const { generateAIResponse } = await import('@/lib/llmProviders');
        const aiResult = await generateAIResponse({
          prompt: `Summarize this study document into 4 concise bullet points for a student with key learning takeaways:\n\n${extractedText.slice(0, 12000)}`,
          systemPrompt: 'You are Sautika, an encouraging study assistant for East African students. Keep summaries clear, concise, and structured.',
          maxTokens: 500,
        });
        summary = aiResult.text;
        aiProvider = aiResult.provider;
      } catch (sumErr) {
        console.warn('AI summary generation error:', sumErr);
      }
    }

    return NextResponse.json({
      success: true,
      fileName,
      text: extractedText,
      summary: summary || undefined,
      aiProvider: aiProvider || undefined,
      characterCount: extractedText.length,
    });
  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze document' },
      { status: 500 }
    );
  }
}

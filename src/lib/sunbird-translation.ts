import { normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function translateWithSunbird(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<string> {
  if (sourceLanguage === targetLanguage) return text;

  const key = process.env.SUNBIRD_API_KEY;
  if (!key) throw new Error('Sunbird translation is not configured.');
  const baseUrl = (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/tasks/translate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      text,
      source_language: normalizeSunbirdLanguage(sourceLanguage),
      target_language: normalizeSunbirdLanguage(targetLanguage),
    }),
  });
  if (!response.ok) {
    console.error('Sunbird translation request failed:', response.status);
    throw new Error('Sunbird translation is temporarily unavailable. Please try again.');
  }

  const result: unknown = await response.json();
  if (
    !isRecord(result) ||
    !isRecord(result.output) ||
    typeof result.output.translated_text !== 'string' ||
    !result.output.translated_text.trim()
  ) {
    console.error('Sunbird translation returned an invalid response.');
    throw new Error('Sunbird translation returned an invalid response.');
  }
  return result.output.translated_text.trim();
}

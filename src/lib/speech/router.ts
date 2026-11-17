/**
 * Which ears hear the learner.
 *
 * AssemblyAI is the ears for English. Sunbird handles the Ugandan and East
 * African languages, and stays the translation and voice layer for every
 * language, English included.
 *
 * The decision is split into two pure functions — `chooseProvider` before the
 * audio goes anywhere, and `acceptTranscript` once a result is back — so the
 * table in the brief is testable without a network call.
 *
 * Checked against the AssemblyAI docs (November 2026):
 *  - the API key goes in `authorization` with **no** `Bearer` prefix;
 *  - `speech_models` is a priority-ordered array, default
 *    `["universal-3-5-pro", "universal-2"]`;
 *  - `language_confidence_threshold` makes the API *fail* the request below
 *    the threshold, which is not what we want: we want to fall back to
 *    Sunbird. So the threshold is applied here, to the returned
 *    `language_confidence`, and never sent.
 */

import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

export type SpeechProvider = 'assemblyai' | 'sunbird';

/** Languages AssemblyAI is asked to expect. */
const EXPECTED_LANGUAGES = ['en', 'sw'];
const DEFAULT_SPEECH_MODELS = ['universal-3-5-pro', 'universal-2'];
const DEFAULT_EN_CONFIDENCE = 0.8;
/** Clips longer than this go to a background job instead of being polled. */
export const INLINE_SECONDS = 60;
const POLL_INTERVAL_MS = 1200;
const POLL_TIMEOUT_MS = 45_000;
const ASSEMBLY_BASE = 'https://api.assemblyai.com/v2';

export interface Decision {
  provider: SpeechProvider;
  /** Why, for the server log and the decision-table tests. */
  reason: string;
  /** True when a weak result should be retried on the other provider. */
  mayFallBack: boolean;
}

export function assemblyConfigured(): boolean {
  return Boolean(process.env.ASSEMBLYAI_API_KEY);
}

export function sunbirdConfigured(): boolean {
  return Boolean(process.env.SUNBIRD_API_KEY);
}

export function englishConfidenceThreshold(): number {
  const raw = Number(process.env.ASSEMBLYAI_EN_CONFIDENCE);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : DEFAULT_EN_CONFIDENCE;
}

export function speechModels(): string[] {
  const raw = process.env.ASSEMBLYAI_SPEECH_MODELS;
  if (!raw) return DEFAULT_SPEECH_MODELS;
  const models = raw.split(',').map((part) => part.trim()).filter(Boolean);
  return models.length > 0 ? models : DEFAULT_SPEECH_MODELS;
}

/**
 * Step 2 of the pipeline: English or `auto` goes to AssemblyAI; a Sunbird
 * language goes to Sunbird; and whichever provider is missing a key is simply
 * not an option.
 */
export function chooseProvider(options: {
  language: string;
  assembly?: boolean;
  sunbird?: boolean;
}): Decision | null {
  const assembly = options.assembly ?? assemblyConfigured();
  const sunbird = options.sunbird ?? sunbirdConfigured();
  const raw = (options.language || 'auto').trim().toLowerCase();
  const isAuto = raw === 'auto' || raw === '';
  const language = isAuto ? 'auto' : normalizeSunbirdLanguage(raw);
  const wantsEnglish = isAuto || language === 'eng';

  if (wantsEnglish) {
    if (assembly) {
      return {
        provider: 'assemblyai',
        reason: isAuto ? 'language is auto' : 'language is English',
        // Only worth retrying elsewhere if Sunbird could actually answer.
        mayFallBack: sunbird,
      };
    }
    if (sunbird) {
      return { provider: 'sunbird', reason: 'AssemblyAI is not configured', mayFallBack: false };
    }
    return null;
  }

  if (sunbird) {
    return { provider: 'sunbird', reason: 'Sunbird language', mayFallBack: false };
  }
  // A Sunbird language with no Sunbird key: AssemblyAI cannot help here, and
  // guessing in the wrong language is worse than saying so.
  return null;
}

/**
 * Steps 3 and 4: keep an AssemblyAI transcript only when it is English, and
 * confident enough. Anything else goes to Sunbird, which knows the local
 * languages.
 *
 * `requireConfidence` is the part worth explaining. The confidence gate exists
 * for one case: the learner chose `auto`, so we are relying on AssemblyAI's
 * language detection and need to know it is sure. When the learner has
 * explicitly chosen English we are not relying on detection at all, and
 * applying the gate actively hurts: a short question carries little audio to
 * judge a language from, so it scores low even when the transcript is
 * perfect. Real example from testing — "Why do leaves look green?" came back
 * word for word at 0.75 confidence, and the gate would have thrown it away
 * and sent the audio to Sunbird for no reason.
 */
export function acceptTranscript(options: {
  text: string;
  languageCode?: string;
  confidence?: number;
  threshold?: number;
  /** True only when the language was not stated and detection is load-bearing. */
  requireConfidence?: boolean;
}): { accept: boolean; reason: string } {
  const threshold = options.threshold ?? englishConfidenceThreshold();

  if (!options.text.trim()) return { accept: false, reason: 'empty transcript' };

  const code = (options.languageCode ?? '').toLowerCase();
  // `en`, `en_us`, `en_au` all count as English.
  const isEnglish = code === 'en' || code.startsWith('en_') || code.startsWith('en-');
  if (!isEnglish) {
    return { accept: false, reason: `detected ${code || 'unknown'}, not English` };
  }

  const confidence = options.confidence;
  const gated = options.requireConfidence ?? true;
  if (gated && typeof confidence === 'number' && confidence < threshold) {
    return { accept: false, reason: `confidence ${confidence.toFixed(2)} below ${threshold}` };
  }

  return {
    accept: true,
    reason: gated ? 'confident English' : 'English, as the learner chose',
  };
}

export interface SpeechResult {
  text: string;
  language: string;
  provider: SpeechProvider;
  confidence?: number;
}

function assemblyHeaders(key: string): Record<string, string> {
  // No `Bearer`: AssemblyAI takes the raw key.
  return { authorization: key };
}

/** Uploads the audio and returns the URL AssemblyAI can read it from. */
async function uploadToAssembly(key: string, audio: Blob): Promise<string> {
  const response = await fetch(`${ASSEMBLY_BASE}/upload`, {
    method: 'POST',
    headers: { ...assemblyHeaders(key), 'Content-Type': 'application/octet-stream' },
    body: await audio.arrayBuffer(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`AssemblyAI upload responded with ${response.status}`);

  const data = (await response.json()) as { upload_url?: string };
  if (!data.upload_url) throw new Error('AssemblyAI upload returned no URL.');
  return data.upload_url;
}

/**
 * Submits a transcript job. `keyterms` are the notebook's source-guide topics,
 * so subject vocabulary ("photosynthesis", "Buganda") is recognised.
 */
async function submitAssembly(
  key: string,
  audioUrl: string,
  options: { keyterms?: string[]; webhookUrl?: string },
): Promise<string> {
  const body: Record<string, unknown> = {
    audio_url: audioUrl,
    speech_models: speechModels(),
    language_detection: true,
    language_detection_options: {
      expected_languages: EXPECTED_LANGUAGES,
      fallback_language: 'auto',
    },
  };

  // `keyterms_prompt` and `prompt` are mutually exclusive on the current
  // models, so only the key terms are sent.
  const keyterms = (options.keyterms ?? [])
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && term.split(/\s+/).length <= 6)
    .slice(0, 100);
  if (keyterms.length > 0) body.keyterms_prompt = keyterms;

  if (options.webhookUrl) body.webhook_url = options.webhookUrl;

  const response = await fetch(`${ASSEMBLY_BASE}/transcript`, {
    method: 'POST',
    headers: { ...assemblyHeaders(key), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`AssemblyAI submit responded with ${response.status}`);

  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error('AssemblyAI submit returned no id.');
  return data.id;
}

interface AssemblyTranscript {
  status: string;
  text?: string;
  language_code?: string;
  language_confidence?: number;
  error?: string;
}

export async function fetchAssemblyTranscript(
  key: string,
  id: string,
): Promise<AssemblyTranscript> {
  const response = await fetch(`${ASSEMBLY_BASE}/transcript/${encodeURIComponent(id)}`, {
    headers: assemblyHeaders(key),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`AssemblyAI poll responded with ${response.status}`);
  return (await response.json()) as AssemblyTranscript;
}

/** Polls until the transcript is done. Short clips only; long ones use Inngest. */
async function pollAssembly(key: string, id: string): Promise<AssemblyTranscript> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const transcript = await fetchAssemblyTranscript(key, id);
    if (transcript.status === 'completed') return transcript;
    if (transcript.status === 'error') {
      throw new Error(transcript.error || 'AssemblyAI could not transcribe that audio.');
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error('AssemblyAI did not finish in time.');
}

/** Submits audio to AssemblyAI without waiting, for the background job. */
export async function submitAssemblyJob(
  audio: Blob,
  options: { keyterms?: string[]; webhookUrl?: string } = {},
): Promise<string> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error('AssemblyAI is not configured.');
  const audioUrl = await uploadToAssembly(key, audio);
  return submitAssembly(key, audioUrl, options);
}

async function transcribeWithAssembly(
  audio: Blob,
  keyterms: string[],
): Promise<{ text: string; languageCode?: string; confidence?: number }> {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) throw new Error('AssemblyAI is not configured.');

  const audioUrl = await uploadToAssembly(key, audio);
  const id = await submitAssembly(key, audioUrl, { keyterms });
  const transcript = await pollAssembly(key, id);

  return {
    text: (transcript.text ?? '').trim(),
    languageCode: transcript.language_code,
    confidence: transcript.language_confidence,
  };
}

async function transcribeWithSunbird(audio: Blob, language: string): Promise<string> {
  const key = process.env.SUNBIRD_API_KEY;
  if (!key) throw new Error('Sunbird is not configured.');

  const form = new FormData();
  form.append('audio', audio, audio instanceof File ? audio.name : 'speech.webm');
  form.append('language', language);

  const baseUrl = (process.env.SUNBIRD_API_URL ?? 'https://api.sunbird.ai').replace(/\/+$/, '');
  const response = await fetch(`${baseUrl}/tasks/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, accept: 'application/json' },
    body: form,
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`Sunbird transcription responded with ${response.status}`);

  const result = (await response.json()) as { audio_transcription?: unknown };
  if (typeof result.audio_transcription !== 'string') {
    throw new Error('Sunbird transcription returned an invalid response.');
  }
  return result.audio_transcription.trim();
}

/**
 * Transcribes one recording, following the decision table and falling back
 * once when the first provider's answer is not trustworthy.
 */
export async function transcribe(options: {
  audio: Blob;
  language: string;
  /** Source-guide topics, so subject words are recognised. */
  keyterms?: string[];
}): Promise<SpeechResult> {
  const decision = chooseProvider({ language: options.language });
  if (!decision) {
    throw new Error('Speech recognition is not available for that language right now.');
  }

  const fallbackLanguage = (() => {
    const raw = (options.language || 'auto').trim().toLowerCase();
    if (raw === 'auto' || raw === '') return 'eng';
    const normalised = normalizeSunbirdLanguage(raw);
    return isSunbirdLanguage(normalised) ? normalised : 'eng';
  })();

  if (decision.provider === 'assemblyai') {
    try {
      const result = await transcribeWithAssembly(options.audio, options.keyterms ?? []);
      // The confidence gate only matters when we are the ones guessing the
      // language, which is the `auto` case.
      const verdict = acceptTranscript({
        ...result,
        requireConfidence: decision.reason === 'language is auto',
      });

      console.info(
        `[stt] provider=assemblyai accepted=${verdict.accept} reason=${verdict.reason}`,
      );

      if (verdict.accept) {
        return {
          text: result.text,
          language: 'eng',
          provider: 'assemblyai',
          ...(result.confidence !== undefined ? { confidence: result.confidence } : {}),
        };
      }

      if (!decision.mayFallBack) {
        if (result.text) {
          // Nothing better available: return what we heard rather than nothing.
          return { text: result.text, language: 'eng', provider: 'assemblyai' };
        }
        throw new Error('We could not make out that recording. Try again in a quiet place.');
      }
    } catch (error) {
      console.warn('AssemblyAI transcription failed, trying Sunbird:', error);
      if (!decision.mayFallBack) {
        throw new Error('We could not make out that recording. Try again in a quiet place.');
      }
    }

    const text = await transcribeWithSunbird(options.audio, fallbackLanguage);
    console.info('[stt] provider=sunbird reason=fallback');
    return { text, language: fallbackLanguage, provider: 'sunbird' };
  }

  const text = await transcribeWithSunbird(options.audio, fallbackLanguage);
  console.info(`[stt] provider=sunbird reason=${decision.reason}`);
  return { text, language: fallbackLanguage, provider: 'sunbird' };
}

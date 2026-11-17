import { translateMany } from '@/lib/translation-batch';
import { speak } from '@/lib/speech/tts';
import { hasSunbirdTts, isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';
import type { DialogueLine, StudioPayload } from '@/lib/studio/types';

/**
 * The last two steps of a Studio output: putting it in the learner's language,
 * and giving it a voice.
 *
 * Both are deliberately separate from generation. An output is useful in
 * English even if translation fails, and useful on screen even if the voice
 * fails, so neither is allowed to throw away work that already succeeded.
 */

/**
 * Every translatable string in a payload, as a flat list with a setter each.
 * Collecting them this way means one batched translation call for the whole
 * output instead of one per field.
 */
function stringsOf(payload: StudioPayload): { get: () => string; set: (value: string) => void }[] {
  const slots: { get: () => string; set: (value: string) => void }[] = [];
  const add = (get: () => string, set: (value: string) => void): void => {
    if (get().trim()) slots.push({ get, set });
  };

  switch (payload.kind) {
    case 'report':
      add(() => payload.title, (value) => { payload.title = value; });
      add(() => payload.markdown, (value) => { payload.markdown = value; });
      break;

    case 'flashcards':
      payload.cards.forEach((card) => {
        add(() => card.front, (value) => { card.front = value; });
        add(() => card.back, (value) => { card.back = value; });
      });
      break;

    case 'quiz':
      payload.questions.forEach((question) => {
        add(() => question.q, (value) => { question.q = value; });
        add(() => question.a, (value) => { question.a = value; });
        question.d.forEach((_, index) => {
          add(() => question.d[index], (value) => { question.d[index] = value; });
        });
        add(() => question.e, (value) => { question.e = value; });
      });
      break;

    case 'mind_map': {
      const walk = (node: { label: string; children?: { label: string }[] }): void => {
        add(() => node.label, (value) => { node.label = value; });
        for (const child of node.children ?? []) walk(child as typeof node);
      };
      walk(payload.root);
      break;
    }

    case 'infographic':
      add(() => payload.title, (value) => { payload.title = value; });
      if (payload.subtitle !== undefined) {
        add(() => payload.subtitle ?? '', (value) => { payload.subtitle = value; });
      }
      payload.facts.forEach((fact) => {
        add(() => fact.label, (value) => { fact.label = value; });
        // The value may be a number; translating it would only break it.
        if (!/^[\d\s.,%+-]+$/.test(fact.value)) {
          add(() => fact.value, (value) => { fact.value = value; });
        }
      });
      (payload.steps ?? []).forEach((_, index) => {
        add(
          () => payload.steps?.[index] ?? '',
          (value) => {
            if (payload.steps) payload.steps[index] = value;
          },
        );
      });
      break;

    case 'data_table':
      add(() => payload.title, (value) => { payload.title = value; });
      payload.columns.forEach((_, index) => {
        add(() => payload.columns[index], (value) => { payload.columns[index] = value; });
      });
      payload.rows.forEach((row) => {
        row.forEach((cell, index) => {
          // Leave dates and figures alone.
          if (/^[\d\s.,%/+-]+$/.test(cell)) return;
          add(() => row[index], (value) => { row[index] = value; });
        });
      });
      break;

    case 'slide_deck':
    case 'video_overview':
      add(() => payload.title, (value) => { payload.title = value; });
      payload.slides.forEach((slide) => {
        add(() => slide.title, (value) => { slide.title = value; });
        slide.bullets.forEach((_, index) => {
          add(() => slide.bullets[index], (value) => { slide.bullets[index] = value; });
        });
        add(() => slide.notes, (value) => { slide.notes = value; });
      });
      if (payload.kind === 'video_overview') {
        payload.lines.forEach((line) => {
          add(() => line.text, (value) => { line.text = value; });
        });
      }
      break;

    case 'audio_overview':
      add(() => payload.title, (value) => { payload.title = value; });
      payload.lines.forEach((line) => {
        add(() => line.text, (value) => { line.text = value; });
      });
      break;
  }

  return slots;
}

/**
 * Translates a payload in place and returns it. On failure the English
 * payload comes back untouched, which is better than nothing at all.
 */
export async function translateStudioPayload(
  payload: StudioPayload,
  targetLanguage: string,
): Promise<StudioPayload> {
  const target = normalizeSunbirdLanguage(targetLanguage);
  if (target === 'eng') return payload;

  const copy = structuredClone(payload);
  const slots = stringsOf(copy);
  if (slots.length === 0) return copy;

  try {
    const translated = await translateMany(slots.map((slot) => slot.get()), 'eng', target);
    slots.forEach((slot, index) => {
      const value = translated[index];
      if (value) slot.set(value);
    });
    return copy;
  } catch (error) {
    console.warn('Studio translation failed; keeping the English output:', error);
    return payload;
  }
}

/**
 * Gives the spoken outputs a voice. Each line is synthesised on its own so the
 * player can follow the transcript, and a line that fails simply has no audio
 * rather than stopping the rest.
 */
export async function voicePayload(
  payload: StudioPayload,
  language: string,
): Promise<StudioPayload> {
  if (payload.kind !== 'audio_overview' && payload.kind !== 'video_overview') return payload;

  const target = normalizeSunbirdLanguage(language);
  if (!isSunbirdLanguage(target) || !hasSunbirdTts(target)) return payload;

  const voiced: DialogueLine[] = [];
  for (const line of payload.lines) {
    try {
      const segments = await speak(line.text, target);
      const url = segments.find((segment) => segment.audioUrl)?.audioUrl;
      voiced.push(url ? { ...line, audioUrl: url } : { ...line });
    } catch (error) {
      console.warn('Could not synthesise one line of the overview:', error);
      voiced.push({ ...line });
    }
  }

  return { ...payload, lines: voiced };
}

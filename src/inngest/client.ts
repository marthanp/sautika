import { eventType, Inngest, staticSchema } from 'inngest';

/**
 * The Inngest client and the events Sautika sends.
 *
 * Background work goes through here: source ingestion, Studio generation,
 * batched translation and the nightly backup. All of it is optional — when
 * `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are unset, `events.ts` runs
 * the same pipelines inline, so the app works without an Inngest account.
 *
 * Locally: `npx inngest-cli@latest dev` alongside `npm run dev`, with
 * `INNGEST_DEV=1` set (see the README).
 *
 * Event typing follows the v4 API (`eventType` + `staticSchema`); the v3
 * `EventSchemas` class no longer exists.
 */

/** A file has landed in R2 and needs extracting, chunking and embedding. */
export const sourceUploaded = eventType('source/uploaded', {
  schema: staticSchema<{ sourceId: string; userId: string }>(),
});

/** A web page was added as a source and needs fetching before the rest. */
export const sourceUrlAdded = eventType('source/url.added', {
  schema: staticSchema<{ sourceId: string; userId: string; url: string }>(),
});

/** A recording was added and needs transcribing before chunking. */
export const sourceAudioUploaded = eventType('source/audio.uploaded', {
  schema: staticSchema<{ sourceId: string; userId: string }>(),
});

/** AssemblyAI finished a transcript, delivered to our webhook. */
export const transcriptCompleted = eventType('assemblyai/transcript.completed', {
  schema: staticSchema<{ transcriptId: string; sourceId: string; userId: string }>(),
});

/** A learner asked Studio for an output. */
export const studioGenerateRequested = eventType('studio/generate.requested', {
  schema: staticSchema<{ outputId: string; userId: string; type: string }>(),
});

/** A batch of strings to translate for a Studio output. */
export const translateBatchRequested = eventType('translate/batch.requested', {
  schema: staticSchema<{ outputId: string; userId: string; targetLanguage: string }>(),
});

export const inngest = new Inngest({
  id: 'sautika',
  // Absent locally, which is what INNGEST_DEV=1 and the dev server are for.
  ...(process.env.INNGEST_EVENT_KEY ? { eventKey: process.env.INNGEST_EVENT_KEY } : {}),
});

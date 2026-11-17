import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { functions } from '@/inngest/functions';

export const runtime = 'nodejs';
/**
 * Background work is why Inngest is here: a 60-page PDF does not fit in a
 * request. The platform's own ceiling still applies per step, which is what
 * the step boundaries in each function are for.
 */
export const maxDuration = 300;

/**
 * Where Inngest reaches the functions.
 *
 * Locally: `npx inngest-cli@latest dev` with `INNGEST_DEV=1` set, alongside
 * `npm run dev`; the dev server discovers this endpoint automatically.
 *
 * Without `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` nothing reaches here,
 * and `src/lib/notebooks/events.ts` runs the same pipelines inline instead.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
  ...(process.env.INNGEST_SIGNING_KEY ? { signingKey: process.env.INNGEST_SIGNING_KEY } : {}),
});

import { inngest } from '@/inngest/client';
import { syncMongoCollectionsToR2 } from '@/lib/r2';

/**
 * The nightly backup, moved off the Vercel cron.
 *
 * It used to be `vercel.json` calling `/api/sync?run=true`, which meant the
 * backup was a public HTTP route guarded by a shared secret, with one shot and
 * no retries. As a scheduled function it retries on its own, and the route
 * stays only for the manual "run it now" case.
 *
 * `/api/sync` is unchanged for that manual use; this just stops the cron from
 * being the thing that triggers it.
 */

/** The collections worth keeping a copy of, as the route backed up. */
const COLLECTIONS = [
  'courses',
  'sources',
  'notes',
  'rewards',
  'course_progress',
  // The notebook workspace: the learner's own material lives here now.
  'notebooks',
  'notebook_sources',
  'notebook_notes',
];

export const nightlyBackup = inngest.createFunction(
  {
    id: 'nightly-backup',
    name: 'Nightly backup to R2',
    triggers: [{ cron: '0 23 * * *' }],
    retries: 2,
  },
  async ({ step }) => {
    const result = await step.run('copy-to-r2', () => syncMongoCollectionsToR2(COLLECTIONS));

    console.info('[backup] nightly backup finished', result);
    return result;
  },
);

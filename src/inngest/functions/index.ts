import { nightlyBackup } from '@/inngest/functions/nightly-backup';
import { sourceIngest, sourceUrlIngest } from '@/inngest/functions/source-ingest';
import { audioSourceTranscribe } from '@/inngest/functions/audio-transcribe';
import { studioGenerate, translateBatch } from '@/inngest/functions/studio-generate';

/** Every function the serve route registers. */
export const functions = [
  sourceIngest,
  sourceUrlIngest,
  audioSourceTranscribe,
  studioGenerate,
  translateBatch,
  nightlyBackup,
];

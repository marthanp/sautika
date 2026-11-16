import type { NextRequest } from 'next/server';
import { guardUser } from '@/lib/api-guard';
import { getDatabase } from '@/lib/mongodb';
import { notebooksCollection } from '@/lib/notebooks/schema';
import { isSunbirdLanguage, normalizeSunbirdLanguage } from '@/lib/sunbird-languages';

export const runtime = 'nodejs';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Whether this learner has been through the tutorial, and a featured notebook
 * for its last step to open.
 */
export async function GET(): Promise<Response> {
  const guard = await guardUser('onboarding', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  const database = await getDatabase();
  const settings = (await database
    .collection('user_settings')
    .findOne(
      { userId },
      { projection: { onboardingCompletedAt: 1, onboardingStep: 1 } },
    )) as { onboardingCompletedAt?: Date; onboardingStep?: number } | null;

  // A ready featured notebook makes a better first try than an empty one.
  let sampleNotebookId: string | null = null;
  try {
    const notebooks = await notebooksCollection();
    const sample = await notebooks.findOne(
      { isFeatured: true, sourceCount: { $gt: 0 } },
      { projection: { _id: 1 }, sort: { title: 1 } },
    );
    sampleNotebookId = sample ? String(sample._id) : null;
  } catch (error) {
    // The tutorial still works without a sample.
    console.warn('Could not pick a sample notebook for onboarding:', error);
  }

  return Response.json({
    completedAt: settings?.onboardingCompletedAt ?? null,
    step: settings?.onboardingStep ?? 0,
    sampleNotebookId,
  });
}

/** Records how far the learner got, and the language they chose. */
export async function POST(req: NextRequest): Promise<Response> {
  const guard = await guardUser('onboarding-write', 60);
  if (!guard.ok) return guard.response;
  const userId = guard.value;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }
  if (!isRecord(body)) {
    return Response.json({ error: 'A JSON request body is required.' }, { status: 400 });
  }

  const step = typeof body.step === 'number' ? Math.max(0, Math.min(10, body.step)) : 0;
  // Skipping counts as done: a learner who closed it should not meet it again.
  const completed = body.completed !== false;

  const update: Record<string, unknown> = {
    onboardingStep: step,
    updatedAt: new Date(),
  };
  if (completed) update.onboardingCompletedAt = new Date();
  if (typeof body.language === 'string' && isSunbirdLanguage(body.language)) {
    update.dialect = normalizeSunbirdLanguage(body.language);
  }

  const database = await getDatabase();
  await database.collection('user_settings').updateOne(
    { userId },
    {
      $set: update,
      // `user_settings` has a strict validator: an insert that omits these is
      // rejected, so a learner who finishes the tutorial before touching any
      // setting still gets a valid row.
      $setOnInsert: {
        userId,
        createdAt: new Date(),
        theme: 'navy',
        colorMode: 'light',
        font: 'default',
        scale: '100%',
        wide: false,
        letterSpacing: 'normal',
        lineHeight: 'normal',
        readingTint: 'none',
      },
    },
    { upsert: true },
  );

  return Response.json({ saved: true, completed });
}

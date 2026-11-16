import type { NextRequest } from 'next/server';
import { requireCronSecret } from '@/lib/api-guard';
import {
  ensureNotebookIndexes,
  FEATURED_OWNER,
  notebooksCollection,
  sourcesCollection,
} from '@/lib/notebooks/schema';
import { COURSES } from '@/data/courses';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Derived ids, so re-seeding updates in place rather than duplicating. */
function featuredNotebookId(courseId: string): string {
  return `nbf_${courseId}`;
}

function featuredSourceId(courseId: string): string {
  return `srcf_${courseId}`;
}

/**
 * Renders a course into study text worth grounding answers in: the
 * description, then each lesson with its questions and correct answers as
 * statements, so a retrieved chunk reads like notes rather than like a quiz.
 */
function courseToText(course: (typeof COURSES)[number]): string {
  const lines: string[] = [`# ${course.title}`, ''];
  if (course.description) lines.push(course.description, '');
  lines.push(`Level: ${course.level}. Subject: ${course.cat}.`, '');

  course.lessons.forEach((lesson, index) => {
    lines.push(`## Lesson ${index + 1}: ${lesson.title}`, '');
    for (const item of lesson.items) {
      if (item.k === 'm') {
        // A multiple-choice question becomes the fact it was testing.
        lines.push(`${item.q} ${item.a}.`);
      } else {
        lines.push(`${item.q}: ${item.a}.`);
      }
    }
    lines.push('');
  });

  if (course.author) lines.push(`Prepared by ${course.author}.`);
  if (course.sourceUrl) lines.push(`Original material: ${course.sourceUrl}`);

  return lines.join('\n');
}

/**
 * Builds a read-only featured notebook from every curriculum course, so the
 * notebooks home has something on it for a learner who has added nothing yet.
 *
 * Operator-only, and idempotent. Sources are left `queued`; chunking and
 * embedding happen through `POST /api/sources/process` (or the Inngest
 * function once it is configured), which keeps this request short.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const unauthorised = requireCronSecret(req);
  if (unauthorised) return unauthorised;

  const [notebooks, sources] = await Promise.all([notebooksCollection(), sourcesCollection()]);
  await ensureNotebookIndexes();

  const now = new Date();
  let written = 0;

  for (const course of COURSES) {
    const notebookId = featuredNotebookId(course.id);
    const sourceId = featuredSourceId(course.id);
    const text = courseToText(course);

    await notebooks.updateOne(
      { _id: notebookId },
      {
        $set: {
          userId: FEATURED_OWNER,
          title: course.title,
          emoji: course.emoji || '📚',
          language: 'eng',
          subject: course.cat,
          courseId: course.id,
          isFeatured: true,
          sourceCount: 1,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    await sources.updateOne(
      { _id: sourceId },
      {
        $set: {
          notebookId,
          userId: FEATURED_OWNER,
          kind: 'course',
          title: `${course.title} (${course.level})`,
          language: 'eng',
          charCount: text.length,
          rawText: text,
          updatedAt: now,
        },
        // Re-seeding re-queues, because the course text may have changed.
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    await sources.updateOne({ _id: sourceId }, { $set: { status: 'queued' } });

    written += 1;
  }

  const queued = await sources.countDocuments({ userId: FEATURED_OWNER, status: 'queued' });

  return Response.json({
    notebooks: written,
    queued,
    next: 'POST /api/sources/process?limit=5 until it reports 0 processed.',
  });
}

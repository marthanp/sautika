import { auth, currentUser } from '@clerk/nextjs/server';
import { ObjectId, type Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

export const runtime = 'nodejs';

const EDUCATION_LEVELS = new Set([
  'Baby Class', 'Middle Class', 'Top Class', 'P.1', 'P.2', 'P.3', 'P.4',
  'P.5', 'P.6', 'P.7', 'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6',
  'Not specified',
]);
const SUBJECTS = new Set(['Mathematics', 'Science', 'English', 'Social Studies', 'Agriculture', 'Life Skills']);
const DEFAULT_SETTINGS = {
  theme: 'navy',
  colorMode: 'light',
  font: 'default',
  scale: '100%',
  wide: false,
  letterSpacing: 'normal',
  lineHeight: 'normal',
  readingTint: 'none',
};
const SETTINGS_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof typeof DEFAULT_SETTINGS)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length <= maxLength;
}

function responseError(error: unknown): Response {
  if (error instanceof Response) return error;
  console.error('Account API error:', error);
  return Response.json({ error: 'Account data is temporarily unavailable.' }, { status: 503 });
}

async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Response('Unauthorized', { status: 401 });
  return userId;
}

function serializeSource(source: Record<string, unknown>, userId: string) {
  return {
    id: String(source._id),
    userId,
    name: source.name,
    text: source.text,
    on: source.enabled,
  };
}

function serializeNote(note: Record<string, unknown>) {
  const createdAt = note.createdAt instanceof Date ? note.createdAt : new Date();
  return {
    id: String(note._id),
    subject: note.subject,
    title: note.title,
    text: note.text,
    date: createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const database = await getDatabase();
    const resource = new URL(request.url).searchParams.get('resource');
    const sourcesCollection = database.collection('sources');
    const notesCollection = database.collection('notes');
    const profilesCollection = database.collection<Document & { _id: string }>('profiles');

    if (resource === 'sources') {
      const sources = await sourcesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray();
      return Response.json({ sources: sources.map((source) => serializeSource(source, userId)) });
    }

    if (resource === 'notes') {
      const notes = await notesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray();
      return Response.json({ notes: notes.map(serializeNote) });
    }

    const [clerkUser, profile, settings, progress, sources, notes] = await Promise.all([
      currentUser(),
      profilesCollection.findOne({ _id: userId }),
      database.collection('user_settings').findOne({ userId }),
      database.collection('course_progress').find({ userId }).toArray(),
      sourcesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray(),
      notesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray(),
    ]);

    if (!clerkUser) return Response.json({ error: 'Clerk user not found.' }, { status: 401 });

    const email = clerkUser.primaryEmailAddress?.emailAddress ?? '';
    const fallbackName = email.split('@')[0] || 'Learner';
    const metadata = isRecord(clerkUser.unsafeMetadata) ? clerkUser.unsafeMetadata : {};
    const requestedEducation = metadata.education;
    const educationLevel =
      typeof requestedEducation === 'string' && EDUCATION_LEVELS.has(requestedEducation)
        ? requestedEducation
        : 'Not specified';
    const now = new Date();

    await profilesCollection.updateOne(
      { _id: userId },
      {
        $set: {
          firstName: clerkUser.firstName || fallbackName,
          lastName: clerkUser.lastName || 'Learner',
          email,
          contact: typeof metadata.contact === 'string' ? metadata.contact.slice(0, 40) : '',
          educationLevel,
          updatedAt: now,
        },
        $setOnInsert: { coins: 0, xp: 0, streak: 0, createdAt: now },
      },
      { upsert: true },
    );

    const savedProfile = await profilesCollection.findOne({ _id: userId });
    const done: Record<string, number> = {};
    const enrolled: string[] = [];

    for (const item of progress) {
      const courseId = String(item.courseId);
      enrolled.push(courseId);
      done[courseId] = Number(item.currentLessonIndex);
    }

    const savedSettings = Object.fromEntries(
      SETTINGS_KEYS.map((key) => [key, settings?.[key] ?? DEFAULT_SETTINGS[key]]),
    );

    return Response.json({
      hasExistingData: Boolean(profile || settings || progress.length || sources.length || notes.length),
      profile: {
        firstName: savedProfile?.firstName ?? fallbackName,
        lastName: savedProfile?.lastName ?? 'Learner',
        email,
        contact: savedProfile?.contact ?? '',
        educationLevel: savedProfile?.educationLevel ?? educationLevel,
        coins: savedProfile?.coins ?? 0,
        xp: savedProfile?.xp ?? 0,
        streak: savedProfile?.streak ?? 0,
      },
      appState: {
        xp: savedProfile?.xp ?? 0,
        streak: savedProfile?.streak ?? 0,
        enrolled,
        done,
        activeCourse: enrolled[0] ?? null,
      },
      settings: savedSettings,
      sources: sources.map((source) => serializeSource(source, userId)),
      notes: notes.map(serializeNote),
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const body: unknown = await request.json();
    if (!isRecord(body) || typeof body.type !== 'string') {
      return Response.json({ error: 'Invalid account update.' }, { status: 400 });
    }

    const database = await getDatabase();
    const now = new Date();
    const profilesCollection = database.collection<Document & { _id: string }>('profiles');
    const sourcesCollection = database.collection<Document & { _id: string }>('sources');
    const notesCollection = database.collection<Document & { _id: string | ObjectId }>('notes');

    if (body.type === 'state') {
      const state = body.state;
      if (
        !isRecord(state) ||
        !Number.isSafeInteger(state.xp) || Number(state.xp) < 0 ||
        !Number.isSafeInteger(state.streak) || Number(state.streak) < 0 ||
        !Array.isArray(state.enrolled) ||
        !state.enrolled.every((id) => boundedString(id, 100)) ||
        !isRecord(state.done) ||
        !SETTINGS_KEYS.every((key) => key in state)
      ) {
        return Response.json({ error: 'Invalid learner state.' }, { status: 400 });
      }

      const done = state.done as Record<string, unknown>;
      const doneEntries = Object.entries(done);
      if (doneEntries.some(([courseId, count]) =>
        !boundedString(courseId, 100) || !Number.isSafeInteger(count) || Number(count) < 0,
      )) {
        return Response.json({ error: 'Invalid course progress.' }, { status: 400 });
      }

      const validSettings: Record<string, unknown> = {};
      for (const key of SETTINGS_KEYS) {
        const value = state[key];
        if (typeof value !== typeof DEFAULT_SETTINGS[key]) {
          return Response.json({ error: `Invalid setting: ${key}.` }, { status: 400 });
        }
        validSettings[key] = value;
      }
      if (
        !['navy', 'parchment', 'contrast'].includes(String(state.theme)) ||
        !['light', 'dark'].includes(String(state.colorMode)) ||
        !['default', 'opendyslexic', 'lexend', 'atkinson', 'comic-neue'].includes(String(state.font)) ||
        !['90%', '100%', '115%', '130%'].includes(String(state.scale)) ||
        !['normal', 'relaxed', 'wide'].includes(String(state.letterSpacing)) ||
        !['normal', 'relaxed', 'loose'].includes(String(state.lineHeight)) ||
        !['none', 'cream', 'yellow', 'peach', 'mint', 'blue'].includes(String(state.readingTint))
      ) {
        return Response.json({ error: 'One or more settings are invalid.' }, { status: 400 });
      }

      const courseIds = new Set<string>([
        ...(state.enrolled as string[]),
        ...doneEntries.map(([id]) => id),
      ]);
      await Promise.all([
        profilesCollection.updateOne(
          { _id: userId },
          { $set: { xp: state.xp, streak: state.streak, updatedAt: now } },
        ),
        database.collection('user_settings').updateOne(
          { userId },
          { $set: { ...validSettings, updatedAt: now } },
          { upsert: true },
        ),
        ...Array.from(courseIds, (courseId) => {
          const currentLessonIndex = Number(done[courseId] ?? 0);
          return database.collection('course_progress').updateOne(
            { userId, courseId },
            {
              $set: {
                currentLessonIndex,
                completedLessonIndexes: Array.from({ length: currentLessonIndex }, (_, index) => index),
                xpEarned: state.xp,
                updatedAt: now,
              },
              $setOnInsert: { enrolledAt: now },
            },
            { upsert: true },
          );
        }),
      ]);

      return Response.json({ ok: true });
    }

    if (body.type === 'source') {
      if (body.action === 'delete') {
        if (!boundedString(body.id, 100)) return Response.json({ error: 'Invalid source ID.' }, { status: 400 });
        await sourcesCollection.deleteOne({ _id: body.id, userId });
        return Response.json({ ok: true });
      }

      const source = body.source;
      if (
        !isRecord(source) ||
        !boundedString(source.id, 100) ||
        !boundedString(source.name, 200) || !source.name.trim() ||
        !boundedString(source.text, 1_000_000) ||
        typeof source.on !== 'boolean'
      ) {
        return Response.json({ error: 'Invalid notebook source.' }, { status: 400 });
      }

      await sourcesCollection.updateOne(
        { _id: source.id, userId },
        {
          $set: { name: source.name.trim(), text: source.text, enabled: source.on, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      return Response.json({ ok: true });
    }

    if (body.type === 'note') {
      if (body.action === 'delete') {
        if (!boundedString(body.id, 100)) return Response.json({ error: 'Invalid note ID.' }, { status: 400 });
        await notesCollection.deleteOne({
          _id: ObjectId.isValid(body.id) ? new ObjectId(body.id) : body.id,
          userId,
        });
        return Response.json({ ok: true });
      }

      const note = body.note;
      if (
        !isRecord(note) ||
        !boundedString(note.id, 100) ||
        !boundedString(note.subject, 80) || !SUBJECTS.has(note.subject) ||
        !boundedString(note.title, 200) || !note.title.trim() ||
        !boundedString(note.text, 50_000)
      ) {
        return Response.json({ error: 'Invalid note.' }, { status: 400 });
      }

      const noteId = ObjectId.isValid(note.id) ? new ObjectId(note.id) : note.id;
      await notesCollection.updateOne(
        { _id: noteId, userId },
        {
          $set: { subject: note.subject, title: note.title.trim(), text: note.text, updatedAt: now },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true },
      );
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Unsupported account update.' }, { status: 400 });
  } catch (error) {
    return responseError(error);
  }
}

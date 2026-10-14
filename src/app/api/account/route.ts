import { auth, currentUser } from '@clerk/nextjs/server';
import { ObjectId, type Document } from 'mongodb';
import { getDatabase, getMongoClient } from '@/lib/mongodb';
import { COURSES as CURRICULUM } from '@/data/courses';
import { REWARDS as REWARD_CATALOG } from '@/lib/data';

export const runtime = 'nodejs';

const EDUCATION_LEVELS = new Set([
  'Baby Class', 'Middle Class', 'Top Class',
  'P.1', 'P.2', 'P.3', 'P.4', 'P.5', 'P.6', 'P.7',
  'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7',
  'S.1', 'S.2', 'S.3', 'S.4', 'S.5', 'S.6',
  'Senior 1', 'Senior 2', 'Senior 3', 'Senior 4', 'Senior 5', 'Senior 6',
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
  const message = error instanceof Error && error.message.includes('MONGODB_URI is not configured')
    ? 'MongoDB is not configured. Add MONGODB_URI to .env.local and restart the app.'
    : error instanceof Error && error.name === 'MongoServerSelectionError'
      ? 'Could not connect to MongoDB. Verify MONGODB_URI and Atlas network access.'
      : 'Account data is temporarily unavailable. Please try again.';
  return Response.json({ error: message }, { status: 503 });
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
    r2Url: typeof note.r2Url === 'string' ? note.r2Url : undefined,
    r2Key: typeof note.r2Key === 'string' ? note.r2Key : undefined,
  };
}

async function seedCatalog(database: Awaited<ReturnType<typeof getDatabase>>, now: Date): Promise<void> {
  const courses = database.collection<Document & { _id: string }>('courses');
  const rewards = database.collection<Document & { _id: string }>('rewards');

  await Promise.all([
    ...CURRICULUM.map((course) => courses.updateOne(
      { _id: course.id },
      {
        $set: {
          slug: course.id,
          title: course.title,
          category: course.cat,
          level: course.level,
          levelGroup: course.levelGroup,
          author: course.author,
          sourceUrl: course.sourceUrl,
          description: course.description,
          lessons: course.lessons,
          published: true,
          language: course.ttsLang ?? 'en',
          emoji: course.emoji,
          color: course.color,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )),
    ...REWARD_CATALOG.map((reward) => rewards.updateOne(
      { _id: `reward:${reward.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` },
      {
        $set: {
          title: reward.title,
          description: reward.text,
          cost: reward.cost,
          color: reward.color,
          background: reward.bg,
          active: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    )),
  ]);
}

let hasSeeded = false;

export async function GET(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const database = await getDatabase();
    const now = new Date();
    if (!hasSeeded) {
      seedCatalog(database, now).catch((err) => console.error('Background seed error:', err));
      hasSeeded = true;
    }
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

    const [clerkUser, profile, settings, progress, sources, notes, courses, transactions, sessions, rewards] = await Promise.all([
      currentUser(),
      profilesCollection.findOne({ _id: userId }),
      database.collection('user_settings').findOne({ userId }),
      database.collection('course_progress').find({ userId }).toArray(),
      sourcesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray(),
      notesCollection.find({ userId }).sort({ updatedAt: -1 }).toArray(),
      database.collection('courses').find({ published: true }).sort({ category: 1, title: 1 }).toArray(),
      database.collection('coin_transactions').find({ userId }).sort({ createdAt: -1 }).limit(20).toArray(),
      database.collection('learning_sessions').find({ userId }).sort({ startedAt: -1 }).limit(20).toArray(),
      database.collection('rewards').find({ active: true }).sort({ cost: 1 }).toArray(),
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
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const previousActiveDay = profile?.lastActiveAt instanceof Date
      ? profile.lastActiveAt.toISOString().slice(0, 10)
      : '';
    const streak = previousActiveDay === today
      ? Number(profile?.streak ?? 0)
      : previousActiveDay === yesterday
        ? Number(profile?.streak ?? 0) + 1
        : 1;

    await profilesCollection.updateOne(
      { _id: userId },
      {
        $set: {
          firstName: clerkUser.firstName || fallbackName,
          lastName: clerkUser.lastName || 'Learner',
          email,
          contact: typeof metadata.contact === 'string' ? metadata.contact.slice(0, 40) : '',
          educationLevel,
          streak,
          lastActiveAt: now,
          updatedAt: now,
        },
        $setOnInsert: { coins: 0, xp: 0, createdAt: now },
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
      courses: courses.map((course) => ({
        id: String(course._id),
        cat: course.category,
        title: course.title,
        emoji: course.emoji ?? '',
        color: course.color ?? '#1769E8',
        level: course.level,
        levelGroup: course.levelGroup,
        author: course.author,
        sourceUrl: course.sourceUrl,
        description: course.description,
        lessons: course.lessons,
        ...(typeof course.language === 'string' && course.language !== 'en' ? { ttsLang: course.language } : {}),
      })),
      courseProgress: progress.map((item) => ({
        courseId: String(item.courseId),
        currentLessonIndex: Number(item.currentLessonIndex),
        completedLessonIndexes: item.completedLessonIndexes.map(Number),
        xpEarned: Number(item.xpEarned),
      })),
      activity: [
        ...sessions.map((session) => ({
          id: String(session._id),
          title: `${session.status === 'completed' ? 'Completed' : 'Started'} a lesson`,
          date: (session.completedAt ?? session.startedAt).toISOString(),
          amount: Number(session.xpEarned ?? 0),
          type: 'lesson' as const,
        })),
        ...transactions.map((transaction) => ({
          id: String(transaction._id),
          title: transaction.reason,
          date: transaction.createdAt.toISOString(),
          amount: Number(transaction.amount) * (transaction.type === 'spend' ? -1 : 1),
          type: 'coin' as const,
        })),
      ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
      rewards: rewards.map((reward) => ({
        id: String(reward._id),
        title: reward.title,
        description: reward.description,
        cost: Number(reward.cost),
        color: reward.color ?? '#1769E8',
        background: reward.background ?? '#EAF2FF',
      })),
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
        !Array.isArray(state.enrolled) ||
        !state.enrolled.every((id) => boundedString(id, 100)) ||
        !SETTINGS_KEYS.every((key) => key in state)
      ) {
        return Response.json({ error: 'Invalid learner state.' }, { status: 400 });
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

      const courseIds = new Set<string>(state.enrolled as string[]);
      const validCourses = await database.collection<Document & { _id: string }>('courses')
        .find({ _id: { $in: [...courseIds] }, published: true }, { projection: { _id: 1 } })
        .toArray();
      if (validCourses.length !== courseIds.size) {
        return Response.json({ error: 'One or more courses are unavailable.' }, { status: 400 });
      }
      await Promise.all([
        database.collection('user_settings').updateOne(
          { userId },
          { $set: { ...validSettings, updatedAt: now } },
          { upsert: true },
        ),
        ...Array.from(courseIds, (courseId) => {
          return database.collection('course_progress').updateOne(
            { userId, courseId },
            {
              $setOnInsert: {
                currentLessonIndex: 0,
                completedLessonIndexes: [],
                xpEarned: 0,
                enrolledAt: now,
                updatedAt: now,
              },
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
      const noteTitle = note.title.trim();
      const client = await getMongoClient();
      let created = false;
      await client.withSession(async (session) => {
        await session.withTransaction(async () => {
          created = false;
          const existing = await notesCollection.findOne({ _id: noteId, userId }, { session });
          const r2Url = typeof note.r2Url === 'string' ? note.r2Url : undefined;
          const r2Key = typeof note.r2Key === 'string' ? note.r2Key : undefined;
          if (existing) {
            await notesCollection.updateOne(
              { _id: noteId, userId },
              {
                $set: {
                  subject: note.subject,
                  title: noteTitle,
                  text: note.text,
                  updatedAt: now,
                  ...(r2Url ? { r2Url, r2Key } : {}),
                },
              },
              { session },
            );
            return;
          }

          await notesCollection.insertOne(
            {
              _id: noteId,
              userId,
              subject: note.subject,
              title: noteTitle,
              text: note.text,
              ...(r2Url ? { r2Url, r2Key } : {}),
              createdAt: now,
              updatedAt: now,
            },
            { session },
          );
          const profileUpdate = await profilesCollection.updateOne(
            { _id: userId },
            { $inc: { coins: 5 }, $set: { updatedAt: now, lastActiveAt: now } },
            { session },
          );
          if (profileUpdate.matchedCount !== 1) throw new Error('Learner profile was not initialized.');
          await database.collection('coin_transactions').insertOne(
            {
              userId,
              amount: 5,
              type: 'earn',
              reason: `Added note: ${noteTitle}`,
              referenceId: noteId,
              idempotencyKey: `note:${String(noteId)}`,
              createdAt: now,
            },
            { session },
          );
          created = true;
        });
      });
      return Response.json({ ok: true, earnedCoins: created ? 5 : 0 });
    }

    return Response.json({ error: 'Unsupported account update.' }, { status: 400 });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userId = await requireUserId();
    const body: unknown = await request.json();

    if (
      isRecord(body) &&
      body.type === 'rewardRedeem' &&
      boundedString(body.rewardId, 100) &&
      boundedString(body.idempotencyKey, 100)
    ) {
      const database = await getDatabase();
      const rewardId = body.rewardId;
      const idempotencyKey = body.idempotencyKey;
      const rewards = database.collection<Document & { _id: string }>('rewards');
      const profiles = database.collection<Document & { _id: string }>('profiles');
      const reward = await rewards.findOne({ _id: rewardId, active: true });
      if (!reward) return Response.json({ error: 'This reward is not available.' }, { status: 404 });

      const client = await getMongoClient();
      let alreadyRedeemed = false;
      let insufficientCoins = false;
      const now = new Date();
      await client.withSession(async (session) => {
        await session.withTransaction(async () => {
          alreadyRedeemed = false;
          insufficientCoins = false;
          const transactions = database.collection('coin_transactions');
          const existing = await transactions.findOne({ userId, idempotencyKey }, { session });
          if (existing) {
            alreadyRedeemed = true;
            return;
          }

          const profile = await profiles.findOne({ _id: userId }, { session });
          const cost = Number(reward.cost);
          if (!profile || !Number.isSafeInteger(cost) || cost <= 0) {
            throw new Error('Reward or learner account data is invalid.');
          }
          const debit = await profiles.updateOne(
            { _id: userId, coins: { $gte: cost } },
            { $inc: { coins: -cost }, $set: { updatedAt: now } },
            { session },
          );
          if (debit.matchedCount !== 1) {
            insufficientCoins = true;
            return;
          }

          await database.collection('reward_redemptions').insertOne(
            { _id: new ObjectId(), userId, rewardId, cost, status: 'pending', createdAt: now },
            { session },
          );
          await transactions.insertOne(
            {
              userId,
              amount: cost,
              type: 'spend',
              reason: `Redeemed ${reward.title}`,
              referenceId: rewardId,
              idempotencyKey,
              createdAt: now,
            },
            { session },
          );
        });
      });

      if (insufficientCoins) return Response.json({ error: 'You do not have enough coins for this reward.' }, { status: 409 });
      return Response.json({ ok: true, alreadyRedeemed });
    }

    if (
      !isRecord(body) ||
      body.type !== 'lessonComplete' ||
      !boundedString(body.courseId, 100) ||
      !Number.isSafeInteger(body.lessonIndex) ||
      Number(body.lessonIndex) < 0
    ) {
      return Response.json({ error: 'Invalid lesson completion.' }, { status: 400 });
    }

    const database = await getDatabase();
    const courseId = body.courseId;
    const lessonIndex = Number(body.lessonIndex);
    const courses = database.collection<Document & { _id: string }>('courses');
    const course = await courses.findOne({ _id: courseId, published: true });
    if (!course || !Array.isArray(course.lessons) || lessonIndex >= course.lessons.length) {
      return Response.json({ error: 'Course or lesson was not found.' }, { status: 404 });
    }

    const profiles = database.collection<Document & { _id: string }>('profiles');
    const client = await getMongoClient();
    let newlyCompleted = false;
    const now = new Date();
    const idempotencyKey = `lesson:${courseId}:${lessonIndex}`;

    await client.withSession(async (session) => {
      await session.withTransaction(async () => {
        newlyCompleted = false;
        const progressCollection = database.collection('course_progress');
        const progress = await progressCollection.findOne({ userId, courseId }, { session });
        if (progress?.completedLessonIndexes?.includes(lessonIndex)) return;

        await progressCollection.updateOne(
          { userId, courseId },
          {
            $setOnInsert: { currentLessonIndex: 0, completedLessonIndexes: [], xpEarned: 0, enrolledAt: now },
            $set: { updatedAt: now },
          },
          { upsert: true, session },
        );
        await progressCollection.updateOne(
          { userId, courseId },
          {
            $addToSet: { completedLessonIndexes: lessonIndex },
            $max: { currentLessonIndex: lessonIndex + 1 },
            $inc: { xpEarned: 10 },
            $set: { updatedAt: now },
          },
          { session },
        );
        const profileUpdate = await profiles.updateOne(
          { _id: userId },
          { $inc: { xp: 10, coins: 10 }, $set: { updatedAt: now, lastActiveAt: now } },
          { session },
        );
        if (profileUpdate.matchedCount !== 1) throw new Error('Learner profile was not initialized.');

        await database.collection('coin_transactions').insertOne(
          { userId, amount: 10, type: 'earn', reason: `Completed ${course.title}`, referenceId: courseId, idempotencyKey, createdAt: now },
          { session },
        );
        await database.collection('learning_sessions').insertOne(
          { userId, courseId, lessonIndex, status: 'completed', xpEarned: 10, startedAt: now, completedAt: now },
          { session },
        );
        newlyCompleted = true;
      });
    });

    return Response.json({ ok: true, alreadyCompleted: !newlyCompleted });
  } catch (error) {
    return responseError(error);
  }
}

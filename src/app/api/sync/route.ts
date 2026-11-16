import { NextResponse } from 'next/server';
import type { Document } from 'mongodb';
import { requireCronSecret } from '@/lib/api-guard';
import { getDatabase } from '@/lib/mongodb';
import { testR2Connection, syncMongoCollectionsToR2, getR2PublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Collections the nightly backup copies, and the only names POST will accept. */
const DEFAULT_COLLECTIONS = ['courses', 'sources', 'notes', 'rewards', 'course_progress'] as const;
const ALLOWED_COLLECTIONS = new Set([
  ...DEFAULT_COLLECTIONS,
  'profiles',
  'coin_transactions',
]);

/**
 * GET /api/sync
 * Reports the MongoDB and Cloudflare R2 connection status and recent sync history.
 * With `?run=true` it runs the nightly backup instead (used by the Vercel cron).
 *
 * Requires `Authorization: Bearer <SYNC_SECRET or CRON_SECRET>`: the payload names
 * every learner collection and the backup writes them to predictable R2 keys.
 */
export async function GET(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  if (new URL(request.url).searchParams.get('run') === 'true') {
    return runBackup([...DEFAULT_COLLECTIONS]);
  }

  try {
    let mongoConnected = false;
    let mongoCollections: string[] = [];
    let recentSyncLogs: Document[] = [];

    try {
      const db = await getDatabase();
      const cols = await db.listCollections().toArray();
      mongoCollections = cols.map((c) => c.name);
      mongoConnected = true;

      recentSyncLogs = await db
        .collection('r2_sync_logs')
        .find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();
    } catch (dbErr) {
      console.warn('MongoDB check failed in /api/sync:', dbErr);
    }

    const r2Status = await testR2Connection();

    return NextResponse.json({
      status: mongoConnected && r2Status.connected ? 'healthy' : 'degraded',
      mongodb: {
        connected: mongoConnected,
        collections: mongoCollections,
        totalCollections: mongoCollections.length,
      },
      r2: {
        connected: r2Status.connected,
        bucket: r2Status.bucket,
        error: r2Status.error,
        keyCount: r2Status.keyCount,
        publicUrlBase: getR2PublicUrl(''),
      },
      recentSyncs: recentSyncLogs.map((log) => ({
        id: String(log._id),
        timestamp: log.timestamp,
        status: log.status,
        syncedCount: log.syncedCollections?.length ?? 0,
        errors: log.errors?.length ?? 0,
      })),
    });
  } catch (error) {
    console.error('Sync status check error:', error);
    return NextResponse.json({ error: 'Failed to check sync status.' }, { status: 500 });
  }
}

/**
 * POST /api/sync
 * Copies the named collections from MongoDB to Cloudflare R2.
 * Requires the same bearer secret as GET.
 */
export async function POST(req: Request) {
  const denied = requireCronSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const requested: unknown = body?.collections;

  let targetCollections: string[] = [...DEFAULT_COLLECTIONS];
  if (Array.isArray(requested)) {
    const rejected = requested.filter(
      (name) => typeof name !== 'string' || !ALLOWED_COLLECTIONS.has(name),
    );
    if (rejected.length > 0) {
      return NextResponse.json(
        {
          error: 'Unsupported collection name.',
          allowed: [...ALLOWED_COLLECTIONS],
        },
        { status: 400 },
      );
    }
    targetCollections = requested as string[];
  }

  return runBackup(targetCollections);
}

async function runBackup(collections: string[]) {
  try {
    const result = await syncMongoCollectionsToR2(collections);
    return NextResponse.json(
      {
        success: result.success,
        timestamp: result.timestamp,
        syncedCollections: result.syncedCollections,
        errors: result.errors,
      },
      { status: result.success ? 200 : 207 },
    );
  } catch (error) {
    console.error('Trigger sync error:', error);
    return NextResponse.json({ error: 'Failed to execute sync.' }, { status: 500 });
  }
}

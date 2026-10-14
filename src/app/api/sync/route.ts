import { NextResponse } from 'next/server';
import type { Document } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { testR2Connection, syncMongoCollectionsToR2, getR2BucketName, getR2PublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';

/**
 * GET /api/sync
 * Returns the status of the MongoDB <-> Cloudflare R2 connection and recent sync history.
 */
export async function GET() {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check sync status' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/sync
 * Manually or programmatically triggers a sync from MongoDB to Cloudflare R2.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const targetCollections = Array.isArray(body?.collections)
      ? (body.collections as string[])
      : ['courses', 'sources', 'notes', 'rewards', 'course_progress'];

    const result = await syncMongoCollectionsToR2(targetCollections);

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      syncedCollections: result.syncedCollections,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Trigger sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute sync' },
      { status: 500 },
    );
  }
}

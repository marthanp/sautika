import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getDatabase } from './mongodb';

export const runtime = 'nodejs';

let s3ClientInstance: S3Client | null = null;

/**
 * Get or initialize the S3Client for Cloudflare R2.
 */
export function getR2Client(): S3Client {
  if (s3ClientInstance) return s3ClientInstance;

  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/^["']|["']$/g, '');
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim().replace(/^["']|["']$/g, '');
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim().replace(/^["']|["']$/g, '');

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 is missing credentials (R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)');
  }

  s3ClientInstance = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return s3ClientInstance;
}

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME?.trim().replace(/^["']|["']$/g, '') || 'sautika-media';
}

export function getR2PublicUrl(key: string): string {
  const publicBase = (process.env.R2_PUBLIC_URL?.trim().replace(/^["']|["']$/g, '') || '').replace(/\/+$/, '');
  const cleanKey = key.replace(/^\/+/, '');
  if (publicBase) {
    return `${publicBase}/${cleanKey}`;
  }
  return `https://${getR2BucketName()}.r2.dev/${cleanKey}`;
}

/**
 * Upload an arbitrary buffer or string to Cloudflare R2.
 */
export async function uploadToR2(options: {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<{ key: string; url: string; size: number }> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const cleanKey = options.key.replace(/^\/+/, '');
  const bodyBuffer = typeof options.body === 'string' ? Buffer.from(options.body, 'utf-8') : Buffer.from(options.body);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: cleanKey,
      Body: bodyBuffer,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata,
    }),
  );

  return {
    key: cleanKey,
    url: getR2PublicUrl(cleanKey),
    size: bodyBuffer.length,
  };
}

/** Reads an object back out of R2, for source ingestion. */
export async function downloadFromR2(key: string): Promise<{
  body: Buffer;
  contentType: string;
  size: number;
}> {
  const s3 = getR2Client();
  const cleanKey = key.replace(/^\/+/, '');

  const result = await s3.send(
    new GetObjectCommand({ Bucket: getR2BucketName(), Key: cleanKey }),
  );
  if (!result.Body) throw new Error(`R2 object ${cleanKey} has no body.`);

  const body = Buffer.from(await result.Body.transformToByteArray());
  return {
    body,
    contentType: result.ContentType ?? 'application/octet-stream',
    size: body.length,
  };
}

/** Removes one object from Cloudflare R2. */
export async function deleteFromR2(key: string): Promise<void> {
  await getR2Client().send(
    new DeleteObjectCommand({
      Bucket: getR2BucketName(),
      Key: key.replace(/^\/+/, ''),
    }),
  );
}

/**
 * A short-lived PUT URL so the browser uploads straight to R2 instead of
 * streaming a 60-page PDF through a serverless function with a 60 s limit.
 *
 * The key is chosen on the server and never taken from the client, so one
 * learner cannot write into another learner's prefix.
 */
export async function createPresignedUploadUrl(options: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}): Promise<{ url: string; key: string; expiresInSeconds: number }> {
  const cleanKey = options.key.replace(/^\/+/, '');
  const expiresInSeconds = options.expiresInSeconds ?? 600;

  const url = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({
      Bucket: getR2BucketName(),
      Key: cleanKey,
      ContentType: options.contentType,
    }),
    { expiresIn: expiresInSeconds },
  );

  return { url, key: cleanKey, expiresInSeconds };
}

/** An R2 key under this learner's own prefix, safe for any file name. */
export function learnerUploadKey(userId: string, fileName: string, prefix = 'sources'): string {
  const safeUser = userId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'upload';
  return `${prefix}/${safeUser}/${Date.now()}_${safeName}`;
}

/**
 * Test connectivity to Cloudflare R2 bucket.
 */
export async function testR2Connection(): Promise<{
  connected: boolean;
  bucket: string;
  error?: string;
  keyCount?: number;
}> {
  try {
    const s3 = getR2Client();
    const bucket = getR2BucketName();

    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: 5,
      }),
    );

    return {
      connected: true,
      bucket,
      keyCount: listRes.KeyCount ?? 0,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      connected: false,
      bucket: getR2BucketName(),
      error: error.message || 'Unknown R2 connection error',
    };
  }
}

/**
 * Sync MongoDB Collections to Cloudflare R2 Bucket.
 * Exports snapshots of specified collections to R2 for backup, edge caching, and disaster recovery.
 */
export async function syncMongoCollectionsToR2(
  collectionNames: string[] = ['courses', 'sources', 'notes', 'rewards', 'course_progress'],
): Promise<{
  success: boolean;
  syncedCollections: { name: string; documentCount: number; sizeBytes: number; r2Key: string; url: string }[];
  errors: { name: string; error: string }[];
  timestamp: string;
}> {
  const db = await getDatabase();
  const syncedCollections = [];
  const errors = [];
  const now = new Date();
  const isoTime = now.toISOString();

  for (const name of collectionNames) {
    try {
      const docs = await db.collection(name).find({}).toArray();
      const payload = JSON.stringify(
        {
          collection: name,
          syncedAt: isoTime,
          count: docs.length,
          data: docs,
        },
        null,
        2,
      );

      const r2Key = `mongodb-sync/${name}/latest.json`;
      const archiveKey = `mongodb-sync/${name}/archives/${isoTime.slice(0, 10)}_${Date.now()}.json`;

      // Upload latest snapshot
      const uploadLatest = await uploadToR2({
        key: r2Key,
        body: payload,
        contentType: 'application/json',
        metadata: {
          syncedAt: isoTime,
          collection: name,
          count: String(docs.length),
        },
      });

      // Also upload archive snapshot
      await uploadToR2({
        key: archiveKey,
        body: payload,
        contentType: 'application/json',
        metadata: {
          syncedAt: isoTime,
          collection: name,
          count: String(docs.length),
        },
      });

      syncedCollections.push({
        name,
        documentCount: docs.length,
        sizeBytes: uploadLatest.size,
        r2Key: uploadLatest.key,
        url: uploadLatest.url,
      });
    } catch (err: unknown) {
      const error = err as Error;
      errors.push({
        name,
        error: error.message || 'Failed to sync collection',
      });
    }
  }

  // Record sync log in MongoDB
  try {
    await db.collection('r2_sync_logs').insertOne({
      timestamp: now,
      status: errors.length === 0 ? 'success' : syncedCollections.length > 0 ? 'partial' : 'failed',
      syncedCollections,
      errors,
    });
  } catch (logErr) {
    console.warn('Could not record r2_sync_log to MongoDB:', logErr);
  }

  return {
    success: errors.length === 0,
    syncedCollections,
    errors,
    timestamp: isoTime,
  };
}

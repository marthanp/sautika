import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
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

/**
 * Read an object from Cloudflare R2 as a Buffer or string.
 */
export async function getFromR2(key: string): Promise<Buffer | null> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const cleanKey = key.replace(/^\/+/, '');

  try {
    const res = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
      }),
    );

    if (!res.Body) return null;
    const byteArray = await res.Body.transformToByteArray();
    return Buffer.from(byteArray);
  } catch (err: unknown) {
    const error = err as { name?: string };
    if (error?.name === 'NoSuchKey' || error?.name === 'NotFound') {
      return null;
    }
    throw err;
  }
}

/**
 * Delete an object from Cloudflare R2.
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const s3 = getR2Client();
  const bucket = getR2BucketName();
  const cleanKey = key.replace(/^\/+/, '');

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: cleanKey,
      }),
    );
    return true;
  } catch {
    return false;
  }
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

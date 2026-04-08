import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import type { PrismaClient } from "@prisma/client";

/**
 * Intercept DELETE /hot-updater/api/bundles/:id
 *
 * The built-in handler only deletes from DB (Prisma).
 * This function:
 *   1. Looks up storage_uri from DB
 *   2. Deletes the file(s) from AWS S3
 *   3. Deletes the record from DB
 *
 * storage_uri format: s3://<bucket>/<key>
 */
export async function deleteBundleWithStorage(
  bundleId: string,
  prisma: PrismaClient,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get bundle from DB to find storage_uri
  const bundle = await (prisma as any).bundle.findUnique({
    where: { id: bundleId },
    select: { id: true, storage_uri: true },
  });

  if (!bundle) {
    return { success: false, error: "Bundle not found" };
  }

  const storageUri: string = bundle.storage_uri;

  // 2. Parse storage_uri → extract bucket + key
  // Format: s3://<bucket>/<key>
  let s3Key: string | null = null;
  let bucketName: string | null = null;

  if (storageUri?.startsWith("s3://")) {
    try {
      const url = new URL(storageUri);
      bucketName = url.host;
      s3Key = url.pathname.slice(1); // remove leading "/"
    } catch {
      console.warn(`[DeleteBundle] Failed to parse storage_uri: ${storageUri}`);
    }
  }

  // 3. Delete from S3
  if (s3Key && bucketName) {
    const s3Client = new S3Client({
      region: process.env.HOT_UPDATER_S3_REGION!,
      credentials: {
        accessKeyId: process.env.HOT_UPDATER_S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.HOT_UPDATER_S3_SECRET_ACCESS_KEY!,
      },
    });

    try {
      // s3Key may point to a file directly OR a folder prefix — list first to catch both
      const listed = await s3Client.send(
        new ListObjectsV2Command({ Bucket: bucketName, Prefix: s3Key }),
      );

      const objects = listed.Contents?.map((o) => ({ Key: o.Key! })) ?? [];

      if (objects.length > 0) {
        await s3Client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objects, Quiet: true },
          }),
        );
        console.log(
          `[DeleteBundle] S3 deleted ${objects.length} object(s) under: ${s3Key}`,
        );
      } else {
        console.warn(`[DeleteBundle] No S3 objects found at: ${s3Key}`);
      }
    } catch (err: any) {
      // Log but don't block DB deletion
      console.error(`[DeleteBundle] S3 delete failed:`, err.message);
    }
  } else {
    console.warn(
      `[DeleteBundle] No valid storage_uri for bundle ${bundleId}, skipping S3 delete`,
    );
  }

  // 4. Delete from DB
  await (prisma as any).bundle.delete({ where: { id: bundleId } });
  console.log(`[DeleteBundle] DB record deleted: ${bundleId}`);

  return { success: true };
}

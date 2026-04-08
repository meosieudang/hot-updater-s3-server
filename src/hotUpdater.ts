import { config } from "dotenv";
config({ path: ".env" });
import { s3Storage } from "@hot-updater/aws";
import { createHotUpdater } from "@hot-updater/server";
//@ts-ignore
import { prismaAdapter } from "@hot-updater/server/adapters/prisma";
import { prisma } from "./prisma.js";

export const hotUpdater = createHotUpdater({
  database: prismaAdapter({ prisma, provider: "sqlite" }),
  storages: [
    s3Storage({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
      bucketName: process.env.AWS_S3_BUNDLES_BUCKET!,
    }),
  ],
  basePath: "/hot-updater",
});

console.log("[HotUpdater] Initialized with Supabase Storage + Prisma SQLite");

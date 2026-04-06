import { config } from "dotenv";
config({ path: ".env" });

import { createHotUpdater } from "@hot-updater/server";
import { prismaAdapter } from "@hot-updater/server/adapters/prisma";
import { supabaseStorage } from "@hot-updater/supabase";
import { prisma } from "./prisma";

export const hotUpdater = createHotUpdater({
  database: prismaAdapter({ prisma, provider: "sqlite" }),
  storages: [
    supabaseStorage({
      supabaseUrl: process.env.HOT_UPDATER_SUPABASE_URL!,
      supabaseAnonKey: process.env.HOT_UPDATER_SUPABASE_ANON_KEY!,
      bucketName: process.env.HOT_UPDATER_SUPABASE_BUCKET_NAME!,
    }),
  ],
  basePath: "/hot-updater",
});

console.log("[HotUpdater] Initialized with Supabase Storage + Prisma SQLite");

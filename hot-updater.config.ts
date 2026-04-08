import { config } from "dotenv";
config({ path: ".env" });

import { defineConfig } from "hot-updater";
import { bare } from "@hot-updater/bare";
import { supabaseStorage } from "@hot-updater/supabase";
import { standaloneRepository } from "@hot-updater/standalone";

export default defineConfig({
  build: bare({ enableHermes: true }),

  // Upload bundle files to Supabase Storage
  storage: supabaseStorage({
    supabaseUrl: process.env.HOT_UPDATER_SUPABASE_URL!,
    supabaseAnonKey: process.env.HOT_UPDATER_SUPABASE_ANON_KEY!,
    bucketName: process.env.HOT_UPDATER_SUPABASE_BUCKET_NAME!,
  }),

  // Register metadata with our self-hosted server
  database: standaloneRepository({
    baseUrl: process.env.SERVER_BASE_URL
      ? `${process.env.SERVER_BASE_URL}/hot-updater`
      : "http://localhost:3000/hot-updater",
    headers: {
      Authorization: process.env.HOT_UPDATER_API_KEY ?? "",
    },
  }),
});

import { config } from "dotenv";
config({ path: ".env" });

import express from "express";
import cors from "cors";
import { hotUpdater } from "./hotUpdater";
import { apiKeyAuth, requestLogger } from "./middleware";

// Validate required env vars at server startup
const requiredEnvVars = [
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUNDLES_BUCKET",
  "HOT_UPDATER_API_KEY",
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`[Server] Missing required environment variable: ${key}`);
  }
}

const app = express();
const PORT = Number(process.env.PORT ?? 3000);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(requestLogger);

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : "*";

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  }),
);

app.use(express.json({ limit: "10mb" }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "hot-updater-server",
    timestamp: new Date().toISOString(),
    storage: "S3",
    database: "Prisma + SQLite",
  });
});

// ─── Hot Updater API ──────────────────────────────────────────────────────────
app.all("/hot-updater/*", apiKeyAuth, async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    let body: BodyInit | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = JSON.stringify(req.body);
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });
    const webResponse = await hotUpdater.handler(webRequest);

    res.status(webResponse.status);
    webResponse.headers.forEach((value, key) => res.setHeader(key, value));
    res.send(await webResponse.text());
  } catch (error) {
    console.error("[HotUpdater] Handler error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ─── Start ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const baseUrl = process.env.SERVER_BASE_URL ?? `http://localhost:${PORT}`;
  console.log("─".repeat(60));
  console.log("  🚀 Hot Updater Server");
  console.log("─".repeat(60));
  console.log(`  URL:      ${baseUrl}`);
  console.log(`  API:      ${baseUrl}/hot-updater`);
  console.log(`  Health:   ${baseUrl}/health`);
  console.log(`  Storage:  S3 (${process.env.AWS_S3_BUNDLES_BUCKET})`);
  console.log(`  Database: Prisma SQLite`);
  console.log("─".repeat(60));
});

process.on("SIGTERM", () => server.close(() => process.exit(0)));
process.on("SIGINT", () => server.close(() => process.exit(0)));

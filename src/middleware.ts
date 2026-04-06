import type { Request, Response, NextFunction } from "express";

/**
 * API Key authentication middleware.
 * Protects the Hot Updater admin endpoints (deploy, delete, etc.)
 * Public read endpoints (check for updates) do NOT require auth.
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.HOT_UPDATER_API_KEY;

  if (!apiKey) {
    console.warn("[Auth] HOT_UPDATER_API_KEY is not set - API is unprotected!");
    next();
    return;
  }

  // These paths are public - React Native clients need to check for updates
  const publicPaths = ["/api/check-update", "/health"];
  if (publicPaths.some((p) => req.path.startsWith(p))) {
    next();
    return;
  }

  const providedKey =
    req.headers["x-api-key"] ??
    req.headers["authorization"]?.replace("Bearer ", "");

  if (providedKey !== apiKey) {
    res.status(401).json({ error: "Unauthorized: Invalid API key" });
    return;
  }

  next();
}

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
}

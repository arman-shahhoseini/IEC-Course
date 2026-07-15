/**
 * Drizzle database client.
 *
 * Design goals:
 * 1. Read DATABASE_URL lazily at first use, never at module load — this
 *    keeps the module safe to import in build / SSR contexts where the
 *    env var may be missing.
 * 2. If DATABASE_URL is absent, return a `null` client and log a warning.
 *    The auth/session helpers check for `null` and return a graceful
 *    "service unavailable" error rather than crashing the whole request.
 * 3. Connection is cached as a singleton on `globalThis` so HMR in dev
 *    doesn't open a new pool on every reload.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __iecDb: Database | null | undefined;
}

const SCHEMA_LOG_PREFIX = "[iec:db]";

/**
 * Lazy singleton database client.
 *
 * Returns `null` when DATABASE_URL is not set. Callers must check for
 * `null` and degrade gracefully (see `assertDb()` in this file).
 */
export function getDb(): Database | null {
  if (typeof global !== "undefined" && global.__iecDb !== undefined) {
    return global.__iecDb;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn(
      `${SCHEMA_LOG_PREFIX} DATABASE_URL is not set. ` +
        "Database features (auth, sessions) are disabled. " +
        "Set DATABASE_URL in .env to enable them.",
    );
    const fallback = null;
    if (typeof global !== "undefined") global.__iecDb = fallback;
    return fallback;
  }

  // postgres.js client with sensible defaults for serverless / edge:
  // - small pool (3 conns) — Netlify functions are short-lived
  // - prepare: false — avoids prepared-statement collisions across
  //   pooled connections on Neon/Liara
  const queryClient = postgres(databaseUrl, {
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

  const db = drizzle(queryClient, { schema });
  if (typeof global !== "undefined") global.__iecDb = db;
  console.info(`${SCHEMA_LOG_PREFIX} connected (schema: iec)`);
  return db;
}

/**
 * Throws a structured "service unavailable" error when the DB is not
 * reachable. Use this at the top of any server function that needs DB
 * access so the caller gets a predictable error.
 */
export function assertDb(): Database {
  const db = getDb();
  if (!db) {
    throw new DbUnavailableError(
      "سرویس پایگاه‌داده در دسترس نیست. لطفاً بعداً تلاش کنید.",
    );
  }
  return db;
}

export class DbUnavailableError extends Error {
  readonly statusCode = 503;
  readonly code = "DB_UNAVAILABLE" as const;
  constructor(message: string) {
    super(message);
    this.name = "DbUnavailableError";
  }
}

/* ------------------------------------------------------------------ */
/* Re-exports for convenience                                          */
/* ------------------------------------------------------------------ */

export { schema };
export * as schemaNs from "./schema";

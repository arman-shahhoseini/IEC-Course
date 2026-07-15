/**
 * In-memory per-IP rate limiter.
 *
 * Implementation: a sliding-window counter keyed by `${routePrefix}:${ip}`.
 * A simple `Map` with TTL eviction is used — sufficient for a
 * single-instance serverless / long-lived dev process.
 *
 * ⚠️  PRODUCTION NOTE — multi-instance deployments (Netlify Functions,
 * Vercel Edge, multi-pod) MUST move this to a shared store (Redis,
 * Upstash, or a Postgres-backed counter). Each instance has its own
 * `Map`, so an attacker rotating across instances bypasses the limit.
 * The interface (`rateLimitConsume`) is intentionally simple so the
 * Redis swap-in is a one-file change.
 *
 * Limits (configurable per matcher):
 *   - `/api/auth/*` → 10 requests per 5 minutes per IP (per the master
 *     prompt). This is INDEPENDENT of and ADDITIVE to the per-phone
 *     rate limit in `actions.server.ts` — both must pass.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest, getRequestIP } from "@tanstack/react-start/server";

/** A bucket tracks: count + window-start-time (sliding window). */
interface Bucket {
  count: number;
  windowStart: number;
}

/**
 * Global map of rate-limit buckets. Keyed by `bucketKey`.
 * The TTL sweep runs lazily inside `rateLimitConsume` — no setInterval.
 *
 * `globalThis` is used so HMR in dev doesn't reset limits on every
 * reload.
 */
declare global {
  var __iecRateLimitBuckets: Map<string, Bucket> | undefined;
}

function getBuckets(): Map<string, Bucket> {
  if (!globalThis.__iecRateLimitBuckets) {
    globalThis.__iecRateLimitBuckets = new Map();
  }
  return globalThis.__iecRateLimitBuckets;
}

/** Configuration for a single rate-limit rule. */
export interface RateLimitOptions {
  /** Bucket namespace — e.g. "auth" or "login". */
  key: string;
  /** Max requests allowed within `windowMs`. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/** Result of `rateLimitConsume` — `allowed` + metadata for headers. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Consume one unit from the bucket identified by `opts.key + identifier`.
 * Returns whether the request is allowed plus remaining/reset metadata.
 *
 * Pure function over the global bucket map — safe to unit test by
 * clearing the map between tests.
 */
export function rateLimitConsume(
  identifier: string,
  opts: RateLimitOptions,
): RateLimitResult {
  const buckets = getBuckets();
  const bucketKey = `${opts.key}:${identifier}`;
  const now = Date.now();

  const existing = buckets.get(bucketKey);
  let bucket: Bucket;

  if (!existing || now - existing.windowStart >= opts.windowMs) {
    // First request in window, or window expired → start fresh.
    bucket = { count: 1, windowStart: now };
    buckets.set(bucketKey, bucket);
  } else {
    bucket = existing;
    bucket.count += 1;
  }

  const resetAt = bucket.windowStart + opts.windowMs;
  const remaining = Math.max(0, opts.max - bucket.count);

  // Lazy GC: evict expired entries to keep the map bounded. We sweep
  // ~1% of the time to amortize cost — no setInterval needed.
  if (Math.random() < 0.01) {
    for (const [k, b] of buckets) {
      if (now - b.windowStart >= opts.windowMs) buckets.delete(k);
    }
  }

  return {
    allowed: bucket.count <= opts.max,
    remaining,
    resetAt,
  };
}

/* ------------------------------------------------------------------ */
/* Per-IP rate-limit middleware for `/api/auth/*`                       */
/* ------------------------------------------------------------------ */

/** Master-prompt spec: 10 requests per 5 minutes per IP. */
const AUTH_RATE_LIMIT: RateLimitOptions = {
  key: "auth-ip",
  max: 10,
  windowMs: 5 * 60 * 1000,
};

/**
 * Resolve client IP from the request. Tries Cloudflare's `cf-connecting-ip`
 * first (most reliable when behind CF), then `x-forwarded-for` (first
 * entry), then the TanStack `getRequestIP()` helper.
 */
function resolveIp(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }

  const fallback = getRequestIP({ xForwardedFor: true });
  return fallback ?? "unknown";
}

/**
 * Rate-limit middleware scoped to `/api/auth/*` routes. Mounted as a
 * global request middleware in `src/start.ts` — it short-circuits any
 * `/api/auth/` request that exceeds the per-IP limit.
 *
 * Returns a 429 JSON response with `Retry-After` header (seconds until
 * the window resets) so well-behaved clients can back off correctly.
 */
export const authRateLimitMiddleware = createMiddleware().server(
  async ({ next }) => {
    const request = getRequest();
    const url = new URL(request.url);

    // Only apply to /api/auth/* — other routes pass through.
    if (!url.pathname.startsWith("/api/auth/")) {
      return next();
    }

    const ip = resolveIp(request);
    const result = rateLimitConsume(ip, AUTH_RATE_LIMIT);

    if (!result.allowed) {
      const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({
          error:
            "تعداد درخواست‌های شما از حد مجاز گذشته است. لطفاً کمی صبر کنید و دوباره تلاش کنید.",
          code: "RATE_LIMITED",
          retryAfter: retryAfterSec,
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "retry-after": String(retryAfterSec),
          },
        },
      );
    }

    return next();
  },
);

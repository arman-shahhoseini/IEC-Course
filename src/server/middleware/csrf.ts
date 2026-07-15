/**
 * CSRF middleware — rejects non-GET requests whose `Origin` (or
 * `Referer` fallback) does not match an allowed origin.
 *
 * Why Origin/Referer and not a CSRF token?
 * - `SameSite=Lax` on the session cookie already blocks most cross-site
 *   POST/PUT/DELETE. The remaining attack surface is a POST from a
 *   sibling subdomain (SameSite=Lax doesn't cover that).
 * - The Origin header is set by the browser for all cross-origin
 *   requests and is NOT spoofable from a browser context. Comparing it
 *   against the server's own origin blocks sibling-subdomain CSRF
 *   cheaply, without a per-request token round-trip.
 *
 * The check runs ONLY on unsafe methods (POST/PUT/PATCH/DELETE). GET /
 * HEAD / OPTIONS are exempt — they must not mutate state anyway.
 *
 * Allowed origins (always a UNION, never a replacement):
 *   1. Auto-derived origin from the request itself (Host +
 *      X-Forwarded-Proto headers, which Vercel/reverse proxies set).
 *      This is ALWAYS included — it's the origin the browser thinks
 *      it's talking to, so it's always safe to allow. This makes
 *      Vercel preview deployments work without any env var config.
 *   2. `process.env.ALLOWED_ORIGIN` (comma-separated list for
 *      multi-domain deployments — e.g. production + preview + custom
 *      domain). These are ADDITIONAL allowed origins, useful when the
 *      request's Host header might differ from what the user typed
 *      (rare, but happens with some CDN/proxy setups).
 *
 * Normalization: trailing slashes are stripped from both the request
 * origin and the allowed origins before comparison. This prevents
 * false mismatches from common config typos like
 * `ALLOWED_ORIGIN=https://example.com/` (with trailing slash).
 *
 * The comparison is on the full `origin` (scheme + host + port), NOT
 * just host — otherwise `https://attacker.com` could pass a check meant
 * for `http://attacker.com`.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** HTTP methods that may mutate state — subject to the CSRF check. */
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Strip a trailing slash from an origin string. `https://x.com/` →
 * `https://x.com`. Handles the common config typo of adding a trailing
 * slash to ALLOWED_ORIGIN.
 */
function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "");
}

/**
 * Parse `ALLOWED_ORIGIN` env var into a Set of normalized origin strings.
 * Accepts comma-separated list. Empty / unset → returns empty Set
 * (caller adds the auto-derived origin separately).
 *
 * Re-computed per request so `.env` changes during HMR are picked up
 * without a server restart. The cost is negligible (string split + trim
 * + normalize).
 */
function getAllowedOrigins(): Set<string> {
  const raw = process.env.ALLOWED_ORIGIN?.trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(normalizeOrigin),
  );
}

/**
 * Auto-derive the server's own origin from the request. Uses the
 * `X-Forwarded-Proto` header (set by Vercel and most reverse proxies)
 * to determine the scheme, falling back to the request URL's protocol.
 * `X-Forwarded-Host` is preferred over `Host` (Vercel sets it).
 *
 * This is the origin the BROWSER thinks it's talking to — safe to use
 * as the CSRF comparison target for browser-sent requests.
 */
function deriveOriginFromRequest(request: Request): string | null {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const proto = forwardedProto ?? url.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;
  return normalizeOrigin(`${proto}://${host}`);
}

/**
 * Extract the request origin from `Origin` header, falling back to
 * `Referer` (which contains the full URL — we extract just the origin
 * part). Returns `null` if neither is present. Trailing slashes are
 * stripped for consistent comparison.
 */
function extractOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return normalizeOrigin(origin);

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      // Reconstruct origin manually to avoid URL.origin quirks with
      // non-standard ports in some runtimes.
      return normalizeOrigin(`${url.protocol}//${url.host}`);
    } catch {
      return null;
    }
  }
  return null;
}

export const csrfMiddleware = createMiddleware().server(async ({ next }) => {
  const request = getRequest();
  const method = request.method.toUpperCase();

  // Safe methods + preflight skip the check.
  if (!UNSAFE_METHODS.has(method)) {
    return next();
  }

  const requestOrigin = extractOrigin(request);
  const explicitAllowed = getAllowedOrigins();

  // Always include the auto-derived origin in the allowed set — it's
  // the server's own origin (from Host header), so it's always safe.
  // Explicit ALLOWED_ORIGIN entries are ADDITIONAL, not replacements.
  const derivedOrigin = deriveOriginFromRequest(request);
  const allowed = new Set(explicitAllowed);
  if (derivedOrigin) allowed.add(derivedOrigin);

  // If no Origin/Referer at all → reject. Same-origin browser requests
  // always set at least Referer; its absence is suspicious.
  if (!requestOrigin) {
    console.warn(
      "[csrf] rejected: missing Origin/Referer header",
      JSON.stringify({
        method,
        url: request.url,
        host: request.headers.get("host"),
      }),
    );
    return new Response(
      JSON.stringify({
        error: "درخواست شما فاقد هدر امنیتی Origin است.",
        code: "CSRF_MISSING_ORIGIN",
      }),
      {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  if (!allowed.has(requestOrigin)) {
    // Log full diagnostic to server console (visible in Vercel logs)
    // so the operator can see exactly what mismatched.
    console.warn(
      "[csrf] rejected: origin mismatch",
      JSON.stringify({
        receivedOrigin: requestOrigin,
        derivedOrigin,
        explicitAllowed: [...explicitAllowed],
        method,
        url: request.url,
      }),
    );
    return new Response(
      JSON.stringify({
        error: "مبدأ درخواست مجاز نیست.",
        code: "CSRF_ORIGIN_MISMATCH",
        // Always include diagnostic info — these are not sensitive
        // (they're just origin strings) and they're essential for
        // debugging config issues on Vercel.
        receivedOrigin: requestOrigin,
        expectedOneOf: [...allowed],
        hint: "در محیط Vercel، نیازی به تنظیم ALLOWED_ORIGIN نیست — origin به‌صورت خودکار از هدر Host استخراج می‌شود. اگر ALLOWED_ORIGIN را تنظیم کرده‌اید، مطمئن شوید که دقیقاً با URL سایت (با https:// و بدون slash آخر) مطابقت دارد.",
      }),
      {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" },
      },
    );
  }

  return next();
});

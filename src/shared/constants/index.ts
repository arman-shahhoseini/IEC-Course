/**
 * Shared constants — application-wide values that don't change at runtime.
 */

/** Cookie name for the session token. */
export const SESSION_COOKIE = "iec_session";

/** Session lifetime: 7 days in seconds. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/** OTP validity window — 2 minutes. */
export const OTP_TTL_MS = 2 * 60 * 1000;

/** Max failed OTP verification attempts. */
export const OTP_MAX_ATTEMPTS = 5;

/** Rate limit: max OTP requests per phone. */
export const OTP_RATE_LIMIT_MAX = 3;
export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Rate limit: max auth API requests per IP. */
export const AUTH_IP_RATE_LIMIT_MAX = 10;
export const AUTH_IP_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

/** Max receipt image upload size (5 MB). */
export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed receipt image MIME types. */
export const ALLOWED_RECEIPT_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/** Default max body size (10 MB). */
export const DEFAULT_MAX_BODY_SIZE = 10 * 1024 * 1024;

/** Production base URL for sitemap/canonical. */
export const BASE_URL = "https://karafarini.shomal.ac.ir";

/** Default commission rate (percent). */
export const DEFAULT_COMMISSION_RATE_PERCENT = 10;

/** Pagination defaults. */
export const PAGINATION = {
  defaultPageSize: 50,
  maxPageSize: 200,
} as const;

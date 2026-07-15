/**
 * Shared utility functions — pure helpers used across the app.
 */

/** Format a number (Toman amount) with Persian thousands separators. */
export function formatToman(amount: number): string {
  return `${amount.toLocaleString("fa-IR")} تومان`;
}

/** Format an ISO date string to Persian date (yyyy/mm/dd). */
export function formatPersianDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR");
}

/** Format an ISO date string to Persian date + time. */
export function formatPersianDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR");
}

/** Truncate text to maxLen, appending "..." if truncated. */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
}

/** Sleep for ms milliseconds (for dev/testing). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Check if a value is a non-empty string. */
export function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/** Safely parse JSON, returning null on failure. */
export function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

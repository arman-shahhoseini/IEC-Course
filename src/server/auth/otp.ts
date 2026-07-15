/**
 * OTP (one-time passcode) generation, hashing, and verification.
 *
 * Security:
 * - 6-digit numeric codes generated with `crypto.randomInt` (CSPRNG).
 * - Codes are hashed with Node's built-in `scrypt` before persistence.
 *   The plaintext is NEVER stored in the DB.
 * - In dev (no SMS_API_KEY), the plaintext is also logged to the server
 *   console so a developer can test the flow end-to-end without an SMS
 *   provider. This is clearly marked with a comment below.
 * - Constant-time comparison is used during verification to mitigate
 *   timing attacks (though the practical risk for 6-digit codes is low
 *   given rate limiting).
 */
import { randomInt, scryptSync, timingSafeEqual } from "node:crypto";

// Re-export the shared phone normalizer so existing callers
// (`actions.server.ts`) keep working without changing their import path.
// The canonical home for this function is now `src/lib/phone.ts`.
export { normalizeIranianPhone } from "@/lib/phone";

/** OTP validity window — 2 minutes per master prompt spec. */
export const OTP_TTL_MS = 2 * 60 * 1000;

/** Max failed verification attempts before the code is invalidated. */
export const OTP_MAX_ATTEMPTS = 5;

/** Rate limit: max N OTP requests per phone within RATE_LIMIT_WINDOW_MS. */
export const OTP_RATE_LIMIT_MAX = 3;
export const OTP_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Generate a cryptographically-random 6-digit OTP.
 * Returns a string like "042139" (leading zeros preserved).
 */
export function generateOtp(): string {
  // randomInt(0, 1_000_000) is inclusive-exclusive, so 0..999999.
  // Pad with leading zeros to ensure 6 digits.
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Hash an OTP code with scrypt + per-code salt.
 * Returns a string of the form `saltHex:hashHex` for self-contained
 * storage in the `code_hash` column.
 */
export function hashOtp(code: string): string {
  const salt = randomInt(0, 1_000_000).toString(16);
  const hash = scryptSync(code, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify a plaintext OTP against a stored `salt:hash` string.
 * Uses `timingSafeEqual` for constant-time comparison.
 */
export function verifyOtp(input: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const expectedHash = Buffer.from(stored.slice(sep + 1), "hex");
  const actualHash = scryptSync(input, salt, 64);

  // Length must match before timingSafeEqual is called.
  if (expectedHash.length !== actualHash.length) return false;
  return timingSafeEqual(expectedHash, actualHash);
}

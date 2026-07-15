/**
 * Iranian mobile phone number normalization.
 *
 * Shared between:
 *   - `src/server/auth/otp.ts` (OTP request validation)
 *   - `scripts/promote-admin.ts` (CLI phone arg validation)
 *   - Any future server function that needs to canonicalize a phone
 *     number before a DB lookup.
 *
 * Kept in `src/lib/` (not `src/server/`) so it can be imported from both
 * server-only scripts (via `../src/lib/phone`) and server code (via
 * `@/lib/phone`). It has zero Node-only dependencies — pure regex
 * manipulation, runs anywhere.
 */

/**
 * Validate and normalize an Iranian mobile phone number.
 *
 * Accepts:
 *   - `09123456789`        (local)
 *   - `+989123456789`      (international with +)
 *   - `00989123456789`     (international with 00)
 *   - `989123456789`       (bare international, 12 digits)
 *   - with spaces, dashes, parentheses (stripped before validation)
 *
 * Returns the canonical `09XXXXXXXXX` form, or `null` if the input is
 * not a valid Iranian mobile number.
 *
 * The canonical form is what's stored in the `users.phone` column, so
 * any lookup MUST normalize the input first.
 */
export function normalizeIranianPhone(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.replace(/[\s\-()]/g, "");

  let normalized = trimmed;
  if (normalized.startsWith("+98")) {
    normalized = "0" + normalized.slice(3);
  } else if (normalized.startsWith("0098")) {
    normalized = "0" + normalized.slice(4);
  } else if (normalized.startsWith("98") && normalized.length === 12) {
    normalized = "0" + normalized.slice(2);
  }

  // Iranian mobile numbers: 09 followed by 9 digits (10 chars total).
  if (!/^09\d{9}$/.test(normalized)) return null;
  return normalized;
}

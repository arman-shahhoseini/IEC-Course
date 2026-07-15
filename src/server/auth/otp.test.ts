/**
 * Smoke tests for OTP generation, hashing, and verification.
 *
 * Tests the pure functions in `src/server/auth/otp.ts`:
 *   - generateOtp(): 6-digit string, leading zeros preserved
 *   - hashOtp() + verifyOtp(): scrypt hash + timingSafeEqual round-trip
 *
 * Does NOT test the full OTP request/verify HTTP flow (which requires
 * a DB + SMS provider). The pure crypto functions are the security-
 * critical boundary — if these break, the whole auth system breaks.
 *
 * Run with: `bun test`
 */
import { test, expect, describe } from "bun:test";
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  OTP_TTL_MS,
  OTP_MAX_ATTEMPTS,
  OTP_RATE_LIMIT_MAX,
} from "@/server/auth/otp";

describe("generateOtp", () => {
  test("produces a 6-digit string", () => {
    const code = generateOtp();
    expect(code).toMatch(/^\d{6}$/);
    expect(code.length).toBe(6);
  });

  test("preserves leading zeros", () => {
    // Generate many codes and verify at least one starts with "0".
    // Probability of no leading zero in 100 codes ≈ 0.9^100 ≈ 0.000027,
    // so this test is virtually never flaky.
    const codes = Array.from({ length: 100 }, () => generateOtp());
    const hasLeadingZero = codes.some((c) => c.startsWith("0"));
    expect(hasLeadingZero).toBe(true);
  });

  test("produces different codes on subsequent calls (randomness)", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateOtp()));
    // With 1M possible codes and 50 draws, collisions are astronomically
    // unlikely. If we see < 45 unique codes, the RNG is broken.
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("hashOtp + verifyOtp", () => {
  test("round-trip: a hashed code verifies correctly", () => {
    const code = "123456";
    const stored = hashOtp(code);
    expect(stored).toContain(":"); // salt:hash format
    expect(verifyOtp(code, stored)).toBe(true);
  });

  test("wrong code does NOT verify", () => {
    const stored = hashOtp("123456");
    expect(verifyOtp("654321", stored)).toBe(false);
  });

  test("different salts produce different hashes for the same code", () => {
    // scrypt with random salt — same input, different stored hashes.
    const stored1 = hashOtp("999999");
    const stored2 = hashOtp("999999");
    expect(stored1).not.toBe(stored2);
    // Both should still verify against the correct code.
    expect(verifyOtp("999999", stored1)).toBe(true);
    expect(verifyOtp("999999", stored2)).toBe(true);
  });

  test("malformed stored string returns false (no colon)", () => {
    expect(verifyOtp("123456", "malformed-no-colon")).toBe(false);
  });

  test("empty stored string returns false", () => {
    expect(verifyOtp("123456", "")).toBe(false);
  });

  test("code with leading zeros round-trips correctly", () => {
    const code = "042139";
    const stored = hashOtp(code);
    expect(verifyOtp(code, stored)).toBe(true);
    // Wrong code (the "42139" without leading zero) must not verify.
    expect(verifyOtp("42139", stored)).toBe(false);
  });
});

describe("OTP constants (security policy)", () => {
  test("TTL is 2 minutes", () => {
    expect(OTP_TTL_MS).toBe(2 * 60 * 1000);
  });

  test("max attempts is 5", () => {
    expect(OTP_MAX_ATTEMPTS).toBe(5);
  });

  test("rate limit is 3 per 10 minutes", () => {
    expect(OTP_RATE_LIMIT_MAX).toBe(3);
  });
});

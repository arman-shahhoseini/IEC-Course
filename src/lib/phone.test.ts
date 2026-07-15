/**
 * Smoke tests for Iranian phone number normalization.
 *
 * Tests `normalizeIranianPhone` — the pure function used by the OTP
 * request handler to canonicalize phone input before DB lookup.
 *
 * If this function breaks, users can't log in (their normalized phone
 * won't match the stored canonical form).
 *
 * Run with: `bun test`
 */
import { test, expect, describe } from "bun:test";
import { normalizeIranianPhone } from "@/lib/phone";

describe("normalizeIranianPhone — valid inputs", () => {
  test("local format (09XXXXXXXXX) passes through", () => {
    expect(normalizeIranianPhone("09123456789")).toBe("09123456789");
  });

  test("international with +98 prefix is normalized", () => {
    expect(normalizeIranianPhone("+989123456789")).toBe("09123456789");
  });

  test("international with 0098 prefix is normalized", () => {
    expect(normalizeIranianPhone("00989123456789")).toBe("09123456789");
  });

  test("bare international (98 + 10 digits) is normalized", () => {
    expect(normalizeIranianPhone("989123456789")).toBe("09123456789");
  });

  test("whitespace is stripped", () => {
    expect(normalizeIranianPhone(" 0912 345 6789 ")).toBe("09123456789");
  });

  test("dashes are stripped", () => {
    expect(normalizeIranianPhone("0912-345-6789")).toBe("09123456789");
  });

  test("parentheses are stripped", () => {
    expect(normalizeIranianPhone("(0912)3456789")).toBe("09123456789");
  });

  test("mixed separators are stripped", () => {
    expect(normalizeIranianPhone("+98 (912) 345-6789")).toBe("09123456789");
  });
});

describe("normalizeIranianPhone — invalid inputs", () => {
  test("returns null for empty string", () => {
    expect(normalizeIranianPhone("")).toBeNull();
  });

  test("returns null for non-string input", () => {
    expect(normalizeIranianPhone(null as unknown as string)).toBeNull();
    expect(normalizeIranianPhone(undefined as unknown as string)).toBeNull();
    expect(normalizeIranianPhone(123 as unknown as string)).toBeNull();
  });

  test("returns null for too-short number", () => {
    expect(normalizeIranianPhone("0912345")).toBeNull();
  });

  test("returns null for too-long number", () => {
    expect(normalizeIranianPhone("091234567890")).toBeNull();
  });

  test("returns null for number not starting with 09", () => {
    expect(normalizeIranianPhone("08123456789")).toBeNull();
    expect(normalizeIranianPhone("19123456789")).toBeNull();
  });

  test("returns null for landline (not a mobile)", () => {
    expect(normalizeIranianPhone("01112345678")).toBeNull();
  });

  test("returns null for letters", () => {
    expect(normalizeIranianPhone("abcdefghij")).toBeNull();
  });

  test("returns null for valid international but wrong country code", () => {
    expect(normalizeIranianPhone("+14155551234")).toBeNull();
  });
});

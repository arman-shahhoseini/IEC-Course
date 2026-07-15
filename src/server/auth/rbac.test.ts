/**
 * Smoke tests for RBAC constants and error class.
 *
 * Tests the parts of `src/server/auth/rbac.ts` that don't require a
 * DB session:
 *   - ROLE_RANK ordering (privilege ladder)
 *   - ALL_ROLES contains all 4 roles
 *   - AuthorizationError statusCode mapping (401 vs 403)
 *
 * Does NOT test `requireRole()` / `requireMinRole()` / `requireAuthenticated()`
 * directly because they call `getActiveSession()` which reads the session
 * cookie + DB. Those are integration-tested via the route-level auth
 * gate in `_panel.tsx` beforeLoad (verified manually in Phase 1/4).
 *
 * Run with: `bun test`
 */
import { test, expect, describe } from "bun:test";
import { ROLE_RANK, ALL_ROLES, AuthorizationError } from "@/server/auth/rbac";
import type { Role } from "@/server/db/schema";

describe("ROLE_RANK (privilege ladder)", () => {
  test("student has the lowest rank", () => {
    expect(ROLE_RANK.student).toBe(0);
  });

  test("instructor and support have equal rank (both above student)", () => {
    expect(ROLE_RANK.instructor).toBe(ROLE_RANK.support);
    expect(ROLE_RANK.instructor).toBeGreaterThan(ROLE_RANK.student);
  });

  test("admin has the highest rank", () => {
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.instructor);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.support);
    expect(ROLE_RANK.admin).toBe(100);
  });

  test("ladder is total: every role has a numeric rank", () => {
    const allRoles: Role[] = ["student", "instructor", "support", "admin"];
    for (const role of allRoles) {
      expect(typeof ROLE_RANK[role]).toBe("number");
      expect(ROLE_RANK[role]).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("ALL_ROLES", () => {
  test("contains exactly 4 roles", () => {
    expect(ALL_ROLES).toHaveLength(4);
  });

  test("includes student, instructor, support, admin", () => {
    expect(ALL_ROLES).toContain("student");
    expect(ALL_ROLES).toContain("instructor");
    expect(ALL_ROLES).toContain("support");
    expect(ALL_ROLES).toContain("admin");
  });
});

describe("AuthorizationError", () => {
  test("UNAUTHENTICATED kind → statusCode 401", () => {
    const err = new AuthorizationError(
      "برای دسترسی باید وارد شوید.",
      "UNAUTHENTICATED",
    );
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.message).toBe("برای دسترسی باید وارد شوید.");
    expect(err.name).toBe("AuthorizationError");
    expect(err instanceof Error).toBe(true);
  });

  test("FORBIDDEN kind → statusCode 403", () => {
    const err = new AuthorizationError("دسترسی کافی ندارید.", "FORBIDDEN");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("دسترسی کافی ندارید.");
  });

  test("is instanceof Error (so try/catch works generically)", () => {
    const err = new AuthorizationError("test", "FORBIDDEN");
    expect(err instanceof Error).toBe(true);
    // Can be thrown and caught as Error.
    try {
      throw err;
    } catch (caught) {
      expect(caught).toBe(err);
      expect(caught instanceof AuthorizationError).toBe(true);
    }
  });
});

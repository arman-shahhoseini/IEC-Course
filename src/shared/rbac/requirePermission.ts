/**
 * Server-side permission enforcement helpers.
 *
 * These wrap the existing `requireRole()` from `src/server/auth/rbac.ts`
 * with a permission-based API. They do NOT replace `requireRole()` —
 * they're a convenience layer on top for future use.
 *
 * Usage:
 *   import { requirePermission } from "@/shared/rbac/requirePermission";
 *
 *   export const deleteCourse = createServerFn({ method: "POST" })
 *     .handler(async () => {
 *       const user = await requirePermission("course.delete");
 *       // ...
 *     });
 *
 * The existing `requireRole(["admin"])` calls continue to work and are
 * NOT changed in this stage. This is purely additive.
 */
import { requireRole } from "@/server/auth/rbac";
import type { SessionUser } from "@/server/auth/session";
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  type Permission,
} from "./permissions";

/**
 * Require that the current user has a specific permission.
 * Throws AuthorizationError (401/403) if not.
 *
 * Internally calls `requireRole(["student","instructor","support","admin"])`
 * first (to ensure authenticated), then checks the permission matrix.
 */
export async function requirePermission(
  permission: Permission,
): Promise<SessionUser> {
  const user = await requireRole(["student", "instructor", "support", "admin"]);
  if (!hasPermission(user.role, permission)) {
    // Re-use the existing AuthorizationError for consistency.
    const { AuthorizationError } = await import("@/server/auth/rbac");
    throw new AuthorizationError(
      "شما دسترسی لازم برای این عملیات را ندارید.",
      "FORBIDDEN",
    );
  }
  return user;
}

/**
 * Require that the current user has ANY of the listed permissions.
 */
export async function requireAnyPermission(
  permissions: Permission[],
): Promise<SessionUser> {
  const user = await requireRole(["student", "instructor", "support", "admin"]);
  if (!hasAnyPermission(user.role, permissions)) {
    const { AuthorizationError } = await import("@/server/auth/rbac");
    throw new AuthorizationError(
      "شما دسترسی لازم برای این عملیات را ندارید.",
      "FORBIDDEN",
    );
  }
  return user;
}

/**
 * Require that the current user has ALL of the listed permissions.
 */
export async function requireAllPermissions(
  permissions: Permission[],
): Promise<SessionUser> {
  const user = await requireRole(["student", "instructor", "support", "admin"]);
  if (!hasAllPermissions(user.role, permissions)) {
    const { AuthorizationError } = await import("@/server/auth/rbac");
    throw new AuthorizationError(
      "شما دسترسی لازم برای این عملیات را ندارید.",
      "FORBIDDEN",
    );
  }
  return user;
}

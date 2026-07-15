/**
 * Role-Based Access Control (RBAC) helpers.
 *
 * Design:
 * - The single entry point is `requireRole(allowedRoles)`. It reads the
 *   session from the request cookie, validates the user's role, and
 *   either returns the authenticated `SessionUser` or throws a typed
 *   `AuthorizationError`.
 * - `AuthorizationError` carries a stable `statusCode` (401 vs 403) so
 *   API routes / server functions can map it to a proper HTTP response
 *   without try/catching Error specifically.
 * - The privilege ladder is encoded in `ROLE_RANK` so callers can also
 *   ask "is this user at least an instructor?" via `requireMinRole()`.
 *
 * Usage in a server function:
 *
 *   export const getDashboard = createServerFn({ method: "GET" })
 *     .handler(async () => {
 *       const user = await requireRole(["instructor", "admin"]);
 *       // ...
 *     });
 *
 * Usage in an API route handler:
 *
 *   POST: async () => {
 *     try {
 *       const user = await requireRole(["admin"]);
 *       return Response.json({ ok: true });
 *     } catch (err) {
 *       if (err instanceof AuthorizationError) {
 *         return Response.json({ error: err.message }, { status: err.statusCode });
 *       }
 *       throw err;
 *     }
 *   }
 */
import { getActiveSession, type SessionUser } from "./session";
import type { Role } from "../db/schema";

/** Authorization ladder — higher = more privileges. */
export const ROLE_RANK: Record<Role, number> = {
  student: 0,
  instructor: 10,
  support: 10,
  admin: 100,
};

/** All roles, useful for the "any authenticated user" case. */
export const ALL_ROLES: Role[] = ["student", "instructor", "support", "admin"];

/**
 * Typed authorization error. The `statusCode` field is `401` when no
 * session exists (unauthenticated) and `403` when a session exists but
 * the role is insufficient (forbidden).
 */
export class AuthorizationError extends Error {
  readonly statusCode: 401 | 403;
  readonly code: "UNAUTHENTICATED" | "FORBIDDEN";
  constructor(message: string, kind: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
    this.code = kind;
    this.statusCode = kind === "UNAUTHENTICATED" ? 401 : 403;
  }
}

/**
 * Require that the current request is from an authenticated user with
 * one of `allowedRoles`. Returns the public `SessionUser` on success.
 *
 * Throws `AuthorizationError` (status 401) when there is no session,
 * or `AuthorizationError` (status 403) when the session's role is not
 * in the allow-list.
 */
export async function requireRole(
  allowedRoles: readonly Role[],
): Promise<SessionUser> {
  const session = await getActiveSession();
  if (!session) {
    throw new AuthorizationError(
      "برای دسترسی به این بخش باید وارد شوید.",
      "UNAUTHENTICATED",
    );
  }
  if (!allowedRoles.includes(session.user.role)) {
    throw new AuthorizationError(
      "شما دسترسی لازم برای این عملیات را ندارید.",
      "FORBIDDEN",
    );
  }
  return session.user;
}

/**
 * Require that the current request is from an authenticated user whose
 * role rank is at least `minRole`. Useful when the privilege ladder
 * matters more than a specific allow-list (e.g. "any staff member").
 */
export async function requireMinRole(minRole: Role): Promise<SessionUser> {
  const session = await getActiveSession();
  if (!session) {
    throw new AuthorizationError(
      "برای دسترسی به این بخش باید وارد شوید.",
      "UNAUTHENTICATED",
    );
  }
  if (ROLE_RANK[session.user.role] < ROLE_RANK[minRole]) {
    throw new AuthorizationError(
      "شما دسترسی لازم برای این عملیات را ندارید.",
      "FORBIDDEN",
    );
  }
  return session.user;
}

/**
 * Require only that the user is authenticated — role-agnostic.
 * Convenience wrapper for `requireRole(ALL_ROLES)`.
 */
export async function requireAuthenticated(): Promise<SessionUser> {
  return requireRole(ALL_ROLES);
}

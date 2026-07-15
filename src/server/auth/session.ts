/**
 * Session management: create, read, invalidate.
 *
 * Storage model:
 * - The browser holds an opaque random token in an HttpOnly cookie
 *   named `iec_session`.
 * - The DB stores only `sha256(token)` as `token_hash`. A DB leak
 *   therefore cannot directly hijack sessions — the attacker would
 *   still need to find a pre-image of the hash.
 * - On logout the row is deleted; on expiry the row is ignored and
 *   cleaned lazily.
 *
 * Cookie flags:
 * - HttpOnly   — not readable from JS (XSS defense)
 * - Secure     — HTTPS only (works on localhost in modern browsers)
 * - SameSite=Lax — blocks CSRF on cross-origin POST/PUT/DELETE
 * - Path=/     — visible to all routes
 * - Max-Age    — 7 days (sliding window may be added in Stage 2)
 */
import { randomBytes, createHash } from "node:crypto";
import { eq, and, lt } from "drizzle-orm";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequestHeader,
} from "@tanstack/react-start/server";
import { assertDb } from "../db/client";
import { sessions, users, type User, type Role } from "../db/schema";

/** Cookie name for the opaque session token. */
export const SESSION_COOKIE = "iec_session";

/** Session lifetime: 7 days in seconds. */
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * The public shape of a "current user" — never exposes the DB row
 * directly. Safe to send to the client.
 */
export interface SessionUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  isActive: boolean;
}

/** Authenticated session context returned by `getSession()`. */
export interface ActiveSession {
  user: SessionUser;
  sessionId: string;
}

/* ------------------------------------------------------------------ */
/* Token helpers                                                       */
/* ------------------------------------------------------------------ */

function generateToken(): string {
  // 32 bytes = 256 bits of entropy, base64url-encoded ≈ 43 chars.
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/* ------------------------------------------------------------------ */
/* Cookie helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Manually parse a single cookie value out of the `cookie` request
 * header. We do this rather than relying solely on `getCookie()` because
 * TanStack Start's `getCookie` is request-scoped — using it is also fine,
 * but we keep the manual parser as a fallback for safety.
 */
function readCookieFromHeader(name: string): string | null {
  const header = getRequestHeader("cookie");
  if (!header) return null;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq) === name) {
      return decodeURIComponent(part.slice(eq + 1));
    }
  }
  return null;
}

/** Read the opaque session token from the request cookie (if any). */
export function readSessionToken(): string | null {
  // Prefer the framework helper; fall back to manual parsing.
  return getCookie(SESSION_COOKIE) ?? readCookieFromHeader(SESSION_COOKIE);
}

/** Set the session cookie on the outgoing response. */
export function setSessionCookie(token: string): void {
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clear the session cookie (logout). */
export function clearSessionCookie(): void {
  deleteCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

/* ------------------------------------------------------------------ */
/* Session lifecycle                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create a new session for a user, persist its hash, and set the cookie.
 * Returns the public `SessionUser` shape so the calling API route can
 * return it directly to the client.
 *
 * Any pre-existing sessions for this user are left in place (multi-device
 * login is allowed). Set `rotate` to true to revoke all prior sessions.
 */
export async function createSession(
  userId: string,
  options: { rotate?: boolean } = {},
): Promise<{ token: string; user: SessionUser }> {
  const db = assertDb();

  if (options.rotate) {
    await db.delete(sessions).where(eq(sessions.userId, userId));
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  setSessionCookie(token);

  const [user] = await db
    .select({
      id: users.id,
      phone: users.phone,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    // Should never happen — the user was just referenced. Defensive only.
    throw new Error("User vanished between session creation and lookup");
  }

  return {
    token,
    user: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
    },
  };
}

/**
 * Look up the active session from the request cookie.
 * Returns `null` when:
 *   - No cookie is present
 *   - The DB is unavailable
 *   - The token doesn't match any row
 *   - The session has expired
 *   - The user has been deactivated
 *
 * This is the canonical entry point for "who is the current user?" —
 * RBAC, loaders, and server functions should all call this.
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const token = readSessionToken();
  if (!token) return null;

  const db = assertDb();
  const tokenHash = hashToken(token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      phone: users.phone,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      isActive: users.isActive,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;
  if (row.expiresAt.getTime() < now.getTime()) {
    // Lazy cleanup of expired session.
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }
  if (!row.isActive) {
    // User was deactivated after the session was issued. Revoke.
    await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    return null;
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      phone: row.phone,
      email: row.email,
      fullName: row.fullName,
      role: row.role,
      isActive: row.isActive,
    },
  };
}

/**
 * Invalidate the current session (logout). Clears the cookie and deletes
 * the DB row. Safe to call even when there is no active session.
 */
export async function destroyActiveSession(): Promise<void> {
  const token = readSessionToken();
  clearSessionCookie();
  if (!token) return;

  const db = assertDb();
  const tokenHash = hashToken(token);
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/**
 * Maintenance helper: purge all expired sessions. Called opportunistically
 * from the OTP request flow to keep the table small. Not required for
 * correctness.
 */
export async function purgeExpiredSessions(): Promise<number> {
  const db = assertDb();
  const now = new Date();
  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  return result.length;
}

/**
 * Invalidate ALL active sessions for a user.
 *
 * Use cases:
 *   - After a role change (e.g. instructor application approved) so the
 *     user's next request sees the new role instead of the stale one
 *     cached in `context.auth` from the old session.
 *   - After an admin manually deactivates a user.
 *   - As part of a "force logout everywhere" security action.
 *
 * This function does NOT clear the caller's own cookie — it only deletes
 * DB rows. If the caller IS the user whose sessions are being invalidated
 * (a rare case), their next request will find no matching session row
 * and `getActiveSession()` will return `null`, which the `_panel` layout
 * translates into a redirect to `/dashboard` (the OTP login form).
 *
 * Optionally pass a Drizzle transaction client (`tx`) to run the delete
 * inside an existing transaction — used by `reviewInstructorApplication`
 * to make the (role change + session invalidation) pair atomic. The `tx`
 * is typed loosely (it shares the `.delete().where()` surface with the
 * regular db client) to avoid pulling in Drizzle's internal `PgTransaction`
 * type whose generics are cumbersome.
 */
type DbOrTx = Pick<ReturnType<typeof assertDb>, "delete">;

export async function invalidateAllSessionsForUser(
  userId: string,
  options: { tx?: DbOrTx } = {},
): Promise<number> {
  const client = options.tx ?? assertDb();
  const result = await client
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ id: sessions.id });
  return result.length;
}

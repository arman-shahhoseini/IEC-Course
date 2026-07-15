/**
 * Shared auth types — used by both the server session helpers and the
 * router context. Kept in its own file so the client (router.tsx,
 * __root.tsx) doesn't have to import from `src/server/auth/session.ts`
 * (which would drag server-only code into the client bundle).
 */
import type { Role } from "../db/schema";

/** Public shape of the authenticated user — safe to send to the client. */
export interface AuthUser {
  id: string;
  phone: string;
  email: string | null;
  fullName: string | null;
  role: Role;
  isActive: boolean;
}

/**
 * The shape of `context.auth` on the router.
 *
 * - `{ user, sessionKey }` when authenticated — `sessionKey` is a
 *   stable string that changes whenever the user logs in/out/changes
 *   role, useful as a React Query cache invalidation key.
 * - `null` when unauthenticated.
 */
export type AuthContext = { user: AuthUser; sessionKey: string } | null;

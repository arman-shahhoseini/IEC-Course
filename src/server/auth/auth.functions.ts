/**
 * Server function: read the current session for router context injection.
 *
 * Why a server function instead of calling `getActiveSession()` directly
 * from the root route's `beforeLoad`?
 *
 * `beforeLoad` is ISOMORPHIC — it runs on BOTH client and server. The
 * client bundle would try to import `getActiveSession()` (which imports
 * `postgres`, which imports `node:net`, `node:tls`, `node:fs`, etc.),
 * breaking the browser build.
 *
 * Wrapping the call in `createServerFn` lets TanStack Start replace
 * the implementation with an RPC stub in the client bundle — so the
 * browser never sees the `postgres` import. The function call crosses
 * the network boundary transparently.
 *
 * This function is UX/SSR only. Every server function that touches
 * private data MUST still call `requireRole()` inside its own handler —
 * a malicious client can fabricate any context it wants.
 *
 * Returns `AuthContext` (null when unauthenticated) + a `hadCookie`
 * flag that lets the `_panel` layout distinguish "session was
 * invalidated" (cookie present but no matching DB row) from "never
 * logged in" (no cookie at all). The former triggers a friendly
 * message on the login page.
 */
import { createServerFn } from "@tanstack/react-start";
import { getActiveSession, readSessionToken } from "./session";
import type { AuthContext } from "./types";

export interface SessionForRouterResult {
  auth: AuthContext;
  /** True if a session cookie was present (even if invalid). */
  hadCookie: boolean;
}

export const getSessionForRouter = createServerFn({ method: "GET" }).handler(
  async (): Promise<SessionForRouterResult> => {
    // Read the cookie FIRST, before any DB call that might throw.
    // This way, even if the DB is unavailable (and getActiveSession
    // throws DbUnavailableError), we still know whether a cookie was
    // present — which is what `_panel` needs to distinguish "session
    // invalidated" from "never logged in".
    const hadCookie = Boolean(readSessionToken());
    try {
      const session = await getActiveSession();
      if (!session) {
        return { auth: null, hadCookie };
      }
      return {
        auth: {
          user: session.user,
          sessionKey: session.sessionId,
        },
        hadCookie,
      };
    } catch {
      // DB unavailable or transient error — treat as logged out so the
      // page still renders. But preserve `hadCookie` so the login page
      // can still show the "session invalidated" message if applicable.
      return { auth: null, hadCookie };
    }
  },
);

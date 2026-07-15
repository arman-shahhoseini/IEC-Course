/**
 * GET /api/auth/me
 *
 * Returns the public shape of the currently-authenticated user, or
 * 401 when there is no active session. Used by the dashboard page to
 * detect "already logged in" on mount and survive page refreshes.
 *
 * Response:
 *   200 { "ok": true, "user": { "id", "phone", "fullName", "role", "isActive" } }
 *   401 { "ok": false, "error": "unauthenticated" }
 *   503 { "ok": false, "error": "..." }   // DB unavailable
 */
import { createFileRoute } from "@tanstack/react-router";
import { getActiveSession } from "@/server/auth/session";
import { DbUnavailableError } from "@/server/db/client";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async () => {
        let session;
        try {
          session = await getActiveSession();
        } catch (err) {
          if (err instanceof DbUnavailableError) {
            return Response.json(
              { ok: false, error: err.message },
              { status: 503 },
            );
          }
          throw err;
        }

        if (!session) {
          return Response.json(
            { ok: false, error: "unauthenticated" },
            { status: 401 },
          );
        }

        return Response.json({ ok: true, user: session.user });
      },
    },
  },
});

/**
 * POST /api/auth/logout
 *
 * Destroys the current session (deletes the DB row) and clears the
 * session cookie. Always returns 200, even when there was no active
 * session — this makes the endpoint idempotent and avoids leaking
 * session state through response timing or status.
 *
 * Response: 200 { "ok": true }
 */
import { createFileRoute } from "@tanstack/react-router";
import { destroyActiveSession } from "@/server/auth/session";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          await destroyActiveSession();
        } catch {
          // Cookie clearing has already happened inside destroyActiveSession
          // (it runs before the DB delete). Even if the DB call fails, we
          // still return 200 so the client treats logout as successful —
          // the cookie is gone either way and the orphaned DB row will
          // be cleaned up by the expiry sweep.
        }
        return Response.json({ ok: true });
      },
    },
  },
});

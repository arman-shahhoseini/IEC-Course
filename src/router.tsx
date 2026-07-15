import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import type { AuthContext } from "./server/auth/types";

/**
 * Router context shape.
 *
 * - `queryClient` — pre-existing, used by data fetching helpers.
 * - `auth` — injected by `beforeLoad` on the root route (see
 *   `src/routes/__root.tsx`). Always present (null when not logged in).
 *   This is UX/SSR only — every server function that needs auth MUST
 *   re-check with `requireRole()` regardless of this value, because a
 *   malicious client can craft any context it wants.
 * - `hadCookie` — true if a session cookie was present on the last
 *   `getSessionForRouter()` call (even if invalid). Used by `_panel` to
 *   distinguish "session invalidated" from "never logged in" and show
 *   an appropriate message on the login page.
 */
export interface RouterContext {
  queryClient: QueryClient;
  auth: AuthContext;
  hadCookie: boolean;
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient, auth: null, hadCookie: false },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

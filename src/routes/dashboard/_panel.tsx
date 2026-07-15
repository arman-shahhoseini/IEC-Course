/**
 * /dashboard/_panel — pathless layout route for the authenticated panel.
 *
 * This is the SINGLE place where auth is enforced for every page under
 * /dashboard. Its `beforeLoad` runs SSR-side (and on every client
 * navigation) and:
 *   - If the user is NOT authenticated → throw redirect to /dashboard
 *     (the OTP login card).
 *   - If authenticated → pass through; the `Outlet` renders the matched
 *     child route (my-courses, become-instructor, support/..., or the
 *     $section catch-all).
 *
 * Why a pathless layout route fixes the Stage 2 typing problem:
 *
 * In Stage 2, the parent `/dashboard` route's `beforeLoad` redirected
 * authenticated users AWAY to /dashboard/$section. TanStack inferred
 * from this that the child route's context was `never` (the child could
 * only be reached when the parent's beforeLoad did NOT throw, i.e. when
 * auth was null), making it impossible to write a `beforeLoad` in the
 * child that relied on `auth` being non-null.
 *
 * Now the parent `/dashboard`'s beforeLoad redirects authenticated users
 * to /dashboard/_panel/... (a DIFFERENT branch), and unauthenticated
 * users fall through to the OTP form. The `_panel` route's beforeLoad
 * then redirects unauthenticated users OUT. The two beforeLoads are
 * mutually exclusive — no narrowing, no `never` return type.
 *
 * The `Outlet` here is wrapped in `DashboardShell` so every panel page
 * gets the Sidebar + Topbar for free. Per-page content is rendered via
 * `<Outlet />` from @tanstack/react-router.
 *
 * Note: this layout route does NOT render `DashboardShell` itself —
 * that's the job of each leaf route. The reason is that each leaf needs
 * to pass its own `title`, `currentSection`, and `onLogout` to the
 * shell, which depend on the leaf's params and data. The layout just
 * enforces auth; the leaf controls presentation.
 *
 * Wait — that defeats the "single place" goal. Let me reconsider.
 *
 * Actually, the shell CAN be rendered here if the leaf routes provide
 * their title/section via route context (`beforeLoad` return value) or
 * via `useParams`/`useMatch`. But that's more complex than having each
 * leaf render its own shell. The Stage 2 pattern (each leaf renders
 * DashboardShell) is simpler and works fine — the auth check is the
 * only thing that needs to be centralized, and that's what this layout
 * does. The shell is presentational, not security-relevant.
 *
 * So: this layout is auth-only. Leaves render their own shell.
 */
import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/_panel")({
  beforeLoad: ({ context }) => {
    // SSR-side auth check. If no session, redirect to /dashboard (OTP).
    // `context.auth` was injected by the root route's beforeLoad via
    // `getSessionForRouter()` server function — it reads the session
    // cookie on the server, so this redirect happens BEFORE any HTML
    // is sent to the client. No flash of protected content.
    //
    // This is UX/SSR only. Server functions that touch private data
    // MUST still call `requireRole()` inside their own handlers — a
    // malicious client can fabricate any context it wants.
    if (!context.auth) {
      // Distinguish "session was invalidated" (had a cookie but it no
      // longer matches a DB row — e.g. after role change) from "never
      // logged in" (no cookie at all). The former shows a friendly
      // message on the login page; the latter just shows the OTP form.
      // `hadCookie` is set by `getSessionForRouter()` on the server.
      throw redirect({
        to: "/dashboard",
        replace: true,
        search: context.hadCookie ? { reason: "session_invalidated" } : {},
      });
    }
    // Authenticated — fall through to the panel. No `search` needed.
  },
  component: PanelLayout,
  // While the beforeLoad is running (e.g. during client-side navigation),
  // show a loader instead of a blank screen.
  pendingComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-primary" />
    </div>
  ),
});

function PanelLayout() {
  // The layout is a pass-through — auth was enforced in beforeLoad.
  // Each leaf route renders its own DashboardShell.
  return <Outlet />;
}

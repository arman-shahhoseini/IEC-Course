/**
 * /dashboard/_panel/$section — catch-all for panel sections that don't
 * have a dedicated route file yet.
 *
 * Sections with real pages (my-courses, become-instructor,
 * support/instructor-applications) have their own route files under
 * `_panel.*.tsx` and take precedence over this catch-all. Sections
 * still using the Stage 2 EmptyState placeholder (new-course, tickets,
 * users, stats, manual-enrollment) fall through to here.
 *
 * Auth: enforced by the parent `_panel` layout's `beforeLoad` — this
 * route can assume `context.auth` is non-null. The component still
 * guards with `if (!auth)` defensively (TS can't infer the narrowing
 * across route boundaries).
 *
 * Section-access control: if the user's role doesn't include the
 * requested section in their visible nav, redirect to their first
 * visible section. This is UX only — server functions re-check with
 * `requireRole()`.
 */
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { Construction, ArrowRight, Loader2 } from "lucide-react";
import {
  DashboardShell,
  getSectionEmptyState,
} from "@/components/layout/DashboardShell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  getNavForRole,
  DEFAULT_SECTION,
  DASHBOARD_NAV,
} from "@/config/dashboard-nav";
import { site } from "@/data/site";

export const Route = createFileRoute("/dashboard/_panel/$section")({
  head: ({ params }) => {
    const sectionMeta = DASHBOARD_NAV.find((n) => n.section === params.section);
    return {
      meta: [
        {
          title: `${sectionMeta?.label ?? "داشبورد"} | ${site.shortName}`,
        },
        {
          name: "description",
          content: `بخش ${sectionMeta?.label ?? "داشبورد"} مرکز کارآفرینی بین‌المللی دانشگاه شمال.`,
        },
      ],
      links: [{ rel: "canonical", href: `/dashboard/${params.section}` }],
    };
  },
  // Auth is enforced by the parent `_panel` layout's `beforeLoad`
  // (SSR-side). We deliberately do NOT add a `beforeLoad` here because
  // TanStack's type inference narrows the context to `never` when a
  // parent layout's beforeLoad can throw — making it impossible to
  // write a valid `beforeLoad` in the child that returns a value.
  //
  // Section-access control (is this role allowed to see this section?)
  // is done in the component via `useEffect` + `useNavigate`. This is
  // UX only — server functions re-check with `requireRole()`.
  component: DashboardSectionPage,
});

function DashboardSectionPage() {
  const { auth } = Route.useRouteContext();
  const { section } = Route.useParams();
  const router = useRouter();

  // Section-access check (UX only). Auth itself is enforced by the
  // `_panel` layout's beforeLoad. If the user's role can't see this
  // section, redirect to their first visible section.
  useEffect(() => {
    if (!auth) return; // _panel layout will redirect to /dashboard
    const visibleNav = getNavForRole(auth.user.role);
    const allowed = visibleNav.some((n) => n.section === section);
    if (!allowed) {
      const firstSection = visibleNav[0]?.section ?? DEFAULT_SECTION;
      void router.navigate({
        to: "/dashboard/$section",
        params: { section: firstSection },
        replace: true,
      });
    }
  }, [auth, section, router]);

  // Defensive guard — auth is guaranteed by the parent layout.
  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }
  // If section not allowed, show loader while redirect fires.
  const visibleNav = getNavForRole(auth.user.role);
  const allowed = visibleNav.some((n) => n.section === section);
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const user = auth.user;
  const navItem = DASHBOARD_NAV.find((n) => n.section === section);
  const emptyState = getSectionEmptyState(section);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Network error — still navigate away; the cookie was cleared
      // server-side if the request reached the server at all.
    }
    router.invalidate();
    void router.navigate({ to: "/dashboard", replace: true, search: {} });
  };

  return (
    <DashboardShell
      user={user}
      currentSection={section}
      title={navItem?.label ?? "داشبورد"}
      subtitle={navItem?.description}
      onLogout={handleLogout}
    >
      <div className="rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-card md:p-8">
        <EmptyState
          icon={Construction}
          title={emptyState.title}
          description={emptyState.description}
          size="default"
          action={
            user.role === "student" ? (
              <Button asChild variant="default">
                <Link to="/courses">
                  مشاهده دوره‌های موجود
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : undefined
          }
        />
      </div>
    </DashboardShell>
  );
}

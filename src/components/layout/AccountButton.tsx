/**
 * AccountButton — Navbar/Footer entry point to the user account.
 *
 * Two visual states, driven by `Route.useRouteContext().auth` (already
 * injected SSR-side by the root route's `beforeLoad` — no client-side
 * fetch round-trip):
 *
 *   1. **Guest** → a "ورود / پنل من" button linking to `/dashboard`
 *      (the OTP login card). The same OTP flow handles real SMS and
 *      demo mode — `AccountButton` does NOT need to know which.
 *
 *   2. **Authenticated** → avatar + name + role label, with a dropdown:
 *        - "پنل من"     → first visible section for the user's role,
 *                          resolved via `getSectionRoute(getNavForRole(role)[0].section)`
 *        - "پروفایل"    → /dashboard/profile
 *        - "خروج از حساب" → POST /api/auth/logout, then invalidate
 *                          router context and redirect to /
 *
 * UX-only — the dropdown is hidden from guests, but every protected
 * route still enforces auth server-side via `requireRole()` in the
 * `_panel` layout's `beforeLoad`. A fabricated client context cannot
 * bypass that server check.
 *
 * Accessibility:
 *   - Trigger is a `<button>` with `aria-haspopup="menu"` and
 *     `aria-expanded` (provided by Radix DropdownMenu).
 *   - Menu items are focusable, arrow-key navigable, Escape closes
 *     (all Radix defaults).
 *   - The trigger has an `aria-label` that includes the user's name
 *     and role so screen-reader users get context out of context.
 */
import { Link, useRouter, useRouteContext } from "@tanstack/react-router";
import { LogOut, User as UserIcon, LayoutDashboard } from "lucide-react";
import { NamedAvatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ROLE_LABELS,
  getNavForRole,
  getSectionRoute,
} from "@/config/dashboard-nav";
import type { RouterContext } from "@/router";

export interface AccountButtonProps {
  /**
   * Visual variant — `compact` is for the Navbar (avatar + name on
   * sm+), `inline` is for the Footer (text-only link list, no avatar).
   * Defaults to `compact`.
   */
  variant?: "compact" | "inline";
  className?: string;
}

export function AccountButton({
  variant = "compact",
  className,
}: AccountButtonProps) {
  const { auth } = useRouteContext({ strict: false }) as RouterContext;
  const router = useRouter();

  // ---------- Guest state ----------
  if (!auth) {
    if (variant === "inline") {
      return (
        <Link
          to="/dashboard"
          className={cn(
            "text-paragraph transition-colors hover:text-primary",
            className,
          )}
        >
          ورود / پنل من
        </Link>
      );
    }
    return (
      <Link
        to="/dashboard"
        className={cn(
          "inline-flex items-center gap-2 rounded-[14px] border border-primary/20 bg-primary/[0.04] px-4 py-2.5 text-[13px] font-bold text-primary backdrop-blur-xl transition-all hover:bg-primary/[0.08] hover:scale-[1.02] lg:bg-primary lg:text-white lg:shadow-glow lg:btn-shine lg:hover:bg-primary-hover",
          className,
        )}
        aria-label="ورود به پنل کاربری"
      >
        <LayoutDashboard className="size-4" strokeWidth={2.2} />
        ورود / پنل من
      </Link>
    );
  }

  // ---------- Authenticated state ----------
  const user = auth.user;
  const displayName = user.fullName ?? "کاربر";
  const firstSection = getNavForRole(user.role)[0]?.section ?? "my-courses";
  const panelRoute = getSectionRoute(firstSection);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      // Network error — cookie was cleared server-side if the request
      // reached the server at all. Navigate away regardless so the user
      // sees the logged-out state.
    }
    router.invalidate();
    void router.navigate({ to: "/", replace: true });
  };

  // ----- Inline variant (Footer) -----
  if (variant === "inline") {
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <span className="text-xs font-semibold text-paragraph/60">
          {displayName} · {ROLE_LABELS[user.role]}
        </span>
        <Link
          {...panelRoute}
          className="text-sm text-paragraph transition-colors hover:text-primary"
        >
          پنل من
        </Link>
        <Link
          to="/dashboard/profile"
          className="text-sm text-paragraph transition-colors hover:text-primary"
        >
          پروفایل
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="text-right text-sm text-status-rejected transition-colors hover:underline"
        >
          خروج از حساب
        </button>
      </div>
    );
  }

  // ----- Compact variant (Navbar) -----
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-[14px] border border-border bg-white/80 p-1 ps-2.5 backdrop-blur-xl transition-all hover:bg-white hover:scale-[1.02] dark:border-zinc-700 dark:bg-zinc-900/80 dark:hover:bg-zinc-900",
            className,
          )}
          aria-label={`منوی کاربر: ${displayName}، نقش ${ROLE_LABELS[user.role]}`}
        >
          <NamedAvatar name={displayName} size="sm" />
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-bold leading-tight text-foreground dark:text-zinc-100">
              {displayName}
            </span>
            <span className="block text-[11px] leading-tight text-paragraph">
              {ROLE_LABELS[user.role]}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-bold text-foreground">
              {displayName}
            </span>
            <span dir="ltr" className="text-right text-xs text-paragraph">
              {user.phone}
            </span>
            <span className="text-xs text-paragraph">
              نقش: {ROLE_LABELS[user.role]}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link {...panelRoute}>
            <LayoutDashboard className="size-4" />
            پنل من
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/dashboard/profile">
            <UserIcon className="size-4" />
            پروفایل
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut className="size-4" />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

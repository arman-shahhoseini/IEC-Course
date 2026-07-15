/**
 * Dashboard navigation config — role-aware menu structure.
 *
 * Each menu item maps to a single dashboard route. Items are filtered
 * by the current user's role on the client (Sidebar) AND re-checked
 * server-side by `requireRole()` on every protected endpoint — these
 * two checks are independent. Hiding a menu item is UX only.
 *
 * Routes referenced here don't all exist yet — they will be created in
 * later stages. For Stage 2, only `/dashboard` exists; the others will
 * fall through to the 404 page (which is fine for now — every menu
 * item in Stage 2 routes to an `EmptyState` page that says "این بخش
 * هنوز در دست ساخت است"). To avoid the 404 fallback for the menu's
 * primary "My Courses" item, all items point to `/dashboard` for now
 * and the EmptyState is rendered there based on a `?section=` query.
 *
 * Wait — that's a hack. Let me reconsider: the master prompt explicitly
 * says "هر کدام از این لینک‌ها فعلاً فقط باید صفحه‌ای با EmptyState مناسب
 * نشان دهند". So we need real routes. But we also can't clutter the
 * route tree with stub pages that will be replaced in Stage 3-7.
 *
 * Decision: create a single catch-all `/dashboard/$section` route that
 * renders an EmptyState based on the section param. The nav config maps
 * each menu item to a `section` key. This way Stage 3+ can replace the
 * catch-all with real pages without changing the nav config.
 *
 * Role ladder (matches `auth/rbac.ts` ROLE_RANK):
 *   student < instructor ≈ support < admin
 *
 * Visibility rule: an item is visible to role R if R is in `roles`.
 * `admin` is implicitly included in every item via `getNavForRole`
 * (admins see everything).
 */
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  PlusCircle,
  Inbox,
  UserPlus,
  Ticket,
  Users,
  BarChart3,
  GraduationCap,
  Wallet,
  CreditCard,
  ScrollText,
  type LayoutDashboard,
} from "lucide-react";
import type { Role } from "@/server/db/schema";

export interface DashboardNavItem {
  /** Stable slug — used as the URL segment after /dashboard/. */
  section: string;
  /** Persian label shown in the sidebar. */
  label: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Roles that can see this item (admin is implicit). */
  roles: Exclude<Role, "admin">[];
  /**
   * Optional description shown under the label in larger sidebar
   * layouts. Defaults to undefined → no description rendered.
   */
  description?: string;
}

/**
 * Single source of truth for dashboard navigation.
 *
 * Order matters — items are rendered in the order listed here.
 */
export const DASHBOARD_NAV: DashboardNavItem[] = [
  {
    section: "my-courses",
    label: "دوره‌های من",
    icon: BookOpen,
    roles: ["student", "instructor", "support"],
    description: "دوره‌های ثبت‌نام‌شده و در حال برگزاری",
  },
  {
    section: "my-enrollments",
    label: "ثبت‌نام‌های من",
    icon: BookOpen,
    roles: ["student"],
    description: "دوره‌هایی که در آن‌ها ثبت‌نام کرده‌اید",
  },
  {
    section: "become-instructor",
    label: "درخواست تدریس",
    icon: GraduationCap,
    roles: ["student"],
    description: "ثبت درخواست برای دریافت نقش مدرس",
  },
  {
    section: "create-course",
    label: "ثبت دوره جدید",
    icon: PlusCircle,
    roles: ["instructor"],
    description: "ارسال دوره جدید برای بررسی",
  },
  {
    section: "wallet",
    label: "کیف‌پول من",
    icon: Wallet,
    roles: ["instructor"],
    description: "موجودی و تاریخچه‌ی تراکنش‌ها",
  },
  {
    section: "instructor-applications",
    label: "درخواست‌های مدرسی",
    icon: Inbox,
    roles: ["support"],
    description: "بررسی درخواست‌های تدریس دریافتی",
  },
  {
    section: "courses-review",
    label: "بررسی دوره‌ها",
    icon: Inbox,
    roles: ["support"],
    description: "بررسی و تایید دوره‌های ثبت‌شده",
  },
  {
    section: "payments-review",
    label: "بررسی پرداخت‌ها",
    icon: CreditCard,
    roles: ["support"],
    description: "بررسی فیش‌های واریزی و تایید ثبت‌نام",
  },
  {
    section: "tickets",
    label: "تیکت‌های من",
    icon: Ticket,
    roles: ["student", "instructor", "support"],
    description: "پرسش‌ها و درخواست‌های پشتیبانی",
  },
  {
    section: "support-tickets",
    label: "تیکت‌ها",
    icon: Ticket,
    roles: ["support"],
    description: "بررسی و پاسخ به تیکت‌های کاربران",
  },
  {
    section: "manual-enrollment",
    label: "ثبت‌نام دستی",
    icon: UserPlus,
    roles: ["support"],
    description: "ثبت‌نام مستقیم کاربر با تایید دستی",
  },
  {
    section: "users",
    label: "مدیریت کاربران",
    icon: Users,
    roles: [],
    description: "مدیریت نقش‌ها و دسترسی کاربران",
  },
  {
    section: "audit-log",
    label: "گزارش فعالیت‌ها",
    icon: ScrollText,
    roles: [],
    description: "تاریخچه‌ی عملیات‌های سیستم",
  },
  {
    section: "stats",
    label: "آمار",
    icon: BarChart3,
    roles: [],
    description: "آمار ثبت‌نام، درآمد و فعالیت",
  },
];

/**
 * Get the navigation items visible to a specific role.
 *
 * Admins see everything (they're not listed in `roles` to avoid
 * repetition — implicit grant). Other roles see only items where
 * they're explicitly listed.
 */
export function getNavForRole(role: Role): DashboardNavItem[] {
  if (role === "admin") return DASHBOARD_NAV;
  return DASHBOARD_NAV.filter((item) => item.roles.includes(role));
}

/**
 * Human-readable role labels in Persian — used by the sidebar footer
 * and Topbar avatar tooltip.
 */
export const ROLE_LABELS: Record<Role, string> = {
  student: "دانشجو",
  instructor: "مدرس",
  support: "پشتیبان",
  admin: "مدیر",
};

/**
 * EmptyState content per section — used by the catch-all
 * `/dashboard/$section` route to render a "coming soon" message
 * tailored to each section.
 */
export const SECTION_EMPTY_STATES: Record<
  string,
  { title: string; description: string }
> = {
  "my-courses": {
    title: "دوره‌های شما اینجا نمایش داده می‌شوند",
    description:
      "هنوز در دوره‌ای ثبت‌نام نکرده‌اید یا دوره‌ای گذرانده نشده است. پس از اولین ثبت‌نام، دوره‌های فعال و آرشیوی شما در این صفحه نمایش داده می‌شوند.",
  },
  "new-course": {
    title: "ثبت دوره جدید",
    description:
      "از منوی کناری «ثبت دوره جدید» را انتخاب کنید تا به ویزارد ساخت دوره بروید.",
  },
  "manual-enrollment": {
    title: "ثبت‌نام دستی",
    description:
      "ابزار ثبت‌نام دستی کاربران در دوره‌ها در مرحله‌ی ۴ پیاده‌سازی می‌شود.",
  },
  tickets: {
    title: "تیکت‌های پشتیبانی",
    description:
      "سیستم تیکت در مرحله‌ی ۶ پیاده‌سازی می‌شود. تا آن زمان تماس‌ها از طریق صفحه‌ی «تماس با ما» مدیریت می‌شوند.",
  },
  users: {
    title: "مدیریت کاربران",
    description:
      "برای دسترسی به مدیریت کاربران، از منوی کناری «مدیریت کاربران» را انتخاب کنید.",
  },
  stats: {
    title: "آمار و گزارش‌ها",
    description:
      "برای مشاهده‌ی آمار سیستم، از منوی کناری «آمار» را انتخاب کنید.",
  },
};

/** Default section when navigating to /dashboard without a section. */
export const DEFAULT_SECTION = "my-courses";

/**
 * Sections that have a dedicated route file (not the catch-all).
 *
 * These sections have their own page under `_panel.*.tsx` with a custom
 * URL pattern (e.g. `_panel.become-instructor.tsx` → /dashboard/become-instructor).
 * Sections NOT in this set fall through to the catch-all
 * `_panel.$section.tsx` → /dashboard/<section>.
 *
 * Keys are section slugs; values are the URL path segment(s) after
 * /dashboard/. For nested sections like support/instructor-applications,
 * the value is the full sub-path.
 */
export const DEDICATED_SECTION_ROUTES: Record<string, string> = {
  "become-instructor": "become-instructor",
  "instructor-applications": "support/instructor-applications",
  "create-course": "create-course",
  "courses-review": "support/courses",
  "my-enrollments": "my-enrollments",
  wallet: "wallet",
  "payments-review": "support/payments",
  tickets: "tickets",
  "support-tickets": "support/tickets",
  "manual-enrollment": "support/manual-enrollment",
  "audit-log": "audit-log",
  users: "users",
  stats: "stats",
  profile: "profile",
  settings: "settings",
};

/**
 * Build the TanStack Router `to` path + params for a given section.
 *
 * - Dedicated sections (in DEDICATED_SECTION_ROUTES) get a custom route
 *   path. The `to` is the full route id path (with `_panel` prefix),
 *   and `params` is empty (their paths are static).
 * - Other sections use the catch-all `_panel/$section` route.
 *
 * Returns a `{ to, params }` shape suitable for spreading into a `<Link>`.
 */
export function getSectionRoute(section: string): {
  to: string;
  params: Record<string, string>;
} {
  const dedicated = DEDICATED_SECTION_ROUTES[section];
  if (dedicated) {
    // Dedicated routes have static paths — no $params.
    // The `to` is the canonical route path TanStack expects.
    return {
      to: `/dashboard/${dedicated}`,
      params: {},
    };
  }
  return {
    to: "/dashboard/$section",
    params: { section },
  };
}

/** Type-only re-export for the LayoutDashboard icon (placeholder). */
export type { LayoutDashboard };

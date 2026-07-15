/**
 * Navigation System 2.0 — role-aware navigation config.
 *
 * This is the FOUNDATION for future dashboard navigation. It does NOT
 * replace the existing `dashboard-nav.ts` config — that's still used
 * by all current routes. This is a cleaner, permission-aware version
 * for future stages.
 *
 * Key differences from the existing config:
 *   - Each nav item has an optional `permission` field (not wired yet)
 *   - Items are grouped by section (not flat)
 *   - Icons are Lucide components (not imported separately)
 *   - Role filtering uses the Permission Matrix from Stage 6.5
 */
import {
  BookOpen,
  GraduationCap,
  PlusCircle,
  Wallet,
  Inbox,
  CreditCard,
  Ticket,
  UserPlus,
  Users,
  BarChart3,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/server/db/schema";
import type { Permission } from "@/shared/rbac/permissions";
import { hasPermission } from "@/shared/rbac/permissions";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface NavItemV2 {
  label: string;
  icon: LucideIcon;
  href: string;
  /** If set, only roles with this permission can see the item. */
  permission?: Permission;
  /** Explicit role list (overrides permission). If omitted, uses permission. */
  roles?: Role[];
  badge?: number;
}

export interface NavSection {
  label?: string;
  items: NavItemV2[];
}

/* ------------------------------------------------------------------ */
/* Navigation Config                                                   */
/* ------------------------------------------------------------------ */

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      {
        label: "دوره‌های من",
        icon: BookOpen,
        href: "/dashboard/my-courses",
        permission: "course.view",
      },
      {
        label: "ثبت‌نام‌های من",
        icon: BookOpen,
        href: "/dashboard/my-enrollments",
        roles: ["student", "instructor", "support", "admin"],
      },
    ],
  },
  {
    label: "دانشجو",
    items: [
      {
        label: "درخواست تدریس",
        icon: GraduationCap,
        href: "/dashboard/become-instructor",
        roles: ["student"],
      },
    ],
  },
  {
    label: "مدرس",
    items: [
      {
        label: "ثبت دوره جدید",
        icon: PlusCircle,
        href: "/dashboard/create-course",
        permission: "course.create",
      },
      {
        label: "کیف‌پول من",
        icon: Wallet,
        href: "/dashboard/wallet",
        permission: "wallet.view",
      },
    ],
  },
  {
    label: "پشتیبانی",
    items: [
      {
        label: "درخواست‌های مدرسی",
        icon: Inbox,
        href: "/dashboard/support/instructor-applications",
        permission: "instructorApplication.review",
      },
      {
        label: "بررسی دوره‌ها",
        icon: Inbox,
        href: "/dashboard/support/courses",
        permission: "course.review",
      },
      {
        label: "بررسی پرداخت‌ها",
        icon: CreditCard,
        href: "/dashboard/support/payments",
        permission: "enrollment.review",
      },
      {
        label: "تیکت‌ها",
        icon: Ticket,
        href: "/dashboard/support/tickets",
        permission: "ticket.viewAll",
      },
      {
        label: "ثبت‌نام دستی",
        icon: UserPlus,
        href: "/dashboard/support/manual-enrollment",
        permission: "enrollment.manualCreate",
      },
    ],
  },
  {
    label: "مدیریت",
    items: [
      {
        label: "مدیریت کاربران",
        icon: Users,
        href: "/dashboard/users",
        roles: ["admin"],
      },
      {
        label: "گزارش فعالیت‌ها",
        icon: ScrollText,
        href: "/dashboard/audit-log",
        roles: ["admin"],
      },
      {
        label: "آمار",
        icon: BarChart3,
        href: "/dashboard/stats",
        roles: ["admin"],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Check if a role can see a specific nav item.
 * If `roles` is set, use it directly. Otherwise, check `permission`.
 */
function canSeeItem(role: Role, item: NavItemV2): boolean {
  if (item.roles) return item.roles.includes(role);
  if (item.permission) return hasPermission(role, item.permission);
  return true; // no restriction
}

/**
 * Get all nav sections filtered for a specific role.
 * Empty sections (all items filtered out) are removed.
 */
export function getNavSectionsForRole(role: Role): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeItem(role, item)),
  })).filter((section) => section.items.length > 0);
}

/**
 * Get a flat list of nav items for a role (no section grouping).
 */
export function getFlatNavForRole(role: Role): NavItemV2[] {
  return getNavSectionsForRole(role).flatMap((s) => s.items);
}

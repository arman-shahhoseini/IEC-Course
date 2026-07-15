/**
 * Permission Matrix — the canonical source of truth for what each role
 * can do in the system.
 *
 * This is the FOUNDATION layer. It does NOT replace the existing
 * `requireRole()` calls in server functions — those continue to work
 * as before. This matrix exists so that future stages can check
 * permissions by name (e.g. `hasPermission(user, "course.create")`)
 * instead of hardcoding role lists everywhere.
 *
 * Permission naming convention: `<resource>.<action>`
 *
 * The matrix is intentionally a static object (not a DB table) so it's
 * easy to audit and version-control. If per-user permissions are needed
 * later, a `user_permissions` override table can be added on top.
 */
import type { Role } from "@/server/db/schema";

/* ------------------------------------------------------------------ */
/* Permission type                                                     */
/* ------------------------------------------------------------------ */

export type Permission =
  // Course permissions
  | "course.create"
  | "course.edit"
  | "course.publish"
  | "course.delete"
  | "course.review"
  | "course.approve"
  | "course.reject"
  | "course.view"
  // Ticket permissions
  | "ticket.create"
  | "ticket.reply"
  | "ticket.close"
  | "ticket.assign"
  | "ticket.view"
  | "ticket.viewAll"
  // Wallet permissions
  | "wallet.deposit"
  | "wallet.withdraw"
  | "wallet.refund"
  | "wallet.view"
  // User permissions
  | "user.view"
  | "user.edit"
  | "user.delete"
  | "user.create"
  // Dashboard permissions
  | "dashboard.view"
  // Audit permissions
  | "audit.view"
  // Settings permissions
  | "settings.edit"
  // Enrollment permissions
  | "enrollment.create"
  | "enrollment.review"
  | "enrollment.manualCreate"
  // Instructor application permissions
  | "instructorApplication.submit"
  | "instructorApplication.review"
  | "instructorApplication.approve"
  | "instructorApplication.reject";

/* ------------------------------------------------------------------ */
/* Permission Matrix                                                   */
/* ------------------------------------------------------------------ */

export const PERMISSION_MATRIX: Record<Exclude<Role, "admin">, Permission[]> = {
  student: [
    "course.view",
    "ticket.create",
    "ticket.reply",
    "ticket.close",
    "ticket.view",
    "enrollment.create",
    "instructorApplication.submit",
    "dashboard.view",
  ],
  instructor: [
    "course.view",
    "ticket.create",
    "ticket.reply",
    "ticket.close",
    "ticket.view",
    "enrollment.create",
    "dashboard.view",
    "course.create",
    "course.edit",
    "wallet.view",
  ],
  support: [
    "course.view",
    "ticket.create",
    "ticket.reply",
    "ticket.close",
    "ticket.view",
    "enrollment.create",
    "dashboard.view",
    "ticket.viewAll",
    "ticket.assign",
    "course.review",
    "course.approve",
    "course.reject",
    "enrollment.review",
    "enrollment.manualCreate",
    "instructorApplication.review",
    "instructorApplication.approve",
    "instructorApplication.reject",
    "wallet.view",
  ],
};

export const ALL_PERMISSIONS: Permission[] = [
  "course.create",
  "course.edit",
  "course.publish",
  "course.delete",
  "course.review",
  "course.approve",
  "course.reject",
  "course.view",
  "ticket.create",
  "ticket.reply",
  "ticket.close",
  "ticket.assign",
  "ticket.view",
  "ticket.viewAll",
  "wallet.deposit",
  "wallet.withdraw",
  "wallet.refund",
  "wallet.view",
  "user.view",
  "user.edit",
  "user.delete",
  "user.create",
  "dashboard.view",
  "audit.view",
  "settings.edit",
  "enrollment.create",
  "enrollment.review",
  "enrollment.manualCreate",
  "instructorApplication.submit",
  "instructorApplication.review",
  "instructorApplication.approve",
  "instructorApplication.reject",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function hasPermission(role: Role, permission: Permission): boolean {
  if (role === "admin") return true;
  const perms = PERMISSION_MATRIX[role as Exclude<Role, "admin">];
  return perms.includes(permission);
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  if (role === "admin") return ALL_PERMISSIONS;
  return PERMISSION_MATRIX[role as Exclude<Role, "admin">] ?? [];
}

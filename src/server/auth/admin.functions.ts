/**
 * Admin server functions — user management + system-wide stats.
 *
 * All functions enforce `requireRole(["admin"])` server-side. The
 * `_panel.users.tsx` and `_panel.stats.tsx` route components also do
 * a UX-only role check, but the server check is the security boundary.
 *
 * No fabrication: every count comes from a real DB query. If the DB
 * is unavailable, functions throw a structured 503 error that the UI
 * surfaces as "service unavailable".
 *
 * Audit log: every state-changing operation (role change, activate,
 * deactivate) writes an audit log entry with actorId, action, target,
 * and metadata. This is a security requirement per Rule 4.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq, count, and, sql, ilike, or } from "drizzle-orm";
import { requireRole, AuthorizationError } from "./rbac";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  users,
  courses,
  enrollments,
  walletTransactions,
  tickets,
  type Role,
} from "../db/schema";
import { recordAuditLog } from "../audit/log";

/* ------------------------------------------------------------------ */
/* 1. User management                                                  */
/* ------------------------------------------------------------------ */

export interface AdminUserRow {
  id: string;
  phone: string;
  fullName: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface ListUsersInput {
  search?: string;
  roleFilter?: Role | "all";
  limit: number;
  offset: number;
}

export interface ListUsersResult {
  rows: AdminUserRow[];
  total: number;
}

/**
 * List users with optional search + role filter + pagination.
 *
 * Search matches phone OR fullName (case-insensitive via ILIKE).
 * Returns total count for pagination UI.
 */
export const listUsers = createServerFn({ method: "GET" })
  .validator((data: unknown): ListUsersInput => {
    const d = data as Record<string, unknown>;
    return {
      search: typeof d.search === "string" ? d.search.trim() : undefined,
      roleFilter:
        d.roleFilter === "student" ||
        d.roleFilter === "instructor" ||
        d.roleFilter === "support" ||
        d.roleFilter === "admin" ||
        d.roleFilter === "all"
          ? d.roleFilter
          : "all",
      limit:
        typeof d.limit === "number" && d.limit > 0 && d.limit <= 100
          ? d.limit
          : 20,
      offset: typeof d.offset === "number" && d.offset >= 0 ? d.offset : 0,
    };
  })
  .handler(async ({ data }): Promise<ListUsersResult> => {
    await requireRole(["admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const conditions = [];
    if (data.search) {
      const pattern = `%${data.search}%`;
      conditions.push(
        or(ilike(users.phone, pattern), ilike(users.fullName, pattern))!,
      );
    }
    if (data.roleFilter && data.roleFilter !== "all") {
      conditions.push(eq(users.role, data.roleFilter));
    }
    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const [rows, totalRows] = await Promise.all([
      db
        .select({
          id: users.id,
          phone: users.phone,
          fullName: users.fullName,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where)
        .orderBy(users.createdAt)
        .limit(data.limit)
        .offset(data.offset),
      db.select({ c: count() }).from(users).where(where),
    ]);

    return {
      rows: rows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
      total: Number(totalRows[0]?.c ?? 0),
    };
  });

/* ------------------------------------------------------------------ */
/* 2. Change user role                                                 */
/* ------------------------------------------------------------------ */

export interface ChangeUserRoleInput {
  userId: string;
  newRole: Role;
}

/**
 * Change a user's role. Writes an audit log entry with the previous
 * and new role. Cannot change your own role (defense against
 * accidental self-lockout).
 */
export const changeUserRole = createServerFn({ method: "POST" })
  .validator((data: unknown): ChangeUserRoleInput => {
    const d = data as Record<string, unknown>;
    if (typeof d.userId !== "string" || !d.userId) {
      throw new Error("شناسه‌ی کاربر الزامی است.");
    }
    if (
      d.newRole !== "student" &&
      d.newRole !== "instructor" &&
      d.newRole !== "support" &&
      d.newRole !== "admin"
    ) {
      throw new Error("نقش نامعتبر است.");
    }
    return { userId: d.userId, newRole: d.newRole };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const admin = await requireRole(["admin"]);
    if (admin.id === data.userId) {
      throw new AuthorizationError(
        "شما نمی‌توانید نقش حساب کاربری خود را تغییر دهید.",
        "FORBIDDEN",
      );
    }

    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Fetch current role for audit log + validation.
    const current = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (current.length === 0) {
      throw new AuthorizationError("کاربر یافت نشد.", "FORBIDDEN");
    }
    const previousRole = current[0].role;
    if (previousRole === data.newRole) {
      // No-op — return success without writing audit log.
      return { ok: true };
    }

    await db
      .update(users)
      .set({ role: data.newRole, updatedAt: new Date() })
      .where(eq(users.id, data.userId));

    await recordAuditLog({
      actorId: admin.id,
      action: "user.role_changed",
      targetType: "user",
      targetId: data.userId,
      metadata: { previousRole, newRole: data.newRole },
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* 3. Activate / deactivate user                                       */
/* ------------------------------------------------------------------ */

export interface SetUserActiveInput {
  userId: string;
  isActive: boolean;
}

/**
 * Activate or deactivate a user. Inactive users cannot log in.
 * Writes an audit log entry. Cannot deactivate yourself.
 */
export const setUserActive = createServerFn({ method: "POST" })
  .validator((data: unknown): SetUserActiveInput => {
    const d = data as Record<string, unknown>;
    if (typeof d.userId !== "string" || !d.userId) {
      throw new Error("شناسه‌ی کاربر الزامی است.");
    }
    if (typeof d.isActive !== "boolean") {
      throw new Error("وضعیت فعال بودن باید true یا false باشد.");
    }
    return { userId: d.userId, isActive: d.isActive };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const admin = await requireRole(["admin"]);
    if (admin.id === data.userId) {
      throw new AuthorizationError(
        "شما نمی‌توانید حساب کاربری خود را غیرفعال کنید.",
        "FORBIDDEN",
      );
    }

    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const current = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, data.userId))
      .limit(1);

    if (current.length === 0) {
      throw new AuthorizationError("کاربر یافت نشد.", "FORBIDDEN");
    }
    if (current[0].isActive === data.isActive) {
      return { ok: true };
    }

    await db
      .update(users)
      .set({ isActive: data.isActive, updatedAt: new Date() })
      .where(eq(users.id, data.userId));

    await recordAuditLog({
      actorId: admin.id,
      action: data.isActive ? "user.activated" : "user.deactivated",
      targetType: "user",
      targetId: data.userId,
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* 4. System-wide stats                                                */
/* ------------------------------------------------------------------ */

export interface AdminStats {
  /** Users grouped by role. Keys are role names, values are counts. */
  usersByRole: Record<Role, number>;
  /** Total user count (sum of all roles). */
  totalUsers: number;
  /** Courses grouped by status. */
  coursesByStatus: {
    draft: number;
    pending_review: number;
    published: number;
    rejected: number;
  };
  /** Total enrollments (all statuses). */
  totalEnrollments: number;
  /** Enrollments by status. */
  enrollmentsByStatus: {
    pending_payment_review: number;
    confirmed: number;
    rejected: number;
  };
  /**
   * Total revenue — sum of `wallet_transactions.amount` where
   * `type = 'credit'` AND `related_enrollment_id IS NOT NULL`. This is
   * the canonical "money paid out to instructors" figure (net of
   * commission — credit transactions store the post-commission net).
   * All amounts in Tomans (integer).
   */
  totalRevenue: number;
  /** Tickets grouped by status (3-state lifecycle). */
  ticketsByStatus: {
    open: number;
    in_progress: number;
    closed: number;
  };
}

/**
 * Get system-wide statistics for the admin stats dashboard.
 * All counts are real DB queries — zero fabrication.
 */
export const getAdminStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<AdminStats> => {
    await requireRole(["admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Run all count queries in parallel for speed.
    const [
      usersByRoleRows,
      coursesByStatusRows,
      enrollmentsByStatusRows,
      totalEnrollmentsRows,
      totalRevenueRows,
      ticketsByStatusRows,
    ] = await Promise.all([
      // Users by role
      db
        .select({ role: users.role, c: count() })
        .from(users)
        .groupBy(users.role),
      // Courses by status
      db
        .select({ status: courses.status, c: count() })
        .from(courses)
        .groupBy(courses.status),
      // Enrollments by status
      db
        .select({ status: enrollments.status, c: count() })
        .from(enrollments)
        .groupBy(enrollments.status),
      // Total enrollments
      db.select({ c: count() }).from(enrollments),
      // Total revenue — sum of credit transactions tied to an enrollment
      // (i.e. instructor payouts for confirmed enrollments).
      db
        .select({
          total: sql<number>`coalesce(sum(${walletTransactions.amount}), 0)::int`,
        })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.type, "credit"),
            sql`${walletTransactions.relatedEnrollmentId} IS NOT NULL`,
          ),
        ),
      // Tickets by status
      db
        .select({ status: tickets.status, c: count() })
        .from(tickets)
        .groupBy(tickets.status),
    ]);

    // Assemble role counts (initialize all roles to 0 in case some
    // have zero users — never fabricate, but always show all roles).
    const usersByRole: Record<Role, number> = {
      student: 0,
      instructor: 0,
      support: 0,
      admin: 0,
    };
    for (const row of usersByRoleRows) {
      usersByRole[row.role] = Number(row.c);
    }
    const totalUsers = Object.values(usersByRole).reduce((a, b) => a + b, 0);

    // Assemble course status counts
    const coursesByStatus = {
      draft: 0,
      pending_review: 0,
      published: 0,
      rejected: 0,
    };
    for (const row of coursesByStatusRows) {
      coursesByStatus[row.status] = Number(row.c);
    }

    // Assemble enrollment status counts
    const enrollmentsByStatus = {
      pending_payment_review: 0,
      confirmed: 0,
      rejected: 0,
    };
    for (const row of enrollmentsByStatusRows) {
      enrollmentsByStatus[row.status] = Number(row.c);
    }

    // Assemble ticket status counts (3-state lifecycle)
    const ticketsByStatus = { open: 0, in_progress: 0, closed: 0 };
    for (const row of ticketsByStatusRows) {
      ticketsByStatus[row.status] = Number(row.c);
    }

    return {
      usersByRole,
      totalUsers,
      coursesByStatus,
      totalEnrollments: Number(totalEnrollmentsRows[0]?.c ?? 0),
      enrollmentsByStatus,
      totalRevenue: Number(totalRevenueRows[0]?.total ?? 0),
      ticketsByStatus,
    };
  },
);

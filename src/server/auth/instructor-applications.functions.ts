/**
 * Server functions for the instructor application workflow.
 *
 * Three operations:
 *   1. `getMyInstructorApplication` — GET: returns the caller's current
 *      pending application (or null). Used by the form page to decide
 *      whether to show the form or a "pending" status.
 *   2. `submitInstructorApplication` — POST: validates input, checks the
 *      one-pending-application rule, inserts a new row.
 *   3. `listInstructorApplications` — GET (support/admin only): returns
 *      all applications, optionally filtered by status. Used by the
 *      review queue.
 *   4. `reviewInstructorApplication` — POST (support/admin only):
 *      approves or rejects an application. On approval, the applicant's
 *      `users.role` is flipped to `instructor` in the SAME Drizzle
 *      transaction.
 *
 * File naming: `.functions.ts` (not `.server.ts`) so TanStack's
 * import-protection allows client code to import these as RPC stubs.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  instructorApplications,
  users,
  type ApplicationStatus,
  type InstructorApplication,
} from "../db/schema";
import { requireRole, requireAuthenticated, AuthorizationError } from "./rbac";
import { recordAuditLog } from "../audit/log";
import { invalidateAllSessionsForUser } from "./session";

// Re-export the status type so route components can import it from the
// server-function module (single import site for everything related to
// instructor applications).
export type { ApplicationStatus };

/* ------------------------------------------------------------------ */
/* Types (shared with client — returned by the server functions)       */
/* ------------------------------------------------------------------ */

/** Public shape of an instructor application — safe to send to client. */
export interface InstructorApplicationPublic {
  id: string;
  userId: string;
  specialization: string;
  bio: string;
  experienceYears: number | null;
  sampleWorkUrl: string | null;
  status: ApplicationStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Extended shape for the review queue — includes applicant info. */
export interface InstructorApplicationWithApplicant extends InstructorApplicationPublic {
  applicantName: string | null;
  applicantPhone: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toPublic(
  row: typeof instructorApplications.$inferSelect,
): InstructorApplicationPublic {
  return {
    id: row.id,
    userId: row.userId,
    specialization: row.specialization,
    bio: row.bio,
    experienceYears: row.experienceYears,
    sampleWorkUrl: row.sampleWorkUrl,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Input shape for `submitInstructorApplication`. */
export interface InstructorApplicationInput {
  specialization: string;
  bio: string;
  experienceYears: number | null;
  sampleWorkUrl: string | null;
}

/** Validation result — `null` means valid, otherwise a Persian error. */
function validateInput(input: InstructorApplicationInput): string | null {
  if (!input.specialization || input.specialization.trim().length < 3) {
    return "حوزه‌ی تخصص باید حداقل ۳ کاراکتر باشد.";
  }
  if (input.specialization.length > 200) {
    return "حوزه‌ی تخصص نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }
  if (!input.bio || input.bio.trim().length < 50) {
    return "معرفی و بیوگرافی باید حداقل ۵۰ کاراکتر باشد.";
  }
  if (input.bio.length > 5000) {
    return "معرفی و بیوگرافی نباید بیشتر از ۵۰۰۰ کاراکتر باشد.";
  }
  if (input.experienceYears !== null && input.experienceYears !== undefined) {
    if (
      !Number.isFinite(input.experienceYears) ||
      input.experienceYears < 0 ||
      input.experienceYears > 80
    ) {
      return "سابقه‌ی تدریس باید عددی بین ۰ تا ۸۰ باشد.";
    }
  }
  if (input.sampleWorkUrl && input.sampleWorkUrl.trim().length > 0) {
    const trimmed = input.sampleWorkUrl.trim();
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "لینک نمونه‌کار باید با http:// یا https:// شروع شود.";
      }
    } catch {
      return "لینک نمونه‌کار معتبر نیست.";
    }
    if (trimmed.length > 1000) {
      return "لینک نمونه‌کار بیش از حد طولانی است.";
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1. Get my current pending application                               */
/* ------------------------------------------------------------------ */

export const getMyInstructorApplication = createServerFn({
  method: "GET",
}).handler(async (): Promise<InstructorApplicationPublic | null> => {
  // Any authenticated user can check their own application status.
  const user = await requireAuthenticated();
  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      throw new AuthorizationError(err.message, "UNAUTHENTICATED");
    }
    throw err;
  }

  // Return the most recent application (pending or otherwise) so the
  // form page can show appropriate status. We don't filter by status
  // here because the form page needs to know about rejected ones too
  // (to allow resubmission).
  const [row] = await db
    .select()
    .from(instructorApplications)
    .where(eq(instructorApplications.userId, user.id))
    .orderBy(desc(instructorApplications.createdAt))
    .limit(1);

  return row ? toPublic(row) : null;
});

/* ------------------------------------------------------------------ */
/* 2. Submit a new application                                         */
/* ------------------------------------------------------------------ */

export const submitInstructorApplication = createServerFn({ method: "POST" })
  .validator((data: unknown): InstructorApplicationInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    const input: InstructorApplicationInput = {
      specialization:
        typeof d.specialization === "string" ? d.specialization : "",
      bio: typeof d.bio === "string" ? d.bio : "",
      experienceYears:
        d.experienceYears === null || d.experienceYears === undefined
          ? null
          : typeof d.experienceYears === "number"
            ? d.experienceYears
            : typeof d.experienceYears === "string" &&
                /^\d+$/.test(d.experienceYears)
              ? parseInt(d.experienceYears, 10)
              : null,
      sampleWorkUrl:
        typeof d.sampleWorkUrl === "string" && d.sampleWorkUrl.trim().length > 0
          ? d.sampleWorkUrl.trim()
          : null,
    };
    const error = validateInput(input);
    if (error) {
      // Throwing inside the validator makes TanStack return a 400 with
      // the error message — exactly what we want for form validation.
      throw new Error(error);
    }
    return input;
  })
  .handler(async ({ data }): Promise<InstructorApplicationPublic> => {
    const user = await requireAuthenticated();
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Business rule: a user may not have more than ONE pending
    // application at a time. This is checked server-side, not just in
    // the UI — a malicious client could bypass the UI check.
    const [existing] = await db
      .select({ id: instructorApplications.id })
      .from(instructorApplications)
      .where(
        and(
          eq(instructorApplications.userId, user.id),
          eq(instructorApplications.status, "pending"),
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error(
        "شما یک درخواست در حال بررسی دارید. تا مشخص‌شدن وضعیت آن نمی‌توانید درخواست جدیدی ثبت کنید.",
      );
    }

    // Bonus: if the user is already an instructor/support/admin, they
    // shouldn't be applying. Reject early.
    if (user.role !== "student") {
      throw new Error(
        "فقط کاربران با نقش دانشجو می‌توانند درخواست تدریس ثبت کنند.",
      );
    }

    const [row] = await db
      .insert(instructorApplications)
      .values({
        userId: user.id,
        specialization: data.specialization,
        bio: data.bio,
        experienceYears: data.experienceYears,
        sampleWorkUrl: data.sampleWorkUrl,
      })
      .returning();

    if (!row) {
      throw new Error("ثبت درخواست با خطا مواجه شد. لطفاً دوباره تلاش کنید.");
    }

    return toPublic(row);
  });

/* ------------------------------------------------------------------ */
/* 3. List applications (support/admin only)                           */
/* ------------------------------------------------------------------ */

export const listInstructorApplications = createServerFn({ method: "GET" })
  .validator((data: unknown): { status?: ApplicationStatus } => {
    if (data === null || data === undefined) return {};
    if (typeof data !== "object") return {};
    const d = data as Record<string, unknown>;
    if (
      d.status === "pending" ||
      d.status === "approved" ||
      d.status === "rejected"
    ) {
      return { status: d.status };
    }
    return {};
  })
  .handler(async ({ data }): Promise<InstructorApplicationWithApplicant[]> => {
    // Support and admin only. `requireRole` throws AuthorizationError
    // (401/403) if the caller doesn't qualify.
    await requireRole(["support", "admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    const whereClause = data.status
      ? eq(instructorApplications.status, data.status)
      : undefined;

    // Join with users to get applicant name + phone for the table.
    // Sort by created_at desc so newest applications appear first.
    const rows = await db
      .select({
        app: instructorApplications,
        applicantName: users.fullName,
        applicantPhone: users.phone,
      })
      .from(instructorApplications)
      .innerJoin(users, eq(instructorApplications.userId, users.id))
      .where(whereClause ?? sql`true`)
      .orderBy(desc(instructorApplications.createdAt));

    return rows.map((r) => ({
      ...toPublic(r.app),
      applicantName: r.applicantName,
      applicantPhone: r.applicantPhone,
    }));
  });

/* ------------------------------------------------------------------ */
/* 4. Review an application (approve / reject)                         */
/* ------------------------------------------------------------------ */

export interface ReviewInstructorApplicationInput {
  applicationId: string;
  action: "approve" | "reject";
  /** Required when action = "reject". Optional note for approve. */
  reviewNote?: string;
}

export const reviewInstructorApplication = createServerFn({ method: "POST" })
  .validator((data: unknown): ReviewInstructorApplicationInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.applicationId !== "string" || !d.applicationId) {
      throw new Error("شناسه‌ی درخواست الزامی است.");
    }
    if (d.action !== "approve" && d.action !== "reject") {
      throw new Error("عملیات باید «approve» یا «reject» باشد.");
    }
    const note = typeof d.reviewNote === "string" ? d.reviewNote.trim() : "";

    if (d.action === "reject" && note.length < 5) {
      throw new Error("دلیل رد درخواست باید حداقل ۵ کاراکتر باشد.");
    }

    return {
      applicationId: d.applicationId,
      action: d.action,
      reviewNote: note.length > 0 ? note : undefined,
    };
  })
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const reviewer = await requireRole(["support", "admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Load the application. Must be pending — can't review an already-
    // reviewed one.
    const [existing] = await db
      .select()
      .from(instructorApplications)
      .where(eq(instructorApplications.id, data.applicationId))
      .limit(1);

    if (!existing) {
      throw new Error("درخواست مورد نظر یافت نشد.");
    }
    if (existing.status !== "pending") {
      throw new Error(
        "این درخواست قبلاً بررسی شده است و امکان تغییر وضعیت آن وجود ندارد.",
      );
    }

    const newStatus: ApplicationStatus =
      data.action === "approve" ? "approved" : "rejected";
    const now = new Date();

    // ── ATOMIC TRANSACTION ──────────────────────────────────────────
    // On approval, THREE operations are wrapped in a single Drizzle
    // transaction:
    //   1. instructor_applications.status = approved (+ reviewed_by, reviewed_at)
    //   2. users.role = instructor (for the applicant)
    //   3. DELETE all active sessions for the applicant (session
    //      invalidation — fixes Stage 3's "session staleness" bug)
    //
    // Why all three in one transaction?
    // - (1) and (2) MUST be atomic: a half-applied state (application
    //   approved but role unchanged, or vice versa) would be a real bug.
    // - (3) is grouped with them so that if the role flip fails, we
    //   DON'T leave the user logged out AND still-a-student. If we did
    //   (3) outside the transaction and (2) failed, the user would be
    //   force-logged-out but still a student on next login — confusing.
    //   By keeping (3) inside, a failure rolls back everything and the
    //   user stays logged in as a student (the application remains
    //   pending) — they can retry the review.
    //
    // On rejection, only the application row is updated (no role change,
    // no session invalidation). We still wrap it in a transaction for
    // consistency — if we later add side-effects (e.g. audit log),
    // they'll be atomic too.
    await db.transaction(async (tx) => {
      // 1. Update the application row.
      await tx
        .update(instructorApplications)
        .set({
          status: newStatus,
          reviewedBy: reviewer.id,
          reviewedAt: now,
          reviewNote: data.reviewNote ?? null,
        })
        .where(eq(instructorApplications.id, data.applicationId));

      // 2. On approval, flip the applicant's role to instructor.
      if (newStatus === "approved") {
        await tx
          .update(users)
          .set({ role: "instructor" })
          .where(eq(users.id, existing.userId));

        // 3. Invalidate ALL of the applicant's active sessions so that
        // their next request picks up the new role. Without this, the
        // newly-approved instructor would still see the student menu
        // until their session cookie expired or they manually logged
        // out — the "session staleness" bug from Stage 3.
        //
        // Edge case: if the applicant is the SAME user as the reviewer
        // (an admin reviewing their own application — unusual but
        // possible), this would also log out the reviewer. That's
        // acceptable: the reviewer's next request will redirect them
        // to /dashboard (OTP form) and they'll log back in with their
        // new role.
        await invalidateAllSessionsForUser(existing.userId, { tx });
      }
    });

    // Record audit log (outside the transaction — non-critical).
    await recordAuditLog({
      actorId: reviewer.id,
      action:
        data.action === "approve"
          ? "instructor_application.approved"
          : "instructor_application.rejected",
      targetType: "instructor_application",
      targetId: data.applicationId,
      metadata: {
        applicantUserId: existing.userId,
        reviewNote: data.reviewNote ?? null,
      },
    });

    return { ok: true };
  });

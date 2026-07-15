/**
 * Server functions for the enrollment + payment + wallet workflow.
 *
 * Functions:
 *   1. `getEnrollmentForCourse` — returns the student's current
 *      pending enrollment for a course (or null).
 *   2. `createEnrollment` — POST: validates, saves the uploaded receipt
 *      to disk, inserts an enrollment row with `pending_payment_review`.
 *   3. `getMyEnrollments` — GET: returns the student's enrollments.
 *   4. `listEnrollmentsForReview` — GET (support/admin): returns all
 *      enrollments, optionally filtered by status.
 *   5. `reviewEnrollment` — POST (support/admin): confirms or rejects
 *      an enrollment. On confirm: atomically updates enrollment status,
 *      creates/updates the instructor's wallet, and inserts a
 *      `wallet_transactions` row with the snapshot commission rate.
 *   6. `getMyWallet` — GET: returns the instructor's wallet balance +
 *      transaction history.
 *
 * File naming: `.functions.ts` so TanStack's import-protection allows
 * client code to import these as RPC stubs.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, extname } from "node:path";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  enrollments,
  wallets,
  walletTransactions,
  courses,
  users,
  type EnrollmentStatus,
  type Enrollment,
} from "../db/schema";
import { requireRole, requireAuthenticated, AuthorizationError } from "./rbac";
import { recordAuditLog } from "../audit/log";

// Re-export the status type for client use.
export type { EnrollmentStatus };

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface EnrollmentPublic {
  id: string;
  studentId: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  declaredAmount: number;
  receiptImagePath: string;
  receiptImageUrl: string;
  status: EnrollmentStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface EnrollmentWithDetails extends EnrollmentPublic {
  studentName: string | null;
  studentPhone: string;
  coursePrice: number | null;
  courseInstructorId: string | null;
  courseSource: "legacy" | "platform";
}

export interface WalletPublic {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
}

export interface WalletTransactionPublic {
  id: string;
  type: "credit" | "debit";
  amount: number;
  commissionRateApplied: number | null;
  description: string;
  createdAt: string;
}

export interface WalletWithTransactions {
  wallet: WalletPublic | null;
  transactions: WalletTransactionPublic[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toEnrollmentPublic(
  row: typeof enrollments.$inferSelect,
  course: { title: string; slug: string },
): EnrollmentPublic {
  return {
    id: row.id,
    studentId: row.studentId,
    courseId: row.courseId,
    courseTitle: course.title,
    courseSlug: course.slug,
    declaredAmount: row.declaredAmount,
    receiptImagePath: row.receiptImagePath,
    // The receipt image is served from /uploads/receipts/{filename}.
    // A server route (defined separately) serves these files with
    // proper content-type.
    receiptImageUrl: `/uploads/receipts/${row.receiptImagePath}`,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 1. getEnrollmentForCourse                                           */
/* ------------------------------------------------------------------ */

export const getEnrollmentForCourse = createServerFn({ method: "GET" })
  .validator((data: unknown): string => {
    if (typeof data !== "object" || data === null || !("courseId" in data)) {
      throw new Error("courseId الزامی است.");
    }
    const id = (data as { courseId: unknown }).courseId;
    if (typeof id !== "string" || !id) {
      throw new Error("courseId باید یک رشته‌ی غیرخالی باشد.");
    }
    return id;
  })
  .handler(async ({ data }): Promise<EnrollmentPublic | null> => {
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

    // Find the student's most recent enrollment for this course
    // (pending or otherwise) so the form page can show appropriate status.
    const [row] = await db
      .select({
        enrollment: enrollments,
        courseTitle: courses.title,
        courseSlug: courses.slug,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(
        and(eq(enrollments.studentId, user.id), eq(enrollments.courseId, data)),
      )
      .orderBy(desc(enrollments.createdAt))
      .limit(1);

    if (!row) return null;
    return toEnrollmentPublic(row.enrollment, {
      title: row.courseTitle,
      slug: row.courseSlug,
    });
  });

/* ------------------------------------------------------------------ */
/* 2. createEnrollment (with receipt upload)                           */
/* ------------------------------------------------------------------ */

export interface CreateEnrollmentInput {
  courseId: string;
  declaredAmount: number;
  /** Base64-encoded image data (from the client file input). */
  receiptImageBase64: string;
  /** MIME type — must be image/jpeg, image/png, or image/webp. */
  receiptImageMimeType: string;
  /** Original filename (for extension extraction only). */
  receiptImageFilename: string;
}

/** Max receipt image size — 5 MB (as base64, ~6.7 MB). */
const MAX_BASE64_SIZE = 7_000_000;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const createEnrollment = createServerFn({ method: "POST" })
  .validator((data: unknown): CreateEnrollmentInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;

    if (typeof d.courseId !== "string" || !d.courseId) {
      throw new Error("شناسه‌ی دوره الزامی است.");
    }

    const declaredAmount =
      typeof d.declaredAmount === "number"
        ? d.declaredAmount
        : typeof d.declaredAmount === "string" && /^\d+$/.test(d.declaredAmount)
          ? parseInt(d.declaredAmount, 10)
          : NaN;
    if (!Number.isFinite(declaredAmount) || declaredAmount < 0) {
      throw new Error("مبلغ واریز باید عددی غیرمنفی باشد.");
    }
    if (declaredAmount > 1_000_000_000) {
      throw new Error("مبلغ واریز بیش از حد مجاز است.");
    }

    if (typeof d.receiptImageBase64 !== "string" || !d.receiptImageBase64) {
      throw new Error("تصویر فیش واریزی الزامی است.");
    }
    if (d.receiptImageBase64.length > MAX_BASE64_SIZE) {
      throw new Error("حجم تصویر فیش نباید بیشتر از ۵ مگابایت باشد.");
    }

    if (
      typeof d.receiptImageMimeType !== "string" ||
      !ALLOWED_MIME_TYPES.has(d.receiptImageMimeType)
    ) {
      throw new Error("فرمت تصویر باید JPEG، PNG یا WebP باشد.");
    }

    return {
      courseId: d.courseId,
      declaredAmount,
      receiptImageBase64: d.receiptImageBase64,
      receiptImageMimeType: d.receiptImageMimeType,
      receiptImageFilename:
        typeof d.receiptImageFilename === "string"
          ? d.receiptImageFilename
          : "receipt",
    };
  })
  .handler(async ({ data }): Promise<EnrollmentPublic> => {
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

    // 1. Verify the course exists and is published.
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, data.courseId))
      .limit(1);
    if (!course) {
      throw new Error("دوره مورد نظر یافت نشد.");
    }
    if (course.status !== "published") {
      throw new Error("ثبت‌نام برای این دوره امکان‌پذیر نیست.");
    }

    // 2. Check for existing pending enrollment (one per course).
    const [existing] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, user.id),
          eq(enrollments.courseId, data.courseId),
          eq(enrollments.status, "pending_payment_review"),
        ),
      )
      .limit(1);
    if (existing) {
      throw new Error(
        "شما یک ثبت‌نام در حال بررسی برای این دوره دارید. تا مشخص‌شدن وضعیت آن نمی‌توانید ثبت‌نام جدیدی انجام دهید.",
      );
    }

    // 3. Save the receipt image to disk.
    // File path: {UPLOAD_DIR}/receipts/{uuid}.{ext}
    const ext =
      data.receiptImageMimeType === "image/jpeg"
        ? "jpg"
        : data.receiptImageMimeType === "image/png"
          ? "png"
          : "webp";
    const filename = `${randomUUID()}.${ext}`;
    const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
    const filePath = join(uploadDir, "receipts", filename);

    try {
      await mkdir(dirname(filePath), { recursive: true });
      const buffer = Buffer.from(data.receiptImageBase64, "base64");
      await writeFile(filePath, buffer);
    } catch (err) {
      console.error("[iec:enrollment] Failed to save receipt image:", err);
      throw new Error(
        "ذخیره‌سازی تصویر فیش با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
      );
    }

    // 4. Insert the enrollment row.
    const [row] = await db
      .insert(enrollments)
      .values({
        studentId: user.id,
        courseId: data.courseId,
        declaredAmount: data.declaredAmount,
        receiptImagePath: filename,
        status: "pending_payment_review",
      })
      .returning();

    if (!row) {
      throw new Error("ثبت ثبت‌نام با خطا مواجه شد.");
    }

    return toEnrollmentPublic(row, {
      title: course.title,
      slug: course.slug,
    });
  });

/* ------------------------------------------------------------------ */
/* 3. getMyEnrollments                                                 */
/* ------------------------------------------------------------------ */

export const getMyEnrollments = createServerFn({ method: "GET" }).handler(
  async (): Promise<EnrollmentPublic[]> => {
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

    const rows = await db
      .select({
        enrollment: enrollments,
        courseTitle: courses.title,
        courseSlug: courses.slug,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.studentId, user.id))
      .orderBy(desc(enrollments.createdAt));

    return rows.map((r) =>
      toEnrollmentPublic(r.enrollment, {
        title: r.courseTitle,
        slug: r.courseSlug,
      }),
    );
  },
);

/* ------------------------------------------------------------------ */
/* 4. listEnrollmentsForReview (support/admin)                         */
/* ------------------------------------------------------------------ */

export const listEnrollmentsForReview = createServerFn({ method: "GET" })
  .validator((data: unknown): { status?: EnrollmentStatus } => {
    if (data === null || data === undefined) return {};
    if (typeof data !== "object") return {};
    const d = data as Record<string, unknown>;
    if (
      d.status === "pending_payment_review" ||
      d.status === "confirmed" ||
      d.status === "rejected"
    ) {
      return { status: d.status };
    }
    return {};
  })
  .handler(async ({ data }): Promise<EnrollmentWithDetails[]> => {
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
      ? eq(enrollments.status, data.status)
      : undefined;

    const rows = await db
      .select({
        enrollment: enrollments,
        courseTitle: courses.title,
        courseSlug: courses.slug,
        coursePrice: courses.price,
        courseInstructorId: courses.instructorId,
        courseSource: courses.source,
        studentName: users.fullName,
        studentPhone: users.phone,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(whereClause ?? eq(enrollments.id, enrollments.id))
      .orderBy(desc(enrollments.createdAt));

    return rows.map((r) => ({
      ...toEnrollmentPublic(r.enrollment, {
        title: r.courseTitle,
        slug: r.courseSlug,
      }),
      studentName: r.studentName,
      studentPhone: r.studentPhone,
      coursePrice: r.coursePrice,
      courseInstructorId: r.courseInstructorId,
      courseSource: r.courseSource,
    }));
  });

/* ------------------------------------------------------------------ */
/* 5. reviewEnrollment (confirm / reject)                              */
/* ------------------------------------------------------------------ */

export interface ReviewEnrollmentInput {
  enrollmentId: string;
  action: "confirm" | "reject";
  reviewNote?: string;
}

export const reviewEnrollment = createServerFn({ method: "POST" })
  .validator((data: unknown): ReviewEnrollmentInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.enrollmentId !== "string" || !d.enrollmentId) {
      throw new Error("شناسه‌ی ثبت‌نام الزامی است.");
    }
    if (d.action !== "confirm" && d.action !== "reject") {
      throw new Error("عملیات باید «confirm» یا «reject» باشد.");
    }
    const note = typeof d.reviewNote === "string" ? d.reviewNote.trim() : "";

    if (d.action === "reject" && note.length < 5) {
      throw new Error("دلیل رد باید حداقل ۵ کاراکتر باشد.");
    }

    return {
      enrollmentId: d.enrollmentId,
      action: d.action,
      reviewNote: note.length > 0 ? note : undefined,
    };
  })
  .handler(async ({ data }): Promise<{ ok: true; warning?: string }> => {
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

    // Load the enrollment (with course info for instructor lookup).
    const [existing] = await db
      .select({
        enrollment: enrollments,
        courseInstructorId: courses.instructorId,
        courseSource: courses.source,
        courseTitle: courses.title,
      })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(eq(enrollments.id, data.enrollmentId))
      .limit(1);

    if (!existing) {
      throw new Error("ثبت‌نام مورد نظر یافت نشد.");
    }
    if (existing.enrollment.status !== "pending_payment_review") {
      throw new Error("این ثبت‌نام قبلاً بررسی شده است.");
    }

    // ── REJECT path (no wallet changes) ──────────────────────────────
    if (data.action === "reject") {
      await db
        .update(enrollments)
        .set({
          status: "rejected",
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote ?? null,
        })
        .where(eq(enrollments.id, data.enrollmentId));

      await recordAuditLog({
        actorId: reviewer.id,
        action: "enrollment.rejected",
        targetType: "enrollment",
        targetId: data.enrollmentId,
        metadata: {
          reason: data.reviewNote ?? null,
        },
      });

      return { ok: true };
    }

    // ── CONFIRM path (atomic transaction) ────────────────────────────
    //
    // CRITICAL: for legacy courses with `instructorId: null`, we CANNOT
    // credit a wallet — there's no instructor to credit. We still mark
    // the enrollment as confirmed (so the student is enrolled), but we
    // return a WARNING telling the support agent that settlement must
    // happen outside the system.
    //
    // For platform courses with a real instructor:
    //   1. enrollment.status = confirmed
    //   2. commission = round(declared_amount * rate / 100)
    //   3. net = declared_amount - commission
    //   4. wallet row created (if not exists) OR balance += net
    //   5. wallet_transactions row inserted with snapshot rate
    // All in ONE Drizzle transaction.
    const commissionRatePercent = parseInt(
      process.env.COMMISSION_RATE_PERCENT ?? "10",
      10,
    );
    const declaredAmount = existing.enrollment.declaredAmount;
    const commission = Math.round(
      (declaredAmount * commissionRatePercent) / 100,
    );
    const net = declaredAmount - commission;

    const instructorId = existing.courseInstructorId;

    if (!instructorId) {
      // Legacy course with no instructor — confirm but warn.
      await db
        .update(enrollments)
        .set({
          status: "confirmed",
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote ?? null,
        })
        .where(eq(enrollments.id, data.enrollmentId));

      return {
        ok: true,
        warning:
          "این دوره مدرس ثبت‌شده در سیستم ندارد (دوره‌ی legacy). ثبت‌نام تایید شد، اما تسویه با مدرس باید دستی و خارج از سیستم انجام شود.",
      };
    }

    // Platform course — atomic wallet credit in a transaction.
    await db.transaction(async (tx) => {
      // 1. Update enrollment status.
      await tx
        .update(enrollments)
        .set({
          status: "confirmed",
          reviewedBy: reviewer.id,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote ?? null,
        })
        .where(eq(enrollments.id, data.enrollmentId));

      // 2. Find or create the instructor's wallet.
      const [existingWallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.userId, instructorId))
        .limit(1);

      let walletId: string;
      if (existingWallet) {
        walletId = existingWallet.id;
        // Update balance.
        await tx
          .update(wallets)
          .set({ balance: existingWallet.balance + net })
          .where(eq(wallets.id, existingWallet.id));
      } else {
        // Create wallet with the net amount as initial balance.
        const [newWallet] = await tx
          .insert(wallets)
          .values({
            userId: instructorId,
            balance: net,
          })
          .returning();
        if (!newWallet) {
          throw new Error("ساخت کیف‌پول مدرس با خطا مواجه شد.");
        }
        walletId = newWallet.id;
      }

      // 3. Insert the wallet transaction (with snapshot commission rate).
      await tx.insert(walletTransactions).values({
        walletId,
        type: "credit",
        amount: net,
        commissionRateApplied: commissionRatePercent,
        relatedEnrollmentId: data.enrollmentId,
        description: `تسویه ثبت‌نام دوره «${existing.courseTitle}» — مبلغ واریزی: ${declaredAmount.toLocaleString("fa-IR")} تومان، کمیسیون: ${commission.toLocaleString("fa-IR")} تومان (${commissionRatePercent}٪)`,
      });
    });

    // Record audit log.
    await recordAuditLog({
      actorId: reviewer.id,
      action: "enrollment.confirmed",
      targetType: "enrollment",
      targetId: data.enrollmentId,
      metadata: {
        courseTitle: existing.courseTitle,
        declaredAmount,
        commission,
        net,
        commissionRatePercent,
        instructorId: instructorId ?? null,
        legacy: !instructorId,
      },
    });

    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* 6. getMyWallet (instructor)                                         */
/* ------------------------------------------------------------------ */

export const getMyWallet = createServerFn({ method: "GET" }).handler(
  async (): Promise<WalletWithTransactions> => {
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

    // Find the user's wallet.
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, user.id))
      .limit(1);

    let walletPublic: WalletPublic | null = null;
    if (wallet) {
      walletPublic = {
        id: wallet.id,
        userId: wallet.userId,
        balance: wallet.balance,
        createdAt: wallet.createdAt.toISOString(),
      };
    }

    // Load transactions (empty if no wallet yet).
    let transactions: WalletTransactionPublic[] = [];
    if (wallet) {
      const txRows = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.walletId, wallet.id))
        .orderBy(desc(walletTransactions.createdAt));
      transactions = txRows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        commissionRateApplied: r.commissionRateApplied,
        description: r.description,
        createdAt: r.createdAt.toISOString(),
      }));
    }

    return { wallet: walletPublic, transactions };
  },
);

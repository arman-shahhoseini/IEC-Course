/**
 * Server function: manual enrollment by support/admin (Stage 6).
 *
 * Allows support staff to enroll a user (by phone — find-or-create) in
 * a course with `status: confirmed` directly, without going through the
 * student's online payment flow. Used for in-person / phone payments.
 *
 * The operation is atomic (single Drizzle transaction):
 *   1. Find-or-create user by phone (reuses normalizeIranianPhone).
 *   2. Insert enrollment with status=confirmed + metadata marking it
 *      as manual.
 *   3. Credit instructor's wallet (same logic as reviewEnrollment).
 *   4. Record audit log.
 *
 * If the course is a legacy course without an instructor, the enrollment
 * is still created but no wallet is credited — a warning is returned.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  enrollments,
  wallets,
  walletTransactions,
  courses,
  users,
} from "../db/schema";
import { requireRole, AuthorizationError } from "./rbac";
import { recordAuditLog } from "../audit/log";
import { normalizeIranianPhone } from "@/lib/phone";

export interface ManualEnrollmentInput {
  phone: string;
  courseId: string;
  amount: number;
  note?: string;
}

export const createManualEnrollment = createServerFn({ method: "POST" })
  .validator((data: unknown): ManualEnrollmentInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;

    const phone =
      typeof d.phone === "string" ? normalizeIranianPhone(d.phone) : null;
    if (!phone) {
      throw new Error("شماره موبایل نامعتبر است.");
    }

    if (typeof d.courseId !== "string" || !d.courseId) {
      throw new Error("شناسه‌ی دوره الزامی است.");
    }

    const amount =
      typeof d.amount === "number"
        ? d.amount
        : typeof d.amount === "string" && /^\d+$/.test(d.amount)
          ? parseInt(d.amount, 10)
          : NaN;
    if (!Number.isFinite(amount) || amount < 0) {
      throw new Error("مبلغ باید عددی غیرمنفی باشد.");
    }

    const note =
      typeof d.note === "string" && d.note.trim().length > 0
        ? d.note.trim()
        : undefined;

    return { phone, courseId: d.courseId, amount, note };
  })
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; warning?: string; enrollmentId: string }> => {
      const supporter = await requireRole(["support", "admin"]);
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
        throw new Error("دوره یافت نشد.");
      }
      if (course.status !== "published") {
        throw new Error("ثبت‌نام برای این دوره امکان‌پذیر نیست.");
      }

      // 2. Find-or-create user by phone (same logic as OTP verify).
      let studentId: string;
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.phone, data.phone))
        .limit(1);

      if (existingUser) {
        studentId = existingUser.id;
      } else {
        const [newUser] = await db
          .insert(users)
          .values({ phone: data.phone })
          .returning({ id: users.id });
        if (!newUser) {
          throw new Error("ساخت کاربر با خطا مواجه شد.");
        }
        studentId = newUser.id;
      }

      // 3. Commission calculation.
      const commissionRatePercent = parseInt(
        process.env.COMMISSION_RATE_PERCENT ?? "10",
        10,
      );
      const commission = Math.round(
        (data.amount * commissionRatePercent) / 100,
      );
      const net = data.amount - commission;
      const instructorId = course.instructorId;

      let enrollmentId: string;

      // 4. Atomic transaction: enrollment + wallet credit.
      await db.transaction(async (tx) => {
        // Insert enrollment as confirmed (skipping pending_payment_review).
        const [enrollment] = await tx
          .insert(enrollments)
          .values({
            studentId,
            courseId: data.courseId,
            declaredAmount: data.amount,
            receiptImagePath: "manual-enrollment",
            status: "confirmed",
            reviewedBy: supporter.id,
            reviewedAt: new Date(),
            reviewNote: data.note ?? null,
          })
          .returning();

        if (!enrollment) {
          throw new Error("ثبت ثبت‌نام با خطا مواجه شد.");
        }
        enrollmentId = enrollment.id;

        // Credit wallet if course has a real instructor.
        if (instructorId) {
          const [existingWallet] = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, instructorId))
            .limit(1);

          let walletId: string;
          if (existingWallet) {
            walletId = existingWallet.id;
            await tx
              .update(wallets)
              .set({ balance: existingWallet.balance + net })
              .where(eq(wallets.id, existingWallet.id));
          } else {
            const [newWallet] = await tx
              .insert(wallets)
              .values({
                userId: instructorId,
                balance: net,
              })
              .returning();
            if (!newWallet) {
              throw new Error("ساخت کیف‌پول با خطا مواجه شد.");
            }
            walletId = newWallet.id;
          }

          await tx.insert(walletTransactions).values({
            walletId,
            type: "credit",
            amount: net,
            commissionRateApplied: commissionRatePercent,
            relatedEnrollmentId: enrollment.id,
            description: `ثبت‌نام دستی دوره «${course.title}» — مبلغ: ${data.amount.toLocaleString("fa-IR")} تومان، کمیسیون: ${commission.toLocaleString("fa-IR")} تومان (${commissionRatePercent}٪)`,
          });
        }
      });

      // 5. Audit log.
      await recordAuditLog({
        actorId: supporter.id,
        action: "enrollment.manual_created",
        targetType: "enrollment",
        targetId: enrollmentId!,
        metadata: {
          studentUserId: studentId,
          studentPhone: data.phone,
          courseId: data.courseId,
          courseTitle: course.title,
          amount: data.amount,
          commission,
          net,
          commissionRatePercent,
          instructorId: instructorId ?? null,
          legacy: !instructorId,
          note: data.note ?? null,
        },
      });

      // 6. Warning for legacy courses.
      const warning = !instructorId
        ? "این دوره مدرس ثبت‌شده در سیستم ندارد (دوره‌ی legacy). ثبت‌نام دستی انجام شد، اما تسویه با مدرس باید دستی و خارج از سیستم انجام شود."
        : undefined;

      return { ok: true, warning, enrollmentId: enrollmentId! };
    },
  );

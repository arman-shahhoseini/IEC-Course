/**
 * Shared Zod validation schemas.
 *
 * These schemas centralize validation logic that was previously
 * duplicated across server function validators. They do NOT replace
 * the existing validators — they're available for future use and
 * as a reference for what constitutes valid input.
 *
 * Usage:
 *   import { phoneSchema, courseCreateSchema } from "@/shared/validation/schemas";
 *
 *   const parsed = courseCreateSchema.parse(input);
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Phone                                                               */
/* ------------------------------------------------------------------ */

/**
 * Iranian mobile phone number — accepts various formats, normalizes
 * to 09XXXXXXXXX. Uses a regex that matches the normalizeIranianPhone
 * logic in src/lib/phone.ts.
 */
export const phoneSchema = z
  .string()
  .min(1, "شماره موبایل الزامی است.")
  .transform((v) => v.replace(/[\s\-()]/g, ""))
  .refine((v) => {
    let n = v;
    if (n.startsWith("+98")) n = "0" + n.slice(3);
    else if (n.startsWith("0098")) n = "0" + n.slice(4);
    else if (n.startsWith("98") && n.length === 12) n = "0" + n.slice(2);
    return /^09\d{9}$/.test(n);
  }, "شماره موبایل نامعتبر است. مثال: 09123456789")
  .transform((v) => {
    let n = v;
    if (n.startsWith("+98")) n = "0" + n.slice(3);
    else if (n.startsWith("0098")) n = "0" + n.slice(4);
    else if (n.startsWith("98") && n.length === 12) n = "0" + n.slice(2);
    return n;
  });

/* ------------------------------------------------------------------ */
/* OTP                                                                 */
/* ------------------------------------------------------------------ */

export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "کد یک‌بار مصرف باید ۶ رقم باشد.");

/* ------------------------------------------------------------------ */
/* Course                                                              */
/* ------------------------------------------------------------------ */

export const courseLevelSchema = z.enum([
  "beginner",
  "intermediate",
  "advanced",
]);

export const courseCreateSchema = z.object({
  title: z.string().min(3, "عنوان دوره باید حداقل ۳ کاراکتر باشد.").max(200),
  category: z
    .string()
    .min(2, "حوزه/دسته‌بندی باید حداقل ۲ کاراکتر باشد.")
    .max(200),
  level: courseLevelSchema,
  durationSessions: z.number().int().min(1).max(200),
  description: z
    .string()
    .min(20, "توضیحات باید حداقل ۲۰ کاراکتر باشد.")
    .max(5000),
  syllabus: z
    .string()
    .min(20, "سرفصل‌ها باید حداقل ۲۰ کاراکتر باشد.")
    .max(10000),
  prerequisites: z.string().max(2000).nullable().optional(),
  capacity: z.number().int().min(1).max(10000).nullable().optional(),
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  posterUrl: z.string().url().max(1000).nullable().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

/* ------------------------------------------------------------------ */
/* Instructor Application                                              */
/* ------------------------------------------------------------------ */

export const instructorApplicationSchema = z.object({
  specialization: z
    .string()
    .min(3, "حوزه‌ی تخصص باید حداقل ۳ کاراکتر باشد.")
    .max(200),
  bio: z.string().min(50, "معرفی باید حداقل ۵۰ کاراکتر باشد.").max(5000),
  experienceYears: z.number().int().min(0).max(80).nullable().optional(),
  sampleWorkUrl: z.string().url().max(1000).nullable().optional(),
});

/* ------------------------------------------------------------------ */
/* Enrollment                                                          */
/* ------------------------------------------------------------------ */

export const enrollmentCreateSchema = z.object({
  courseId: z.string().uuid("شناسه‌ی دوره نامعتبر است."),
  declaredAmount: z
    .number()
    .int()
    .min(0, "مبلغ باید غیرمنفی باشد.")
    .max(1_000_000_000),
  receiptImageBase64: z.string().min(1, "تصویر فیش الزامی است."),
  receiptImageMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  receiptImageFilename: z.string().optional().default("receipt"),
});

export const manualEnrollmentSchema = z.object({
  phone: phoneSchema,
  courseId: z.string().uuid("شناسه‌ی دوره نامعتبر است."),
  amount: z.number().int().min(0, "مبلغ باید غیرمنفی باشد.").max(1_000_000_000),
  note: z.string().max(2000).trim().optional(),
});

/* ------------------------------------------------------------------ */
/* Ticket                                                              */
/* ------------------------------------------------------------------ */

export const ticketCreateSchema = z.object({
  subject: z.string().min(3, "موضوع باید حداقل ۳ کاراکتر باشد.").max(200),
  message: z.string().min(5, "پیام باید حداقل ۵ کاراکتر باشد.").max(5000),
});

export const ticketReplySchema = z.object({
  ticketId: z.string().uuid("شناسه‌ی تیکت نامعتبر است."),
  body: z.string().min(1, "پیام نمی‌تواند خالی باشد.").max(5000),
});

/* ------------------------------------------------------------------ */
/* Review actions                                                      */
/* ------------------------------------------------------------------ */

export const reviewActionSchema = z.object({
  applicationId: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  reviewNote: z
    .string()
    .min(5, "دلیل رد باید حداقل ۵ کاراکتر باشد.")
    .optional(),
});

export const courseReviewSchema = z.object({
  courseId: z.string().uuid(),
  action: z.enum(["publish", "reject"]),
  reviewNote: z
    .string()
    .min(5, "دلیل رد باید حداقل ۵ کاراکتر باشد.")
    .optional(),
});

export const enrollmentReviewSchema = z.object({
  enrollmentId: z.string().uuid(),
  action: z.enum(["confirm", "reject"]),
  reviewNote: z
    .string()
    .min(5, "دلیل رد باید حداقل ۵ کاراکتر باشد.")
    .optional(),
});

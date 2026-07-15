/**
 * Server functions for the course creation + review workflow.
 *
 * Four operations:
 *   1. `getMyCourses` — GET: returns the caller's own courses (for the
 *      instructor's "my-courses" page).
 *   2. `createCourse` — POST: validates input, generates a unique slug,
 *      inserts a new course with `status: pending_review`.
 *   3. `listCoursesForReview` — GET (support/admin only): returns all
 *      courses, optionally filtered by status. Used by the review queue.
 *   4. `reviewCourse` — POST (support/admin only): publishes or rejects
 *      a course.
 *
 * File naming: `.functions.ts` (not `.server.ts`) so TanStack's
 * import-protection allows client code to import these as RPC stubs.
 */
import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  courses,
  users,
  type CourseLevel,
  type CourseStatus,
  type CourseRow,
} from "../db/schema";
import { requireRole, requireAuthenticated, AuthorizationError } from "./rbac";
import { recordAuditLog } from "../audit/log";

// Re-export the enum types so route components can import them from the
// server-function module (single import site for everything course-related).
export type { CourseLevel, CourseStatus };

/* ------------------------------------------------------------------ */
/* Types (shared with client — returned by the server functions)       */
/* ------------------------------------------------------------------ */

/** Public shape of a course — safe to send to client. */
export interface CoursePublic {
  id: string;
  instructorId: string | null;
  title: string;
  slug: string;
  category: string;
  level: CourseLevel | null;
  description: string | null;
  syllabus: string | null;
  durationSessions: number | null;
  capacity: number | null;
  price: number | null;
  prerequisites: string | null;
  posterUrl: string | null;
  startDate: string | null; // ISO date (yyyy-mm-dd) or null
  status: CourseStatus;
  reviewNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null; // ISO timestamp or null
  createdAt: string;
  updatedAt: string;
}

/** Extended shape for the review queue — includes instructor info. */
export interface CourseWithInstructor extends CoursePublic {
  instructorName: string | null;
  instructorPhone: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function toPublic(row: CourseRow): CoursePublic {
  return {
    id: row.id,
    instructorId: row.instructorId,
    title: row.title,
    slug: row.slug,
    category: row.category,
    level: row.level,
    description: row.description,
    syllabus: row.syllabus,
    durationSessions: row.durationSessions,
    capacity: row.capacity,
    price: row.price,
    prerequisites: row.prerequisites,
    posterUrl: row.posterUrl,
    startDate: row.startDate ?? null,
    status: row.status,
    reviewNote: row.reviewNote,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Generate a URL-safe slug from a Persian/English title.
 *
 * Strategy:
 *   1. Normalize: trim, lowercase, replace whitespace with `-`.
 *   2. Keep only: a-z, 0-9, `-`, Persian/Arabic letters, digits.
 *   3. Collapse multiple `-` into one.
 *   4. Strip leading/trailing `-`.
 *
 * Persian letters are kept (not transliterated) so the slug is readable
 * for Persian speakers. If the result is empty (e.g. title was all
 * punctuation), fall back to `course`.
 */
function generateSlug(title: string): string {
  const trimmed = title.trim().toLowerCase();
  // Keep Persian/Arabic ranges + ASCII alphanumerics + dash.
  // \u0600-\u06FF covers Arabic/Persian; \uFB50-\uFEFF covers Arabic
  // presentation forms. We also keep spaces temporarily to replace.
  const kept = trimmed.replace(/[^\u0600-\u06FF\uFB50-\uFEFFa-z0-9\s-]/g, "");
  const withDashes = kept.replace(/\s+/g, "-").replace(/-+/g, "-");
  const slug = withDashes.replace(/^-+|-+$/g, "");
  return slug || "course";
}

/**
 * Generate a unique slug by appending `-2`, `-3`, ... if the base slug
 * already exists in the DB. Runs inside the caller's query context.
 */
async function ensureUniqueSlug(
  db: ReturnType<typeof assertDb>,
  baseSlug: string,
): Promise<string> {
  // Fast path: try the base slug first.
  const [existing] = await db
    .select({ id: courses.id })
    .from(courses)
    .where(eq(courses.slug, baseSlug))
    .limit(1);

  if (!existing) return baseSlug;

  // Slow path: append `-2`, `-3`, ... until we find a free one.
  // Cap at 100 to avoid infinite loop (would mean 100 courses with the
  // same title — extremely unlikely, but defensive).
  for (let i = 2; i <= 100; i++) {
    const candidate = `${baseSlug}-${i}`;
    const [collision] = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, candidate))
      .limit(1);
    if (!collision) return candidate;
  }

  // Fallback: append a short random suffix.
  return `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Input shape for `createCourse`. */
export interface CreateCourseInput {
  title: string;
  category: string;
  level: CourseLevel;
  durationSessions: number;
  description: string;
  syllabus: string;
  prerequisites: string | null;
  capacity: number | null;
  price: number | null;
  posterUrl: string | null;
  startDate: string | null; // yyyy-mm-dd
}

/** Validation result — `null` means valid, otherwise a Persian error. */
function validateCreateInput(input: CreateCourseInput): string | null {
  if (!input.title || input.title.trim().length < 3) {
    return "عنوان دوره باید حداقل ۳ کاراکتر باشد.";
  }
  if (input.title.length > 200) {
    return "عنوان دوره نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }
  if (!input.category || input.category.trim().length < 2) {
    return "حوزه/دسته‌بندی باید حداقل ۲ کاراکتر باشد.";
  }
  if (input.category.length > 200) {
    return "حوزه/دسته‌بندی نباید بیشتر از ۲۰۰ کاراکتر باشد.";
  }
  if (!["beginner", "intermediate", "advanced"].includes(input.level)) {
    return "سطح دوره نامعتبر است.";
  }
  if (
    !Number.isFinite(input.durationSessions) ||
    input.durationSessions < 1 ||
    input.durationSessions > 200
  ) {
    return "تعداد جلسات باید عددی بین ۱ تا ۲۰۰ باشد.";
  }
  if (!input.description || input.description.trim().length < 20) {
    return "توضیحات دوره باید حداقل ۲۰ کاراکتر باشد.";
  }
  if (input.description.length > 5000) {
    return "توضیحات دوره نباید بیشتر از ۵۰۰۰ کاراکتر باشد.";
  }
  if (!input.syllabus || input.syllabus.trim().length < 20) {
    return "سرفصل‌ها باید حداقل ۲۰ کاراکتر باشد.";
  }
  if (input.syllabus.length > 10000) {
    return "سرفصل‌ها نباید بیشتر از ۱۰۰۰۰ کاراکتر باشد.";
  }
  if (input.prerequisites && input.prerequisites.length > 2000) {
    return "پیش‌نیازها نباید بیشتر از ۲۰۰۰ کاراکتر باشد.";
  }
  if (input.capacity !== null && input.capacity !== undefined) {
    if (
      !Number.isFinite(input.capacity) ||
      input.capacity < 1 ||
      input.capacity > 10000
    ) {
      return "ظرفیت باید عددی بین ۱ تا ۱۰۰۰۰ باشد.";
    }
  }
  if (input.price !== null && input.price !== undefined) {
    if (
      !Number.isFinite(input.price) ||
      input.price < 0 ||
      input.price > 1_000_000_000
    ) {
      return "قیمت باید عددی بین ۰ تا ۱٬۰۰۰٬۰۰۰٬۰۰۰ تومان باشد.";
    }
  }
  if (input.posterUrl && input.posterUrl.trim().length > 0) {
    const trimmed = input.posterUrl.trim();
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "لینک پوستر باید با http:// یا https:// شروع شود.";
      }
    } catch {
      return "لینک پوستر معتبر نیست.";
    }
    if (trimmed.length > 1000) {
      return "لینک پوستر بیش از حد طولانی است.";
    }
  }
  if (input.startDate && input.startDate.trim().length > 0) {
    // Expect yyyy-mm-dd. Validate via Date parsing + regex.
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(input.startDate)) {
      return "تاریخ شروع باید با فرمت yyyy-mm-dd باشد.";
    }
    const d = new Date(input.startDate);
    if (Number.isNaN(d.getTime())) {
      return "تاریخ شروع معتبر نیست.";
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1. Get my courses                                                    */
/* ------------------------------------------------------------------ */

export const getMyCourses = createServerFn({ method: "GET" }).handler(
  async (): Promise<CoursePublic[]> => {
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
      .select()
      .from(courses)
      .where(eq(courses.instructorId, user.id))
      .orderBy(desc(courses.createdAt));

    return rows.map(toPublic);
  },
);

/* ------------------------------------------------------------------ */
/* 2. Create a course                                                  */
/* ------------------------------------------------------------------ */

export const createCourse = createServerFn({ method: "POST" })
  .validator((data: unknown): CreateCourseInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    const input: CreateCourseInput = {
      title: typeof d.title === "string" ? d.title : "",
      category: typeof d.category === "string" ? d.category : "",
      level:
        d.level === "beginner" ||
        d.level === "intermediate" ||
        d.level === "advanced"
          ? d.level
          : "beginner",
      durationSessions:
        typeof d.durationSessions === "number"
          ? d.durationSessions
          : typeof d.durationSessions === "string" &&
              /^\d+$/.test(d.durationSessions)
            ? parseInt(d.durationSessions, 10)
            : 0,
      description: typeof d.description === "string" ? d.description : "",
      syllabus: typeof d.syllabus === "string" ? d.syllabus : "",
      prerequisites:
        typeof d.prerequisites === "string" && d.prerequisites.trim().length > 0
          ? d.prerequisites.trim()
          : null,
      capacity:
        d.capacity === null || d.capacity === undefined
          ? null
          : typeof d.capacity === "number"
            ? d.capacity
            : typeof d.capacity === "string" && /^\d+$/.test(d.capacity)
              ? parseInt(d.capacity, 10)
              : null,
      price:
        d.price === null || d.price === undefined
          ? null
          : typeof d.price === "number"
            ? d.price
            : typeof d.price === "string" && /^\d+$/.test(d.price)
              ? parseInt(d.price, 10)
              : null,
      posterUrl:
        typeof d.posterUrl === "string" && d.posterUrl.trim().length > 0
          ? d.posterUrl.trim()
          : null,
      startDate:
        typeof d.startDate === "string" && d.startDate.trim().length > 0
          ? d.startDate.trim()
          : null,
    };
    const error = validateCreateInput(input);
    if (error) {
      throw new Error(error);
    }
    return input;
  })
  .handler(async ({ data }): Promise<CoursePublic> => {
    // Only instructors and admins can create courses. A student who
    // somehow reaches this endpoint gets a clear error.
    const user = await requireRole(["instructor", "admin"]);
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        throw new AuthorizationError(err.message, "UNAUTHENTICATED");
      }
      throw err;
    }

    // Generate a unique slug from the title.
    const baseSlug = generateSlug(data.title);
    const slug = await ensureUniqueSlug(db, baseSlug);

    const [row] = await db
      .insert(courses)
      .values({
        instructorId: user.id,
        title: data.title.trim(),
        slug,
        category: data.category.trim(),
        level: data.level,
        description: data.description.trim(),
        syllabus: data.syllabus.trim(),
        durationSessions: data.durationSessions,
        capacity: data.capacity,
        price: data.price,
        prerequisites: data.prerequisites,
        posterUrl: data.posterUrl,
        startDate: data.startDate,
        // New courses start as pending_review — the instructor is
        // submitting for review, not saving a draft. (A "save as draft"
        // flow can be added later by accepting a `submit: boolean` flag.)
        status: "pending_review",
      })
      .returning();

    if (!row) {
      throw new Error("ساخت دوره با خطا مواجه شد. لطفاً دوباره تلاش کنید.");
    }

    return toPublic(row);
  });

/* ------------------------------------------------------------------ */
/* 3. List courses for review (support/admin only)                     */
/* ------------------------------------------------------------------ */

export const listCoursesForReview = createServerFn({ method: "GET" })
  .validator((data: unknown): { status?: CourseStatus } => {
    if (data === null || data === undefined) return {};
    if (typeof data !== "object") return {};
    const d = data as Record<string, unknown>;
    if (
      d.status === "draft" ||
      d.status === "pending_review" ||
      d.status === "published" ||
      d.status === "rejected"
    ) {
      return { status: d.status };
    }
    return {};
  })
  .handler(async ({ data }): Promise<CourseWithInstructor[]> => {
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
      ? eq(courses.status, data.status)
      : undefined;

    // Join with users to get instructor name + phone for the table.
    // Sort by created_at desc so newest courses appear first.
    const rows = await db
      .select({
        course: courses,
        instructorName: users.fullName,
        instructorPhone: users.phone,
      })
      .from(courses)
      .innerJoin(users, eq(courses.instructorId, users.id))
      .where(whereClause ?? sql`true`)
      .orderBy(desc(courses.createdAt));

    return rows.map((r) => ({
      ...toPublic(r.course),
      instructorName: r.instructorName,
      instructorPhone: r.instructorPhone,
    }));
  });

/* ------------------------------------------------------------------ */
/* 4. Review a course (publish / reject)                               */
/* ------------------------------------------------------------------ */

export interface ReviewCourseInput {
  courseId: string;
  action: "publish" | "reject";
  /** Required when action = "reject". Optional note for publish. */
  reviewNote?: string;
}

export const reviewCourse = createServerFn({ method: "POST" })
  .validator((data: unknown): ReviewCourseInput => {
    if (typeof data !== "object" || data === null) {
      throw new Error("ورودی نامعتبر است.");
    }
    const d = data as Record<string, unknown>;
    if (typeof d.courseId !== "string" || !d.courseId) {
      throw new Error("شناسه‌ی دوره الزامی است.");
    }
    if (d.action !== "publish" && d.action !== "reject") {
      throw new Error("عملیات باید «publish» یا «reject» باشد.");
    }
    const note = typeof d.reviewNote === "string" ? d.reviewNote.trim() : "";

    if (d.action === "reject" && note.length < 5) {
      throw new Error("دلیل رد دوره باید حداقل ۵ کاراکتر باشد.");
    }

    return {
      courseId: d.courseId,
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

    // Load the course. Must be pending_review — can't review an already-
    // published or rejected one.
    const [existing] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, data.courseId))
      .limit(1);

    if (!existing) {
      throw new Error("دوره مورد نظر یافت نشد.");
    }
    if (existing.status !== "pending_review") {
      throw new Error(
        "این دوره قبلاً بررسی شده است و امکان تغییر وضعیت آن وجود ندارد.",
      );
    }

    const newStatus: CourseStatus =
      data.action === "publish" ? "published" : "rejected";
    const now = new Date();

    // Single-table update — no transaction needed (unlike the instructor
    // application approval which flips a role too). If we later add
    // side-effects (audit log, notification), wrap in a transaction.
    await db
      .update(courses)
      .set({
        status: newStatus,
        reviewedBy: reviewer.id,
        reviewedAt: now,
        reviewNote: data.reviewNote ?? null,
      })
      .where(eq(courses.id, data.courseId));

    // Record audit log.
    await recordAuditLog({
      actorId: reviewer.id,
      action:
        data.action === "publish" ? "course.published" : "course.rejected",
      targetType: "course",
      targetId: data.courseId,
      metadata: {
        title: existing.title,
        reviewNote: data.reviewNote ?? null,
      },
    });

    return { ok: true };
  });

// Suppress unused-import warnings for `and` / `isNotNull` — kept for
// future use in more complex queries (e.g. "courses reviewed by X").
void and;
void isNotNull;

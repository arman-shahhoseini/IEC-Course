/**
 * Server functions for the PUBLIC course catalog (Stage 5).
 *
 * These functions read published courses from the DB and return them
 * in the shape of the static `Course` type (from `src/types/index.ts`)
 * so `CourseCard` and the existing `/courses` page can render them
 * WITHOUT any visual change.
 *
 * Functions:
 *   1. `getPublicCourses` — returns all published courses, split into
 *      upcoming/current/archived based on `display_category` (or
 *      auto-computed if NULL).
 *   2. `getPublicCourseBySlug` — returns a single published course by
 *      slug (for the detail page). Returns null if not found or not
 *      published.
 *   3. `getPublishedCourseSlugs` — returns just slugs (for sitemap).
 *
 * Auth: these are PUBLIC — no auth required. Anyone (including
 * unauthenticated visitors) can view published courses.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { assertDb, DbUnavailableError } from "../db/client";
import {
  courses,
  users,
  type CourseRow,
  type DisplayCategory,
} from "../db/schema";
import type { Course, CourseStatus, CourseImage, Level } from "@/types";

/* ------------------------------------------------------------------ */
/* Helpers: DB → static `Course` mapping                               */
/* ------------------------------------------------------------------ */

/** Map DB level enum → static Persian `Level` string. */
function levelToPersian(level: CourseRow["level"]): Level | undefined {
  if (!level) return undefined;
  switch (level) {
    case "beginner":
      return "مقدماتی";
    case "intermediate":
      return "متوسط";
    case "advanced":
      return "پیشرفته";
  }
}

/**
 * Compute the display category for a course.
 *
 * If `displayCategory` is set (manually overridden by admin), use it.
 * Otherwise, compute from `startDate`:
 *   - No `startDate` → `archived` (default for legacy courses).
 *   - `startDate` in the past → `archived`.
 *   - `startDate` within the next 7 days → `current`.
 *   - `startDate` in the future → `upcoming`.
 *
 * This is a heuristic — admins can override per-course via
 * `displayCategory` when the reality doesn't match.
 */
function computeDisplayCategory(row: CourseRow): CourseStatus {
  if (row.displayCategory) {
    return row.displayCategory as CourseStatus;
  }
  if (!row.startDate) return "archived";

  const start = new Date(row.startDate);
  const now = new Date();
  const diffMs = start.getTime() - now.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  if (diffMs < -oneDay) return "archived"; // started >1 day ago
  if (diffMs < 7 * oneDay) return "current"; // starts within 7 days
  return "upcoming";
}

/**
 * Build the `cover` object for the static `Course` type.
 *
 * For legacy courses: both webp and jpg are set from the DB columns
 * (which were seeded from `/images/courses/{slug}.{ext}`).
 *
 * For platform courses: if the instructor provided a `posterUrl`, use
 * it for BOTH webp and jpg (the browser will try webp first; if the
 * URL is actually JPEG, the `<source>` tag falls through to `<img>`).
 * If neither cover columns nor posterUrl exist, fall back to a
 * placeholder.
 */
function buildCover(row: CourseRow): CourseImage {
  if (row.coverWebpUrl && row.coverJpgUrl) {
    return { webp: row.coverWebpUrl, jpg: row.coverJpgUrl };
  }
  if (row.posterUrl) {
    return { webp: row.posterUrl, jpg: row.posterUrl };
  }
  // Fallback — should not normally happen for published courses.
  return {
    webp: "/images/courses/python.webp",
    jpg: "/images/courses/python.jpg",
  };
}

/**
 * Map a DB `CourseRow` to the static `Course` type.
 *
 * This is the single source of truth for DB→UI mapping. The public
 * /courses page and the detail page both use this.
 */
export function courseRowToPublic(row: CourseRow): Course {
  const status = computeDisplayCategory(row);
  return {
    slug: row.slug,
    title: row.title,
    status,
    cover: buildCover(row),
    category: row.category,
    // `date` and `year` are not in the DB — they were derived from the
    // static catalog's structure. For legacy courses, we don't have
    // them. For platform courses, `startDate` covers this.
    date: undefined,
    year: undefined,
    summary: row.description?.slice(0, 120) ?? undefined,
    description: row.description ?? undefined,
    durationHours: undefined, // DB uses durationSessions, not hours
    level: levelToPersian(row.level),
    instructor: row.legacyInstructorName ?? undefined,
    outcomes: undefined,
    curriculum: undefined,
    faqs: undefined,
    startDate: row.startDate ?? undefined,
    registrationUrl: undefined, // enrollment is now internal
  };
}

/* ------------------------------------------------------------------ */
/* 1. getPublicCourses — for the /courses page                         */
/* ------------------------------------------------------------------ */

export interface PublicCoursesResult {
  upcoming: Course[];
  current: Course[];
  archived: Course[];
}

export const getPublicCourses = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCoursesResult> => {
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        // DB unavailable — return empty lists so the page renders with
        // the "no courses" message instead of crashing.
        return { upcoming: [], current: [], archived: [] };
      }
      throw err;
    }

    // Load all published courses. We split them in JS (not SQL) because
    // the split logic depends on `display_category` OR a computed value
    // from `start_date` — easier to express in JS.
    const rows = await db
      .select()
      .from(courses)
      .where(eq(courses.status, "published"))
      .orderBy(courses.createdAt);

    const upcoming: Course[] = [];
    const current: Course[] = [];
    const archived: Course[] = [];

    for (const row of rows) {
      const course = courseRowToPublic(row);
      if (course.status === "upcoming") upcoming.push(course);
      else if (course.status === "current") current.push(course);
      else archived.push(course);
    }

    return { upcoming, current, archived };
  },
);

/* ------------------------------------------------------------------ */
/* 2. getPublicCourseBySlug — for the detail page                      */
/* ------------------------------------------------------------------ */

/** Extended shape with extra fields the detail page needs. */
export interface PublicCourseDetail extends Course {
  id: string;
  syllabus: string | null;
  prerequisites: string | null;
  durationSessions: number | null;
  capacity: number | null;
  price: number | null;
  instructorName: string | null;
  instructorAvatarUrl: string | null;
  source: "legacy" | "platform";
}

export const getPublicCourseBySlug = createServerFn({ method: "GET" })
  .validator((data: unknown): string => {
    if (typeof data !== "object" || data === null || !("slug" in data)) {
      throw new Error("slug الزامی است.");
    }
    const slug = (data as { slug: unknown }).slug;
    if (typeof slug !== "string" || !slug) {
      throw new Error("slug باید یک رشته‌ی غیرخالی باشد.");
    }
    return slug;
  })
  .handler(async ({ data }): Promise<PublicCourseDetail | null> => {
    let db;
    try {
      db = assertDb();
    } catch (err) {
      if (err instanceof DbUnavailableError) {
        return null;
      }
      throw err;
    }

    const [row] = await db
      .select({
        course: courses,
        instructorName: users.fullName,
        instructorAvatarUrl: users.phone, // placeholder — users table has no avatar column yet
      })
      .from(courses)
      .leftJoin(users, eq(courses.instructorId, users.id))
      .where(eq(courses.slug, data))
      .limit(1);

    if (!row) return null;
    if (row.course.status !== "published") return null;

    const base = courseRowToPublic(row.course);
    return {
      ...base,
      id: row.course.id,
      syllabus: row.course.syllabus,
      prerequisites: row.course.prerequisites,
      durationSessions: row.course.durationSessions,
      capacity: row.course.capacity,
      price: row.course.price,
      // For platform courses, use the real instructor's name.
      // For legacy courses, use the legacy_instructor_name field.
      instructorName:
        row.instructorName ?? row.course.legacyInstructorName ?? null,
      instructorAvatarUrl: row.course.legacyInstructorAvatarUrl ?? null,
      source: row.course.source,
    };
  });

/* ------------------------------------------------------------------ */
/* 3. getPublishedCourseSlugs — for sitemap                            */
/* ------------------------------------------------------------------ */

export const getPublishedCourseSlugs = createServerFn({
  method: "GET",
}).handler(async (): Promise<string[]> => {
  let db;
  try {
    db = assertDb();
  } catch (err) {
    if (err instanceof DbUnavailableError) {
      return [];
    }
    throw err;
  }

  const rows = await db
    .select({ slug: courses.slug, updatedAt: courses.updatedAt })
    .from(courses)
    .where(eq(courses.status, "published"));

  return rows.map((r) => r.slug);
});

/**
 * Seed legacy (archived) courses from `src/data/courses.ts` into the DB.
 *
 * Usage:
 *   bun run db:seed-legacy-courses
 *
 * Behavior:
 *   - Reads all courses from the static catalog (archivedCourses).
 *   - For each, checks if a row with the same `slug` already exists.
 *     - If yes → skip (idempotent — running twice doesn't duplicate).
 *     - If no → insert with `source: legacy`, `status: published`,
 *       `instructorId: null`, `displayCategory: archived`,
 *       `coverWebpUrl`/`coverJpgUrl` from the static `cover` field.
 *   - Prints a summary at the end: N inserted, M skipped.
 *
 * This is a one-time migration script. After it runs successfully, the
 * public /courses page reads from the DB (not the static file), and the
 * static file becomes a backup/reference only.
 *
 * Re-runnability: safe to run multiple times. Each subsequent run will
 * skip all rows that already exist (by slug).
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/server/db/schema";
import { archivedCourses } from "../src/data/courses";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "خطا: DATABASE_URL در محیط تنظیم نشده است. این اسکریپت نیاز به اتصال واقعی به پایگاه‌داده دارد.",
    );
    process.exit(1);
  }

  // Use a short-lived client — this script exits after seeding.
  const queryClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    prepare: false,
  });
  const db = drizzle(queryClient, { schema });

  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  console.log(`در حال بررسی ${archivedCourses.length} دوره‌ی legacy...`);

  for (const course of archivedCourses) {
    try {
      // Check if a row with this slug already exists.
      const [existing] = await db
        .select({ id: schema.courses.id })
        .from(schema.courses)
        .where(eq(schema.courses.slug, course.slug))
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      // Insert the legacy course.
      await db.insert(schema.courses).values({
        instructorId: null,
        title: course.title,
        slug: course.slug,
        category: course.category ?? "عمومی",
        level: null,
        description: null,
        syllabus: null,
        durationSessions: null,
        capacity: null,
        price: null,
        prerequisites: null,
        posterUrl: null,
        coverWebpUrl: course.cover.webp,
        coverJpgUrl: course.cover.jpg,
        startDate: null,
        status: "published",
        source: "legacy",
        displayCategory: "archived",
        legacyInstructorName: course.instructor ?? null,
        legacyInstructorAvatarUrl: null,
        reviewNote: null,
        reviewedBy: null,
        reviewedAt: null,
      });

      inserted++;
      console.log(`  ✓ ثبت شد: ${course.slug} — ${course.title}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${course.slug}: ${msg}`);
      console.error(`  ✗ خطا برای ${course.slug}: ${msg}`);
    }
  }

  console.log("");
  console.log("═══════════════════════════════════════");
  console.log(`  خلاصه:`);
  console.log(`    دوره‌های استاتیک: ${archivedCourses.length}`);
  console.log(`    ثبت‌شده (جدید):   ${inserted}`);
  console.log(`    skip‌شده (تکراری): ${skipped}`);
  if (errors.length > 0) {
    console.log(`    خطاها:            ${errors.length}`);
    console.log("");
    console.log("  جزئیات خطاها:");
    for (const e of errors) {
      console.log(`    - ${e}`);
    }
  }
  console.log("═══════════════════════════════════════");

  await queryClient.end();
  process.exit(errors.length > 0 ? 1 : 0);
}

void main();

/**
 * GET /api/setup/run-migrations?confirm=yes
 *
 * One-time setup endpoint that runs ALL pending SQL migrations
 * against the configured database. Safe to call multiple times —
 * uses IF NOT EXISTS everywhere.
 *
 * This is intentionally PUBLIC (no auth) because:
 *   1. It's needed before any user can log in (chicken-and-egg).
 *   2. It only creates tables/columns — doesn't drop or modify data.
 *   3. The `?confirm=yes` query param prevents accidental triggers.
 *
 * After first successful run, this endpoint can be deleted or
 * protected — but it's harmless to leave it.
 */
import { createFileRoute } from "@tanstack/react-router";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

export const Route = createFileRoute("/api/setup/run-migrations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const confirm = url.searchParams.get("confirm");

        if (confirm !== "yes") {
          return Response.json(
            {
              error:
                "برای اجرای migrations، پارامتر ?confirm=yes را به URL اضافه کنید.",
              example: "/api/setup/run-migrations?confirm=yes",
            },
            { status: 400 },
          );
        }

        const db = getDb();
        if (!db) {
          return Response.json(
            {
              error: "DATABASE_URL تنظیم نشده است.",
              hint: "در Vercel → Settings → Environment Variables، DATABASE_URL را اضافه کنید.",
            },
            { status: 503 },
          );
        }

        const results: {
          step: string;
          status: "ok" | "error";
          error?: string;
        }[] = [];

        // Helper to run a step
        const runStep = async (name: string, fn: () => Promise<unknown>) => {
          try {
            await fn();
            results.push({ step: name, status: "ok" });
          } catch (err) {
            results.push({
              step: name,
              status: "error",
              error: err instanceof Error ? err.message : String(err),
            });
          }
        };

        // Create schema
        await runStep("create schema iec", () =>
          db.execute(sql`CREATE SCHEMA IF NOT EXISTS "iec"`),
        );

        // users table
        await runStep("create users table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."users" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "phone" varchar(20) NOT NULL UNIQUE,
              "email" varchar(320),
              "full_name" varchar(200),
              "role" varchar(20) NOT NULL DEFAULT 'student',
              "is_active" boolean NOT NULL DEFAULT true,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("add email column to users", () =>
          db.execute(
            sql`ALTER TABLE "iec"."users" ADD COLUMN IF NOT EXISTS "email" varchar(320)`,
          ),
        );

        await runStep("create users indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "users_phone_idx" ON "iec"."users" USING btree ("phone")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "users_email_idx" ON "iec"."users" USING btree ("email")`,
            ),
          ]),
        );

        // otp_codes table
        await runStep("create otp_codes table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."otp_codes" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "phone" varchar(20) NOT NULL,
              "code_hash" varchar(255) NOT NULL,
              "expires_at" timestamp with time zone NOT NULL,
              "attempts" integer DEFAULT 0 NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create otp_codes indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "otp_codes_phone_idx" ON "iec"."otp_codes" USING btree ("phone")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "otp_codes_expires_at_idx" ON "iec"."otp_codes" USING btree ("expires_at")`,
            ),
          ]),
        );

        // email_otp_codes table (migration 0005)
        await runStep("create email_otp_codes table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."email_otp_codes" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "email" varchar(320) NOT NULL,
              "code_hash" varchar(255) NOT NULL,
              "expires_at" timestamp with time zone NOT NULL,
              "attempts" integer DEFAULT 0 NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create email_otp_codes indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "email_otp_codes_email_idx" ON "iec"."email_otp_codes" USING btree ("email")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "email_otp_codes_expires_at_idx" ON "iec"."email_otp_codes" USING btree ("expires_at")`,
            ),
          ]),
        );

        // sessions table
        await runStep("create sessions table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."sessions" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "user_id" uuid NOT NULL,
              "token_hash" varchar(128) NOT NULL UNIQUE,
              "expires_at" timestamp with time zone NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create sessions indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "iec"."sessions" USING btree ("user_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "iec"."sessions" USING btree ("token_hash")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "iec"."sessions" USING btree ("expires_at")`,
            ),
          ]),
        );

        // courses table
        await runStep("create courses table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."courses" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "instructor_id" uuid,
              "title" varchar(200) NOT NULL,
              "slug" varchar(220) NOT NULL UNIQUE,
              "category" varchar(200) NOT NULL,
              "level" varchar(20),
              "description" text,
              "syllabus" text,
              "prerequisites" text,
              "duration_sessions" integer,
              "capacity" integer,
              "price" integer,
              "poster_url" varchar(1000),
              "cover_webp_url" varchar(1000),
              "cover_jpg_url" varchar(1000),
              "start_date" date,
              "status" varchar(20) NOT NULL DEFAULT 'draft',
              "source" varchar(20) NOT NULL DEFAULT 'platform',
              "display_category" varchar(30),
              "legacy_instructor_name" varchar(200),
              "legacy_instructor_avatar_url" varchar(1000),
              "review_note" text,
              "reviewed_by" uuid,
              "reviewed_at" timestamp with time zone,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create courses indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_instructor_id_idx" ON "iec"."courses" USING btree ("instructor_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_status_idx" ON "iec"."courses" USING btree ("status")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_slug_idx" ON "iec"."courses" USING btree ("slug")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_source_idx" ON "iec"."courses" USING btree ("source")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_display_category_idx" ON "iec"."courses" USING btree ("display_category")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "courses_created_at_idx" ON "iec"."courses" USING btree ("created_at")`,
            ),
          ]),
        );

        // enrollments table
        await runStep("create enrollments table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."enrollments" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "student_id" uuid NOT NULL,
              "course_id" uuid NOT NULL,
              "declared_amount" integer NOT NULL,
              "receipt_image_path" varchar(500) NOT NULL,
              "status" varchar(30) NOT NULL DEFAULT 'pending_payment_review',
              "review_note" text,
              "reviewed_by" uuid,
              "reviewed_at" timestamp with time zone,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create enrollments indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "enrollments_student_id_idx" ON "iec"."enrollments" USING btree ("student_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "enrollments_course_id_idx" ON "iec"."enrollments" USING btree ("course_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "enrollments_status_idx" ON "iec"."enrollments" USING btree ("status")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "enrollments_created_at_idx" ON "iec"."enrollments" USING btree ("created_at")`,
            ),
          ]),
        );

        // wallets table
        await runStep("create wallets table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."wallets" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "user_id" uuid NOT NULL UNIQUE,
              "balance" integer NOT NULL DEFAULT 0,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create wallets indexes", () =>
          db.execute(
            sql`CREATE INDEX IF NOT EXISTS "wallets_user_id_idx" ON "iec"."wallets" USING btree ("user_id")`,
          ),
        );

        // wallet_transactions table
        await runStep("create wallet_transactions table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."wallet_transactions" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "wallet_id" uuid NOT NULL,
              "type" varchar(10) NOT NULL,
              "amount" integer NOT NULL,
              "commission_rate_applied" integer,
              "related_enrollment_id" uuid,
              "description" text NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create wallet_transactions indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "wallet_transactions_wallet_id_idx" ON "iec"."wallet_transactions" USING btree ("wallet_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "wallet_transactions_created_at_idx" ON "iec"."wallet_transactions" USING btree ("created_at")`,
            ),
          ]),
        );

        // instructor_applications table
        await runStep("create instructor_applications table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."instructor_applications" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "applicant_id" uuid NOT NULL,
              "full_name" varchar(200) NOT NULL,
              "bio" text NOT NULL,
              "expertise" varchar(500) NOT NULL,
              "resume_url" varchar(1000),
              "status" varchar(20) NOT NULL DEFAULT 'pending',
              "review_note" text,
              "reviewed_by" uuid,
              "reviewed_at" timestamp with time zone,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create instructor_applications indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "instructor_applications_applicant_id_idx" ON "iec"."instructor_applications" USING btree ("applicant_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "instructor_applications_status_idx" ON "iec"."instructor_applications" USING btree ("status")`,
            ),
          ]),
        );

        // tickets table
        await runStep("create tickets table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."tickets" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "created_by" uuid NOT NULL,
              "subject" varchar(200) NOT NULL,
              "status" varchar(20) NOT NULL DEFAULT 'open',
              "assigned_to" uuid,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL,
              "updated_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create tickets indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "tickets_created_by_idx" ON "iec"."tickets" USING btree ("created_by")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "tickets_status_idx" ON "iec"."tickets" USING btree ("status")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "tickets_assigned_to_idx" ON "iec"."tickets" USING btree ("assigned_to")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "tickets_created_at_idx" ON "iec"."tickets" USING btree ("created_at")`,
            ),
          ]),
        );

        // ticket_messages table
        await runStep("create ticket_messages table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."ticket_messages" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "ticket_id" uuid NOT NULL,
              "sender_id" uuid NOT NULL,
              "body" text NOT NULL,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create ticket_messages indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "ticket_messages_ticket_id_idx" ON "iec"."ticket_messages" USING btree ("ticket_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "ticket_messages_created_at_idx" ON "iec"."ticket_messages" USING btree ("created_at")`,
            ),
          ]),
        );

        // audit_logs table
        await runStep("create audit_logs table", () =>
          db.execute(sql`
            CREATE TABLE IF NOT EXISTS "iec"."audit_logs" (
              "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
              "actor_id" uuid,
              "action" varchar(100) NOT NULL,
              "target_type" varchar(50),
              "target_id" uuid,
              "metadata" jsonb,
              "created_at" timestamp with time zone DEFAULT now() NOT NULL
            )
          `),
        );

        await runStep("create audit_logs indexes", () =>
          Promise.all([
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "iec"."audit_logs" USING btree ("actor_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "iec"."audit_logs" USING btree ("action")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "audit_logs_target_type_target_id_idx" ON "iec"."audit_logs" USING btree ("target_type", "target_id")`,
            ),
            db.execute(
              sql`CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "iec"."audit_logs" USING btree ("created_at")`,
            ),
          ]),
        );

        const okCount = results.filter((r) => r.status === "ok").length;
        const errorCount = results.filter((r) => r.status === "error").length;

        return Response.json({
          ok: errorCount === 0,
          message:
            errorCount === 0
              ? `✅ تمام migration‌ها با موفقیت اجرا شدند (${okCount} قدم).`
              : `⚠️ ${okCount} قدم موفق، ${errorCount} خطا.`,
          results,
          nextStep:
            errorCount === 0
              ? "حالا می‌توانید به /dashboard بروید و با ایمیل وارد شوید."
              : "خطاهای بالا را بررسی کنید — معمولاً جدول‌ها از قبل وجود دارند (که OK است).",
        });
      },
    },
  },
});

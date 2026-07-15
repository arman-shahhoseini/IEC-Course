CREATE TYPE "iec"."course_source" AS ENUM('legacy', 'platform');--> statement-breakpoint
CREATE TYPE "iec"."display_category" AS ENUM('upcoming', 'current', 'archived');--> statement-breakpoint
CREATE TYPE "iec"."enrollment_status" AS ENUM('pending_payment_review', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "iec"."wallet_transaction_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TABLE "iec"."enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"declared_amount" integer NOT NULL,
	"receipt_image_path" varchar(500) NOT NULL,
	"status" "iec"."enrollment_status" DEFAULT 'pending_payment_review' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iec"."wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"type" "iec"."wallet_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"commission_rate_applied" integer,
	"related_enrollment_id" uuid,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "iec"."wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "iec"."courses" ALTER COLUMN "instructor_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ALTER COLUMN "level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ALTER COLUMN "syllabus" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ALTER COLUMN "duration_sessions" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "cover_webp_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "cover_jpg_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "source" "iec"."course_source" DEFAULT 'platform' NOT NULL;--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "display_category" "iec"."display_category";--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "legacy_instructor_name" varchar(200);--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD COLUMN "legacy_instructor_avatar_url" varchar(1000);--> statement-breakpoint
ALTER TABLE "iec"."enrollments" ADD CONSTRAINT "enrollments_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "iec"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "iec"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."enrollments" ADD CONSTRAINT "enrollments_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "iec"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "iec"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_related_enrollment_id_enrollments_id_fk" FOREIGN KEY ("related_enrollment_id") REFERENCES "iec"."enrollments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iec"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enrollments_student_id_idx" ON "iec"."enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_id_idx" ON "iec"."enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "enrollments_status_idx" ON "iec"."enrollments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enrollments_created_at_idx" ON "iec"."enrollments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "iec"."wallet_transactions" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "wallet_transactions_created_at_idx" ON "iec"."wallet_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wallets_user_id_idx" ON "iec"."wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "courses_source_idx" ON "iec"."courses" USING btree ("source");--> statement-breakpoint
CREATE INDEX "courses_display_category_idx" ON "iec"."courses" USING btree ("display_category");
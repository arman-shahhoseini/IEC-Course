CREATE TYPE "iec"."course_level" AS ENUM('beginner', 'intermediate', 'advanced');--> statement-breakpoint
CREATE TYPE "iec"."course_status" AS ENUM('draft', 'pending_review', 'published', 'rejected');--> statement-breakpoint
CREATE TABLE "iec"."courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructor_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"category" varchar(200) NOT NULL,
	"level" "iec"."course_level" NOT NULL,
	"description" text NOT NULL,
	"syllabus" text NOT NULL,
	"duration_sessions" integer NOT NULL,
	"capacity" integer,
	"price" integer,
	"prerequisites" text,
	"poster_url" varchar(1000),
	"start_date" date,
	"status" "iec"."course_status" DEFAULT 'draft' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD CONSTRAINT "courses_instructor_id_users_id_fk" FOREIGN KEY ("instructor_id") REFERENCES "iec"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."courses" ADD CONSTRAINT "courses_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "iec"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "courses_instructor_id_idx" ON "iec"."courses" USING btree ("instructor_id");--> statement-breakpoint
CREATE INDEX "courses_status_idx" ON "iec"."courses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "courses_slug_idx" ON "iec"."courses" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "courses_created_at_idx" ON "iec"."courses" USING btree ("created_at");
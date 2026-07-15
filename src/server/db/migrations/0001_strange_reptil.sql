CREATE TYPE "iec"."application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "iec"."instructor_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"specialization" varchar(200) NOT NULL,
	"bio" text NOT NULL,
	"experience_years" integer,
	"sample_work_url" varchar(1000),
	"status" "iec"."application_status" DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iec"."instructor_applications" ADD CONSTRAINT "instructor_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "iec"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iec"."instructor_applications" ADD CONSTRAINT "instructor_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "iec"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "instructor_applications_user_id_idx" ON "iec"."instructor_applications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "instructor_applications_status_idx" ON "iec"."instructor_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "instructor_applications_created_at_idx" ON "iec"."instructor_applications" USING btree ("created_at");
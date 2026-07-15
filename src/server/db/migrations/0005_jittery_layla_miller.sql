CREATE TABLE "iec"."email_otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "iec"."users" ADD COLUMN "email" varchar(320);--> statement-breakpoint
CREATE INDEX "email_otp_codes_email_idx" ON "iec"."email_otp_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "email_otp_codes_expires_at_idx" ON "iec"."email_otp_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "iec"."users" USING btree ("email");
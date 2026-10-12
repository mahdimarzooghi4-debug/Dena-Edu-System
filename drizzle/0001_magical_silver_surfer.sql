CREATE TABLE "dena_otp_dispatch_limits" (
	"phone_hash" text PRIMARY KEY NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rateLimit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"lastRequest" bigint NOT NULL,
	CONSTRAINT "rateLimit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phoneNumber" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phoneNumberVerified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "dena_one_student_membership_per_user" ON "dena_memberships" USING btree ("user_id") WHERE role = 'student';--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phoneNumber_unique" UNIQUE("phoneNumber");
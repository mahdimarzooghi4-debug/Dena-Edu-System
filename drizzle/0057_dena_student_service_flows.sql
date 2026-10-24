CREATE TABLE "dena_phone_change_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_phone_change_challenges_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "dena_phone_change_challenge_code_hash_ck" CHECK (code_hash ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "dena_phone_change_challenge_attempts_ck" CHECK (attempts BETWEEN 0 AND 3),
	CONSTRAINT "dena_phone_change_challenge_phone_ck" CHECK (phone_number ~ '^\+989[0-9]{9}$')
);
--> statement-breakpoint
CREATE TABLE "dena_service_call_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_call_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"summary" text NOT NULL,
	"next_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dena_service_call_follow_ups_service_call_id_unique" UNIQUE("service_call_id"),
	CONSTRAINT "dena_service_call_follow_up_summary_ck" CHECK (
    char_length(summary) BETWEEN 10 AND 4000
  ),
	CONSTRAINT "dena_service_call_follow_up_steps_ck" CHECK (
    jsonb_typeof(next_steps) = 'array' AND jsonb_array_length(next_steps) <= 10
  )
);
--> statement-breakpoint
ALTER TABLE "dena_phone_change_challenges" ADD CONSTRAINT "dena_phone_change_challenges_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_call_follow_ups" ADD CONSTRAINT "dena_service_call_follow_ups_service_call_id_dena_institute_service_calls_id_fk" FOREIGN KEY ("service_call_id") REFERENCES "public"."dena_institute_service_calls"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dena_service_call_follow_ups" ADD CONSTRAINT "dena_service_call_follow_ups_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dena_phone_change_challenge_expiry_idx" ON "dena_phone_change_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "dena_service_call_follow_up_published_idx" ON "dena_service_call_follow_ups" USING btree ("published_at","id");
CREATE TABLE "metadata" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text_hash" text NOT NULL,
	"created_by" text NOT NULL,
	"session_id" text,
	"user_id" text,
	"created_at" timestamp DEFAULT now(),
	"label" text,
	"source" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"created_at" timestamp DEFAULT now(),
	"last_active" timestamp DEFAULT now(),
	"request_count" text DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "text_data" (
	"hash" text PRIMARY KEY NOT NULL,
	"text" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"google_id" text,
	"email" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);
--> statement-breakpoint
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_text_hash_text_data_hash_fk" FOREIGN KEY ("text_hash") REFERENCES "public"."text_data"("hash") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metadata" ADD CONSTRAINT "metadata_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
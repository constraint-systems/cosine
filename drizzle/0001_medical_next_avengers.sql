ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "users" CASCADE;--> statement-breakpoint
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_session_id_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "metadata" DROP CONSTRAINT "metadata_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "metadata" ALTER COLUMN "created_by" SET DEFAULT 'anon';--> statement-breakpoint
ALTER TABLE "metadata" DROP COLUMN "session_id";--> statement-breakpoint
ALTER TABLE "metadata" DROP COLUMN "user_id";
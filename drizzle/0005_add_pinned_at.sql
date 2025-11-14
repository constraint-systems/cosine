-- Add pinnedAt column to metadata table
ALTER TABLE "metadata" ADD COLUMN "pinned_at" timestamp;

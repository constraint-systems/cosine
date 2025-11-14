-- Add notes column
ALTER TABLE "metadata" ADD COLUMN "notes" text;--> statement-breakpoint

-- Migrate existing data from label and source to notes
-- If both label and source exist, concatenate them; otherwise use whichever exists
UPDATE "metadata"
SET "notes" = CASE
  WHEN "label" IS NOT NULL AND "source" IS NOT NULL THEN "label" || E'\n' || "source"
  WHEN "label" IS NOT NULL THEN "label"
  WHEN "source" IS NOT NULL THEN "source"
  ELSE NULL
END;--> statement-breakpoint

-- Drop old columns
ALTER TABLE "metadata" DROP COLUMN "label";--> statement-breakpoint
ALTER TABLE "metadata" DROP COLUMN "source";

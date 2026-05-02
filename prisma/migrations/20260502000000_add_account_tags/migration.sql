-- Add tags array column to Account (safe: adds with default, no data loss)
ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';

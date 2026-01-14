-- AlterTable: Add shareLimit to Organization
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "shareLimit" INTEGER;

-- AlterTable: Add new columns to Share table
-- Add nullable columns first, then update existing rows, then make NOT NULL
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER;
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "isExpired" BOOLEAN;
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE "share" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

-- Update existing rows with defaults
UPDATE "share" SET "viewCount" = 0 WHERE "viewCount" IS NULL;
UPDATE "share" SET "isExpired" = false WHERE "isExpired" IS NULL;
UPDATE "share" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
UPDATE "share" SET "title" = "websiteUrl" WHERE "title" IS NULL;

-- Now make columns NOT NULL where needed
ALTER TABLE "share" ALTER COLUMN "viewCount" SET NOT NULL;
ALTER TABLE "share" ALTER COLUMN "viewCount" SET DEFAULT 0;
ALTER TABLE "share" ALTER COLUMN "isExpired" SET NOT NULL;
ALTER TABLE "share" ALTER COLUMN "isExpired" SET DEFAULT false;
ALTER TABLE "share" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Add foreign key constraints (with IF NOT EXISTS check)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'share_userId_fkey'
    ) THEN
        ALTER TABLE "share" ADD CONSTRAINT "share_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'share_organizationId_fkey'
    ) THEN
        ALTER TABLE "share" ADD CONSTRAINT "share_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "share_userId_idx" ON "share"("userId");
CREATE INDEX IF NOT EXISTS "share_organizationId_idx" ON "share"("organizationId");
CREATE INDEX IF NOT EXISTS "share_isExpired_idx" ON "share"("isExpired");

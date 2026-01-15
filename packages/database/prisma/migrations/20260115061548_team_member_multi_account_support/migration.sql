-- Create junction table for team member to expense account relationships
CREATE TABLE IF NOT EXISTS "teamMemberAccount" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "joinedDate" TIMESTAMP(3),
    "salary" DECIMAL(65,30),
    "position" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teamMemberAccount_pkey" PRIMARY KEY ("id")
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "teamMemberAccount_teamMemberId_idx" ON "teamMemberAccount"("teamMemberId");
CREATE INDEX IF NOT EXISTS "teamMemberAccount_accountId_idx" ON "teamMemberAccount"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "teamMemberAccount_teamMemberId_accountId_key" ON "teamMemberAccount"("teamMemberId", "accountId");

-- Add foreign keys
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teamMemberAccount_teamMemberId_fkey'
    ) THEN
        ALTER TABLE "teamMemberAccount" ADD CONSTRAINT "teamMemberAccount_teamMemberId_fkey" 
        FOREIGN KEY ("teamMemberId") REFERENCES "teamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teamMemberAccount_accountId_fkey'
    ) THEN
        ALTER TABLE "teamMemberAccount" ADD CONSTRAINT "teamMemberAccount_accountId_fkey" 
        FOREIGN KEY ("accountId") REFERENCES "expenseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Update teamMember table: Remove businessId constraint, make it nullable
ALTER TABLE "teamMember" ALTER COLUMN "businessId" DROP NOT NULL;

-- Move salary, position, joinedDate to junction table (data migration)
-- For each existing team member, create a record in teamMemberAccount
INSERT INTO "teamMemberAccount" ("id", "teamMemberId", "accountId", "joinedDate", "salary", "position", "createdAt", "updatedAt")
SELECT 
    gen_random_uuid()::TEXT, 
    tm."id", 
    tm."businessId", 
    tm."joinedDate", 
    tm."salary", 
    tm."position", 
    CURRENT_TIMESTAMP, 
    CURRENT_TIMESTAMP
FROM "teamMember" tm
WHERE tm."businessId" IS NOT NULL;

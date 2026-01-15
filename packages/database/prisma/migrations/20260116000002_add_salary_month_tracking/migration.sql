-- Add salaryMonth field to Expense table
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "salaryMonth" TEXT;

-- Create index for salaryMonth
CREATE INDEX IF NOT EXISTS "expense_salaryMonth_idx" ON "expense"("salaryMonth");

-- Create unique constraint to prevent duplicate salaries for same team member + expense account + month
-- Note: This will only apply to expenses where salaryMonth is not null
-- Using a partial unique index to only enforce uniqueness when salaryMonth is set
CREATE UNIQUE INDEX IF NOT EXISTS "expense_businessId_teamMemberId_salaryMonth_key" 
ON "expense"("businessId", "teamMemberId", "salaryMonth") 
WHERE "salaryMonth" IS NOT NULL AND "teamMemberId" IS NOT NULL;

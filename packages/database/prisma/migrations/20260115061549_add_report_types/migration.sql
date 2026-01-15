-- Add reportType to expenseReport table
ALTER TABLE "expenseReport" ADD COLUMN IF NOT EXISTS "reportType" TEXT DEFAULT 'all_categories';

-- Add reportName column
ALTER TABLE "expenseReport" ADD COLUMN IF NOT EXISTS "reportName" TEXT;

-- Add selectedAccountIds JSON column (array of account IDs included in report)
ALTER TABLE "expenseReport" ADD COLUMN IF NOT EXISTS "selectedAccountIds" JSONB;

-- Add index on reportType
CREATE INDEX IF NOT EXISTS "expenseReport_reportType_idx" ON "expenseReport"("reportType");

-- Add isScheduled flag to distinguish scheduled vs custom reports
ALTER TABLE "expenseReport" ADD COLUMN IF NOT EXISTS "isScheduled" BOOLEAN DEFAULT false;

-- Update existing reports to have reportType 'all_categories'
UPDATE "expenseReport" SET "reportType" = 'all_categories' WHERE "reportType" IS NULL;

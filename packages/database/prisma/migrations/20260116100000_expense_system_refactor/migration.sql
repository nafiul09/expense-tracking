-- Expense System Refactor Migration
-- This migration refactors subscriptions, expenses, and loans

-- ============================================
-- 1. Update Subscription Table
-- ============================================

-- Add new columns to subscription
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "websiteUrl" TEXT;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "websiteIcon" TEXT;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "conversionRate" DECIMAL(65,30);
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "rateType" TEXT;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "baseCurrencyAmount" DECIMAL(65,30);
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "paymentMethodId" TEXT;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(65,30);

-- Drop old columns if they exist
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "renewalType";
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "autoRenew";
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "expenseId";
ALTER TABLE "subscription" DROP COLUMN IF EXISTS "currentAmount";

-- Add foreign key for paymentMethodId if not exists
ALTER TABLE "subscription" DROP CONSTRAINT IF EXISTS "subscription_paymentMethodId_fkey";
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "paymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for paymentMethodId
CREATE INDEX IF NOT EXISTS "subscription_paymentMethodId_idx" ON "subscription"("paymentMethodId");

-- ============================================
-- 2. Update Expense Table
-- ============================================

-- Add expenseType column
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "expenseType" TEXT NOT NULL DEFAULT 'one_time';

-- Update existing expenses based on their relationships
UPDATE "expense" SET "expenseType" = 'subscription' WHERE "subscriptionId" IS NOT NULL;
UPDATE "expense" SET "expenseType" = 'team_salary' WHERE "teamMemberId" IS NOT NULL AND "salaryMonth" IS NOT NULL;

-- Add index for expenseType
CREATE INDEX IF NOT EXISTS "expense_expenseType_idx" ON "expense"("expenseType");

-- Remove old loan relation constraint if exists
ALTER TABLE "expense" DROP CONSTRAINT IF EXISTS "expense_loan_fkey";

-- ============================================
-- 3. Handle Old Loan Tables
-- ============================================

-- Drop temporary tables and old loan tables
DROP TABLE IF EXISTS "loan_new" CASCADE;
DROP TABLE IF EXISTS "loanPayment_new" CASCADE;
DROP TABLE IF EXISTS "temp_old_loans";
DROP TABLE IF EXISTS "temp_old_loan_payments";
DROP TABLE IF EXISTS "loan" CASCADE;
DROP TABLE IF EXISTS "loanPayment" CASCADE;
DROP TABLE IF EXISTS "standaloneLoanPayment" CASCADE;

-- Clean up any orphaned constraints using pg_catalog
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname, conrelid::regclass FROM pg_constraint WHERE conname IN ('loan_pkey', 'loanPayment_pkey'))
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.conrelid, r.conname);
    END LOOP;
END $$;

-- ============================================
-- 4. Create New Generic Loan Tables
-- ============================================

-- Create new Loan table
CREATE TABLE "loan" (
  "id" TEXT NOT NULL,
  "expenseAccountId" TEXT NOT NULL,
  "loanType" TEXT NOT NULL,
  "partyName" TEXT NOT NULL,
  "partyContact" TEXT,
  "principalAmount" DECIMAL(65,30) NOT NULL,
  "currentBalance" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "conversionRate" DECIMAL(65,30),
  "rateType" TEXT,
  "baseCurrencyAmount" DECIMAL(65,30),
  "interestRate" DECIMAL(65,30),
  "interestType" TEXT,
  "accruedInterest" DECIMAL(65,30) NOT NULL DEFAULT 0,
  "loanDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3),
  "collateral" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "loan_pkey" PRIMARY KEY ("id")
);

-- Create new LoanPayment table
CREATE TABLE "loanPayment" (
  "id" TEXT NOT NULL,
  "loanId" TEXT NOT NULL,
  "amount" DECIMAL(65,30) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "conversionRate" DECIMAL(65,30),
  "paymentDate" TIMESTAMP(3) NOT NULL,
  "paymentType" TEXT NOT NULL DEFAULT 'principal',
  "notes" TEXT,
  "recordedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loanPayment_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "loan" ADD CONSTRAINT "loan_expenseAccountId_fkey" FOREIGN KEY ("expenseAccountId") REFERENCES "expenseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan" ADD CONSTRAINT "loan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "loanPayment" ADD CONSTRAINT "loanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loanPayment" ADD CONSTRAINT "loanPayment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS "loan_expenseAccountId_idx" ON "loan"("expenseAccountId");
CREATE INDEX IF NOT EXISTS "loan_loanType_idx" ON "loan"("loanType");
CREATE INDEX IF NOT EXISTS "loan_status_idx" ON "loan"("status");
CREATE INDEX IF NOT EXISTS "loan_partyName_idx" ON "loan"("partyName");
CREATE INDEX IF NOT EXISTS "loan_createdBy_idx" ON "loan"("createdBy");
CREATE INDEX IF NOT EXISTS "loanPayment_loanId_idx" ON "loanPayment"("loanId");

-- ============================================
-- 5. Migrate Existing Loan Data
-- ============================================

-- Migrate TeamMemberLoan data to new Loan model (if table exists)
INSERT INTO "loan" (
  "id", "expenseAccountId", "loanType", "partyName", "principalAmount", "currentBalance",
  "currency", "loanDate", "notes", "status", "createdBy", "createdAt", "updatedAt"
)
SELECT 
  "tml"."id", "e"."businessId", 'given', "tm"."name", "tml"."principalAmount", "tml"."remainingAmount",
  COALESCE("e"."currency", 'USD'), "tml"."loanDate", "tml"."notes", "tml"."status",
  "e"."createdBy", "tml"."loanDate", CURRENT_TIMESTAMP
FROM "teamMemberLoan" "tml"
INNER JOIN "expense" "e" ON "tml"."expenseId" = "e"."id"
INNER JOIN "teamMember" "tm" ON "tml"."teamMemberId" = "tm"."id"
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teamMemberLoan')
ON CONFLICT ("id") DO NOTHING;

-- ============================================
-- 6. Update TeamMember Table
-- ============================================

-- Remove loan-related columns
ALTER TABLE "teamMember" DROP COLUMN IF EXISTS "totalLoanBalance";

-- ============================================
-- 7. Drop Old Loan Tables
-- ============================================

-- Drop old tables after migration
DROP TABLE IF EXISTS "teamMemberLoan" CASCADE;
DROP TABLE IF EXISTS "loanPayment_old_teammember" CASCADE;
DROP TABLE IF EXISTS "loanPayment_old" CASCADE;
DROP TABLE IF EXISTS "loan_old_standalone" CASCADE;

-- ============================================
-- 8. Add Check Constraints
-- ============================================

-- Add check constraints if they don't exist
ALTER TABLE "expense" DROP CONSTRAINT IF EXISTS "expense_expenseType_check";
ALTER TABLE "expense" ADD CONSTRAINT "expense_expenseType_check" CHECK ("expenseType" IN ('subscription', 'team_salary', 'one_time'));

ALTER TABLE "loan" DROP CONSTRAINT IF EXISTS "loan_loanType_check";
ALTER TABLE "loan" ADD CONSTRAINT "loan_loanType_check" CHECK ("loanType" IN ('given', 'taken'));

ALTER TABLE "loanPayment" DROP CONSTRAINT IF EXISTS "loanPayment_paymentType_check";
ALTER TABLE "loanPayment" ADD CONSTRAINT "loanPayment_paymentType_check" CHECK ("paymentType" IN ('principal', 'interest', 'both'));

-- ============================================
-- Migration Complete
-- ============================================

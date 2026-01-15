-- Add conversion rate tracking fields to Expense table
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "conversionRate" DECIMAL(65,30);
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "rateType" TEXT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "baseCurrencyAmount" DECIMAL(65,30);

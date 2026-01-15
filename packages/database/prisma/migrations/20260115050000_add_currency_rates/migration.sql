-- CreateTable: Create CurrencyRate table for storing currency conversion rates per organization
CREATE TABLE IF NOT EXISTS "currencyRate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DECIMAL(65,30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "currencyRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index on organizationId for faster lookups
CREATE INDEX IF NOT EXISTS "currencyRate_organizationId_idx" ON "currencyRate"("organizationId");

-- CreateUniqueConstraint: Ensure one rate per organization per currency pair
CREATE UNIQUE INDEX IF NOT EXISTS "currencyRate_organizationId_toCurrency_key" ON "currencyRate"("organizationId", "toCurrency");

-- AddForeignKey: Link currency rates to organizations
ALTER TABLE "currencyRate" ADD CONSTRAINT "currencyRate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add reportCurrency column to ExpenseReport table
ALTER TABLE "expenseReport" ADD COLUMN IF NOT EXISTS "reportCurrency" TEXT NOT NULL DEFAULT 'USD';

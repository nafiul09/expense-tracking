-- Add currency formatting fields to CurrencyRate table
ALTER TABLE "currencyRate" ADD COLUMN IF NOT EXISTS "symbol" TEXT;
ALTER TABLE "currencyRate" ADD COLUMN IF NOT EXISTS "symbolPosition" TEXT NOT NULL DEFAULT 'left';
ALTER TABLE "currencyRate" ADD COLUMN IF NOT EXISTS "separator" TEXT NOT NULL DEFAULT ',';
ALTER TABLE "currencyRate" ADD COLUMN IF NOT EXISTS "decimalSeparator" TEXT NOT NULL DEFAULT '.';

-- Rename business table to expenseAccount
ALTER TABLE "business" RENAME TO "expenseAccount";

-- Note: Foreign key column names (businessId) remain unchanged for backward compatibility
-- The relation field names in Prisma will be updated to expenseAccount while keeping businessId column names

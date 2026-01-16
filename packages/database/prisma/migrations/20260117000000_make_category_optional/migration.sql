-- Make category optional in Expense table
-- This allows expenses to exist without a category, using description instead

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE "expense" DROP CONSTRAINT IF EXISTS "expense_categoryId_fkey";

-- Step 2: Make categoryId nullable
ALTER TABLE "expense" ALTER COLUMN "categoryId" DROP NOT NULL;

-- Step 3: Add the foreign key constraint back with SetNull behavior
ALTER TABLE "expense" 
ADD CONSTRAINT "expense_categoryId_fkey" 
FOREIGN KEY ("categoryId") 
REFERENCES "expenseCategory"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

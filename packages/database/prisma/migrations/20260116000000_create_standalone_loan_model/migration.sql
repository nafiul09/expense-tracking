-- Create standalone Loan model
CREATE TABLE IF NOT EXISTS "loan" (
    "id" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "currentBalance" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "conversionRate" DECIMAL(65,30),
    "rateType" TEXT,
    "baseCurrencyAmount" DECIMAL(65,30),
    "loanDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_pkey" PRIMARY KEY ("id")
);

-- Create standalone loan payment table
CREATE TABLE IF NOT EXISTS "standaloneLoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "conversionRate" DECIMAL(65,30),
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentType" TEXT NOT NULL DEFAULT 'payment',
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "standaloneLoanPayment_pkey" PRIMARY KEY ("id")
);

-- Add totalLoanBalance column to TeamMember
ALTER TABLE "teamMember" ADD COLUMN IF NOT EXISTS "totalLoanBalance" DECIMAL(65,30) DEFAULT 0;

-- Create indexes
CREATE INDEX IF NOT EXISTS "loan_teamMemberId_idx" ON "loan"("teamMemberId");
CREATE INDEX IF NOT EXISTS "loan_businessId_idx" ON "loan"("businessId");
CREATE INDEX IF NOT EXISTS "loan_status_idx" ON "loan"("status");
CREATE INDEX IF NOT EXISTS "standaloneLoanPayment_loanId_idx" ON "standaloneLoanPayment"("loanId");

-- Add foreign key constraints
ALTER TABLE "loan" ADD CONSTRAINT "loan_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "teamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan" ADD CONSTRAINT "loan_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "expenseAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "loan" ADD CONSTRAINT "loan_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "standaloneLoanPayment" ADD CONSTRAINT "standaloneLoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "standaloneLoanPayment" ADD CONSTRAINT "standaloneLoanPayment_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

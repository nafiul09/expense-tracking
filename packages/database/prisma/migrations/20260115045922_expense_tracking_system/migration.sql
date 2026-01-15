-- CreateTable: Create Business table for tracking sub-businesses/products within a workspace
CREATE TABLE IF NOT EXISTS "business" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "type" TEXT NOT NULL DEFAULT 'business',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create ExpenseCategory table for categorizing expenses
CREATE TABLE IF NOT EXISTS "expenseCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create TeamMember table for employees within a business
CREATE TABLE IF NOT EXISTS "teamMember" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "position" TEXT,
    "joinedDate" TIMESTAMP(3),
    "salary" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create PaymentMethod table for tracking payment sources
CREATE TABLE IF NOT EXISTS "paymentMethod" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lastFourDigits" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create Expense table for tracking all expenses
CREATE TABLE IF NOT EXISTS "expense" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "teamMemberId" TEXT,
    "paymentMethodId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "date" TIMESTAMP(3) NOT NULL,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create Subscription table for subscription-specific tracking
CREATE TABLE IF NOT EXISTS "subscription" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "renewalFrequency" TEXT NOT NULL DEFAULT 'monthly',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "nextReminderDate" TIMESTAMP(3),
    "cancelationDate" TIMESTAMP(3),
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create TeamMemberLoan table for tracking loans to team members
CREATE TABLE IF NOT EXISTS "teamMemberLoan" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "teamMemberId" TEXT NOT NULL,
    "principalAmount" DECIMAL(65,30) NOT NULL,
    "remainingAmount" DECIMAL(65,30) NOT NULL,
    "loanDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "teamMemberLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create LoanPayment table for tracking loan repayments
CREATE TABLE IF NOT EXISTS "loanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentMethod" TEXT,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create ExpenseReport table for monthly reports
CREATE TABLE IF NOT EXISTS "expenseReport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessId" TEXT,
    "reportPeriodStart" TIMESTAMP(3) NOT NULL,
    "reportPeriodEnd" TIMESTAMP(3) NOT NULL,
    "totalExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "categoryBreakdown" JSONB,
    "reportData" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSentAt" TIMESTAMP(3),

    CONSTRAINT "expenseReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Create ExpenseReminder table for tracking subscription reminders
CREATE TABLE IF NOT EXISTS "expenseReminder" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "sentDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "emailContent" TEXT,

    CONSTRAINT "expenseReminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index on business organizationId
CREATE INDEX IF NOT EXISTS "business_organizationId_idx" ON "business"("organizationId");

-- CreateIndex: Index on expenseCategory organizationId
CREATE INDEX IF NOT EXISTS "expenseCategory_organizationId_idx" ON "expenseCategory"("organizationId");

-- CreateIndex: Index on teamMember businessId
CREATE INDEX IF NOT EXISTS "teamMember_businessId_idx" ON "teamMember"("businessId");

-- CreateIndex: Index on paymentMethod organizationId
CREATE INDEX IF NOT EXISTS "paymentMethod_organizationId_idx" ON "paymentMethod"("organizationId");

-- CreateIndex: Index on expense businessId
CREATE INDEX IF NOT EXISTS "expense_businessId_idx" ON "expense"("businessId");

-- CreateIndex: Index on expense categoryId
CREATE INDEX IF NOT EXISTS "expense_categoryId_idx" ON "expense"("categoryId");

-- CreateIndex: Index on expense teamMemberId
CREATE INDEX IF NOT EXISTS "expense_teamMemberId_idx" ON "expense"("teamMemberId");

-- CreateIndex: Index on expense date
CREATE INDEX IF NOT EXISTS "expense_date_idx" ON "expense"("date");

-- CreateIndex: Index on expense createdBy
CREATE INDEX IF NOT EXISTS "expense_createdBy_idx" ON "expense"("createdBy");

-- CreateIndex: Index on subscription expenseId
CREATE INDEX IF NOT EXISTS "subscription_expenseId_idx" ON "subscription"("expenseId");

-- CreateIndex: Index on subscription renewalDate
CREATE INDEX IF NOT EXISTS "subscription_renewalDate_idx" ON "subscription"("renewalDate");

-- CreateIndex: Index on subscription nextReminderDate
CREATE INDEX IF NOT EXISTS "subscription_nextReminderDate_idx" ON "subscription"("nextReminderDate");

-- CreateIndex: Index on subscription status
CREATE INDEX IF NOT EXISTS "subscription_status_idx" ON "subscription"("status");

-- CreateIndex: Index on teamMemberLoan expenseId
CREATE INDEX IF NOT EXISTS "teamMemberLoan_expenseId_idx" ON "teamMemberLoan"("expenseId");

-- CreateIndex: Index on teamMemberLoan teamMemberId
CREATE INDEX IF NOT EXISTS "teamMemberLoan_teamMemberId_idx" ON "teamMemberLoan"("teamMemberId");

-- CreateIndex: Index on teamMemberLoan status
CREATE INDEX IF NOT EXISTS "teamMemberLoan_status_idx" ON "teamMemberLoan"("status");

-- CreateIndex: Index on loanPayment loanId
CREATE INDEX IF NOT EXISTS "loanPayment_loanId_idx" ON "loanPayment"("loanId");

-- CreateIndex: Index on expenseReport organizationId
CREATE INDEX IF NOT EXISTS "expenseReport_organizationId_idx" ON "expenseReport"("organizationId");

-- CreateIndex: Index on expenseReport businessId
CREATE INDEX IF NOT EXISTS "expenseReport_businessId_idx" ON "expenseReport"("businessId");

-- CreateIndex: Index on expenseReminder subscriptionId
CREATE INDEX IF NOT EXISTS "expenseReminder_subscriptionId_idx" ON "expenseReminder"("subscriptionId");

-- CreateIndex: Index on expenseReminder scheduledDate
CREATE INDEX IF NOT EXISTS "expenseReminder_scheduledDate_idx" ON "expenseReminder"("scheduledDate");

-- CreateIndex: Index on expenseReminder status
CREATE INDEX IF NOT EXISTS "expenseReminder_status_idx" ON "expenseReminder"("status");

-- AddForeignKey: Link Business to Organization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'business_organizationId_fkey'
    ) THEN
        ALTER TABLE "business" ADD CONSTRAINT "business_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link ExpenseCategory to Organization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenseCategory_organizationId_fkey'
    ) THEN
        ALTER TABLE "expenseCategory" ADD CONSTRAINT "expenseCategory_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link TeamMember to Business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teamMember_businessId_fkey'
    ) THEN
        ALTER TABLE "teamMember" ADD CONSTRAINT "teamMember_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link PaymentMethod to Organization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'paymentMethod_organizationId_fkey'
    ) THEN
        ALTER TABLE "paymentMethod" ADD CONSTRAINT "paymentMethod_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Expense to Business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_businessId_fkey'
    ) THEN
        ALTER TABLE "expense" ADD CONSTRAINT "expense_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Expense to ExpenseCategory
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_categoryId_fkey'
    ) THEN
        ALTER TABLE "expense" ADD CONSTRAINT "expense_categoryId_fkey" 
        FOREIGN KEY ("categoryId") REFERENCES "expenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Expense to TeamMember
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_teamMemberId_fkey'
    ) THEN
        ALTER TABLE "expense" ADD CONSTRAINT "expense_teamMemberId_fkey" 
        FOREIGN KEY ("teamMemberId") REFERENCES "teamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Expense to PaymentMethod
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_paymentMethodId_fkey'
    ) THEN
        ALTER TABLE "expense" ADD CONSTRAINT "expense_paymentMethodId_fkey" 
        FOREIGN KEY ("paymentMethodId") REFERENCES "paymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Expense to User (createdBy)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expense_createdBy_fkey'
    ) THEN
        ALTER TABLE "expense" ADD CONSTRAINT "expense_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link Subscription to Expense
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscription_expenseId_fkey'
    ) THEN
        ALTER TABLE "subscription" ADD CONSTRAINT "subscription_expenseId_fkey" 
        FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link TeamMemberLoan to Expense
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teamMemberLoan_expenseId_fkey'
    ) THEN
        ALTER TABLE "teamMemberLoan" ADD CONSTRAINT "teamMemberLoan_expenseId_fkey" 
        FOREIGN KEY ("expenseId") REFERENCES "expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link TeamMemberLoan to TeamMember
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teamMemberLoan_teamMemberId_fkey'
    ) THEN
        ALTER TABLE "teamMemberLoan" ADD CONSTRAINT "teamMemberLoan_teamMemberId_fkey" 
        FOREIGN KEY ("teamMemberId") REFERENCES "teamMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link LoanPayment to TeamMemberLoan
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'loanPayment_loanId_fkey'
    ) THEN
        ALTER TABLE "loanPayment" ADD CONSTRAINT "loanPayment_loanId_fkey" 
        FOREIGN KEY ("loanId") REFERENCES "teamMemberLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link LoanPayment to User (recordedBy)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'loanPayment_recordedBy_fkey'
    ) THEN
        ALTER TABLE "loanPayment" ADD CONSTRAINT "loanPayment_recordedBy_fkey" 
        FOREIGN KEY ("recordedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link ExpenseReport to Organization
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenseReport_organizationId_fkey'
    ) THEN
        ALTER TABLE "expenseReport" ADD CONSTRAINT "expenseReport_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link ExpenseReport to Business
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenseReport_businessId_fkey'
    ) THEN
        ALTER TABLE "expenseReport" ADD CONSTRAINT "expenseReport_businessId_fkey" 
        FOREIGN KEY ("businessId") REFERENCES "business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey: Link ExpenseReminder to Subscription
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'expenseReminder_subscriptionId_fkey'
    ) THEN
        ALTER TABLE "expenseReminder" ADD CONSTRAINT "expenseReminder_subscriptionId_fkey" 
        FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create unique constraint for subscription expenseId (one subscription per expense)
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_expenseId_key" ON "subscription"("expenseId");

-- Create unique constraint for teamMemberLoan expenseId (one loan per expense)
CREATE UNIQUE INDEX IF NOT EXISTS "teamMemberLoan_expenseId_key" ON "teamMemberLoan"("expenseId");

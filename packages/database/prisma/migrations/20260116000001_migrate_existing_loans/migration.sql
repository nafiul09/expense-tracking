-- Migrate existing TeamMemberLoan data to new Loan model
-- This preserves existing loan data while transitioning to the new structure

INSERT INTO "loan" (
    "id",
    "teamMemberId",
    "businessId",
    "principalAmount",
    "currentBalance",
    "currency",
    "conversionRate",
    "loanDate",
    "notes",
    "status",
    "createdBy",
    "createdAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::TEXT,
    tml."teamMemberId",
    e."businessId",
    tml."principalAmount",
    tml."remainingAmount",
    COALESCE(e."currency", 'USD'),
    e."conversionRate",
    tml."loanDate",
    tml."notes",
    tml."status",
    e."createdBy",
    tml."loanDate",
    CURRENT_TIMESTAMP
FROM "teamMemberLoan" tml
INNER JOIN "expense" e ON e."id" = tml."expenseId"
WHERE NOT EXISTS (
    SELECT 1 FROM "loan" l 
    WHERE l."teamMemberId" = tml."teamMemberId" 
    AND l."loanDate" = tml."loanDate"
    AND l."principalAmount" = tml."principalAmount"
);

-- Migrate existing LoanPayment data to StandaloneLoanPayment
INSERT INTO "standaloneLoanPayment" (
    "id",
    "loanId",
    "amount",
    "currency",
    "paymentDate",
    "paymentType",
    "notes",
    "recordedBy",
    "createdAt"
)
SELECT 
    lp."id",
    l."id" as "loanId",
    lp."amount",
    'USD' as "currency",
    lp."paymentDate",
    'payment' as "paymentType",
    lp."notes",
    lp."recordedBy",
    lp."createdAt"
FROM "loanPayment" lp
INNER JOIN "teamMemberLoan" tml ON tml."id" = lp."loanId"
INNER JOIN "expense" e ON e."id" = tml."expenseId"
INNER JOIN "loan" l ON l."teamMemberId" = tml."teamMemberId"
    AND l."businessId" = e."businessId"
    AND l."principalAmount" = tml."principalAmount"
    AND l."loanDate" = tml."loanDate"
WHERE NOT EXISTS (
    SELECT 1 FROM "standaloneLoanPayment" slp 
    WHERE slp."id" = lp."id"
);

-- Update TeamMember totalLoanBalance from new Loan table
UPDATE "teamMember" tm
SET "totalLoanBalance" = COALESCE(
    (
        SELECT SUM(l."currentBalance")
        FROM "loan" l
        WHERE l."teamMemberId" = tm."id"
        AND l."status" = 'active'
    ),
    0
);

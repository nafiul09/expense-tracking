-- CreateTable: Create UsageMetric table for tracking workspace usage
CREATE TABLE IF NOT EXISTS "usageMetric" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "softLimit" INTEGER,
    "hardLimit" INTEGER,
    "metadata" JSONB,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usageMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index on organizationId for faster lookups
CREATE INDEX IF NOT EXISTS "usageMetric_organizationId_idx" ON "usageMetric"("organizationId");

-- CreateIndex: Index on metricType for faster filtering
CREATE INDEX IF NOT EXISTS "usageMetric_metricType_idx" ON "usageMetric"("metricType");

-- CreateUniqueConstraint: Ensure one metric per organization per type
CREATE UNIQUE INDEX IF NOT EXISTS "usageMetric_organizationId_metricType_key" ON "usageMetric"("organizationId", "metricType");

-- AddForeignKey: Link UsageMetric to Organization with cascade delete
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usageMetric_organizationId_fkey'
    ) THEN
        ALTER TABLE "usageMetric" ADD CONSTRAINT "usageMetric_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


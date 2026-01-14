-- Add custom domain fields to Organization table
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "customDomain" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "customDomainEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "domainConfiguredAt" TIMESTAMP(3);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "domainVerifiedAt" TIMESTAMP(3);

-- Create index for custom domain lookups
CREATE INDEX IF NOT EXISTS "organization_customDomain_idx" ON "organization"("customDomain");

-- Add unique constraint for custom domain (one domain per organization)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'organization_customDomain_key'
    ) THEN
        ALTER TABLE "organization" ADD CONSTRAINT "organization_customDomain_key" UNIQUE ("customDomain");
    END IF;
END $$;


# Custom Domain Setup Guide

This guide will help you set up the custom domain feature for WebClarity.

## Prerequisites

- Vercel account with a project deployed
- Database access (PostgreSQL)
- Environment variables configured

---

## Step 1: Run Database Migration

Navigate to the database package and run the migration:

```bash
cd packages/database
pnpm prisma migrate deploy
```

**Or** if you're using `prisma db push` workflow:

```bash
cd packages/database
pnpm prisma db push
```

This will add the following fields to the `organization` table:
- `customDomain` (TEXT, nullable)
- `customDomainEnabled` (BOOLEAN, default false)
- `domainConfiguredAt` (TIMESTAMP, nullable)
- `domainVerifiedAt` (TIMESTAMP, nullable)

---

## Step 2: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

### Required Variables

```bash
# Vercel Domain Management
VERCEL_AUTH_TOKEN=your_vercel_auth_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
VERCEL_TEAM_ID=your_vercel_team_id_here  # Optional, only if using a team

# Application URL (should already exist)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### How to Get These Values

#### 1. **VERCEL_AUTH_TOKEN**
   - Go to [Vercel Account Settings > Tokens](https://vercel.com/account/tokens)
   - Click "Create Token"
   - Give it a name (e.g., "WebClarity Custom Domains")
   - Select the appropriate scope (needs access to your project)
   - Copy the token and save it securely

#### 2. **VERCEL_PROJECT_ID**
   - Go to your project on Vercel
   - Navigate to Settings > General
   - Look for "Project ID" in the settings
   - Copy the project ID

   **Or** get it via CLI:
   ```bash
   vercel project ls
   ```

#### 3. **VERCEL_TEAM_ID** (Optional)
   - Only needed if your project is under a Vercel team (not personal account)
   - Go to your team settings on Vercel
   - Look for "Team ID" in the settings
   - Copy the team ID

   **Or** get it via CLI:
   ```bash
   vercel teams ls
   ```

---

## Step 3: Install Dependencies

Make sure you have the new `@radix-ui/react-switch` dependency:

```bash
pnpm install
```

---

## Step 4: Configure CNAME Target Domain

The system uses a CNAME verification approach. You need to set up a subdomain for verification:

1. **Choose a CNAME target subdomain** (e.g., `cname.webclarity.ai`)
2. **Point it to your Vercel deployment**:
   - Add a CNAME record in your DNS provider
   - Name: `cname` (or whatever subdomain you chose)
   - Value: `cname.vercel-dns.com` (Vercel's DNS)

3. **Update the config** (if different from default):
   - Open `config/index.ts`
   - Update the `domains.cnameVerificationBase` value

---

## Step 5: Test the Setup

1. **Start the development server**:
   ```bash
   pnpm dev
   ```

2. **Navigate to workspace settings**:
   - Go to any workspace: `/{organizationSlug}/settings/branding`
   - You should see the "Custom Domain" section

3. **Test domain connection**:
   - Enter a test domain (you control)
   - Click "Connect Domain"
   - Follow the DNS configuration instructions
   - Click "Verify Domain"

---

## Step 6: Plan Configuration (Already Done)

The following plans have custom domain access enabled:
- ✅ Pro plan
- ✅ Lifetime plan
- ✅ Enterprise plan
- ❌ Free plan (disabled)

This is already configured in `config/index.ts`.

---

## How It Works

### User Flow
1. User navigates to **Workspace Settings > Branding**
2. Enters their custom domain (e.g., `docs.mycompany.com`)
3. System adds domain to Vercel via API
4. User adds CNAME record pointing to `cname.webclarity.ai`
5. User clicks "Verify Domain" button
6. System checks Vercel for verification status
7. Once verified, user can enable the domain
8. All new shares will use the custom domain
9. Existing shares automatically redirect to custom domain (if enabled)

### Technical Flow
1. **Domain Registration**: `VercelDomainService.addDomain()`
2. **DNS Verification**: User configures CNAME in their DNS
3. **Verification Check**: `VercelDomainService.verifyDomain()`
4. **Middleware Routing**: `middleware.ts` checks hostname and routes to org
5. **Share URLs**: Generated with custom domain if active
6. **Redirects**: Existing shares redirect to custom domain if configured

---

## Troubleshooting

### Domain not verifying
- Check that the CNAME record is correctly configured
- DNS propagation can take up to 48 hours (usually 5-15 minutes)
- Use `dig` or `nslookup` to verify DNS records:
  ```bash
  dig docs.mycompany.com CNAME
  ```

### Domain verification fails in Vercel
- Ensure `VERCEL_AUTH_TOKEN` has correct permissions
- Verify `VERCEL_PROJECT_ID` matches your deployed project
- Check Vercel logs for any API errors

### Middleware not routing correctly
- Verify database has `customDomain`, `customDomainEnabled`, and `domainVerifiedAt` fields
- Check that the domain is enabled: `customDomainEnabled = true`
- Ensure `domainVerifiedAt` is not null

### Plan access denied
- Verify the organization has an active Pro/Lifetime/Enterprise plan
- Check `purchases` table for active subscriptions
- Review `config/index.ts` plan limits configuration

---

## Security Considerations

1. **Domain Ownership**: The CNAME verification ensures users control the domain
2. **Plan-Based Access**: Only paid plans can use custom domains
3. **Domain Uniqueness**: One domain can only be connected to one organization
4. **Verification Required**: Domains must be verified before being enabled

---

## Future Enhancements

- [ ] Automatic SSL certificate provisioning (Vercel handles this)
- [ ] Support for apex domains (requires A/AAAA records)
- [ ] Domain analytics (track traffic per custom domain)
- [ ] Multi-domain support per organization
- [ ] Edge Config caching for faster domain lookups

---

## Support

If you encounter issues:
1. Check the application logs for errors
2. Verify all environment variables are set correctly
3. Test the Vercel API directly using curl:
   ```bash
   curl -X GET "https://api.vercel.com/v9/projects/YOUR_PROJECT_ID/domains" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

---

## Files Modified/Created

### New Files
- `config/domains.ts` - Domain configuration
- `packages/api/modules/domains/` - Domain API module
- `packages/api/modules/organizations/lib/plan-limits.ts` - Plan checks
- `apps/web/middleware.ts` - Custom domain routing
- `apps/web/app/(saas)/[organizationSlug]/settings/branding/page.tsx`
- `apps/web/modules/saas/settings/components/CustomDomainSettings.tsx`
- `apps/web/modules/ui/components/switch.tsx`

### Modified Files
- `packages/database/prisma/schema.prisma` - Added custom domain fields
- `config/index.ts` - Plan limits and domain config
- `packages/api/orpc/router.ts` - Added domains router
- Share creation procedures - Custom domain URL generation
- Various routing files - Updated from `/workspace/[slug]` to `/[slug]`

---

**That's it! Your custom domain feature is now ready to use.** 🎉


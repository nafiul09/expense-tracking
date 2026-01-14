# Setting Up cname.wipelay.ai in Vercel

This guide shows you how to set up your CNAME target domain (`cname.wipelay.ai`) in Vercel so that users can point their custom domains to it.

## Overview

When users connect their custom domains (e.g., `brand.com`), they need to add a CNAME record pointing to YOUR domain. This domain must be configured in Vercel to accept traffic from their custom domains.

**Flow:**
```
User's Domain (brand.com)
    ↓ CNAME record points to
cname.wipelay.ai (your CNAME target)
    ↓ Handled by
Your Vercel Project
```

---

## Step 1: Add cname.wipelay.ai to Your Vercel Project

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to your Vercel project:**
   - Visit: https://vercel.com/[your-username]/[project-name]
   - Click on **"Settings"**

2. **Navigate to Domains:**
   - Click **"Domains"** in the left sidebar

3. **Add the CNAME domain:**
   - In the "Add Domain" field, enter: `cname.wipelay.ai`
   - Click **"Add"**

4. **Vercel will show DNS configuration:**
   - Copy the DNS instructions provided
   - You'll need to configure this in your DNS provider (where wipelay.ai is hosted)

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Add the domain
vercel domains add cname.wipelay.ai
```

---

## Step 2: Configure DNS for wipelay.ai

Now you need to point `cname.wipelay.ai` to Vercel.

### Find Your DNS Provider

Go to where you registered `wipelay.ai` (e.g., Namecheap, GoDaddy, Cloudflare, etc.)

### Add CNAME Record

Add the following DNS record:

| Type  | Name  | Value                                    | TTL  |
|-------|-------|------------------------------------------|------|
| CNAME | cname | cname.vercel-dns.com                     | 3600 |

**Or if your DNS provider requires full domain:**

| Type  | Name               | Value                     | TTL  |
|-------|--------------------|---------------------------|------|
| CNAME | cname.wipelay.ai  | cname.vercel-dns.com      | 3600 |

**Note:** Some providers automatically append `.wipelay.ai`, so use `cname` as the name.

---

## Step 3: Verify Configuration in Vercel

### Check Domain Status

1. **In Vercel Dashboard:**
   - Go to Project → Settings → Domains
   - Look for `cname.wipelay.ai`
   - Status should show **"Valid Configuration"** (may take 5-10 minutes)

2. **Via CLI:**
   ```bash
   vercel domains ls
   # Should show cname.wipelay.ai with "Valid Configuration"
   ```

### Check DNS Propagation

```bash
# Check if CNAME is resolving
dig cname.wipelay.ai CNAME

# Should return:
# cname.wipelay.ai. 3600 IN CNAME cname.vercel-dns.com.
```

**Online Tools:**
- https://dnschecker.org
- https://www.whatsmydns.net

---

## Step 4: Update Your Application Config

Make sure your app configuration uses the correct CNAME target:

```typescript
// web-app/config/domains.ts
export const cnameTarget = "cname.wipelay.ai";
```

This is already done if you followed the installation guide!

---

## Step 5: Test the Setup

### Test with curl

```bash
# Test if the CNAME is working
curl -I https://cname.wipelay.ai

# Should return 200 OK with your app's response
```

### Test with a Real Custom Domain

1. **Add a test subdomain to wipelay.ai:**
   - Add DNS record: `test.wipelay.ai` CNAME → `cname.wipelay.ai`
   - Wait for DNS propagation (2-5 minutes)

2. **Add to your app:**
   - Login to your app with a Pro/Lifetime account
   - Go to Settings → Branding
   - Add domain: `test.wipelay.ai`
   - Click "Verify Domain"
   - Enable it

3. **Test access:**
   ```bash
   # Should work
   https://test.wipelay.ai/share/[some-share-id]
   ```

---

## Common Issues & Solutions

### Issue: "Domain is not configured"

**Solution:**
- Wait 5-10 minutes for DNS propagation
- Verify CNAME record is correct: `cname.wipelay.ai` → `cname.vercel-dns.com`
- Check DNS with: `dig cname.wipelay.ai CNAME`

---

### Issue: "Invalid Configuration"

**Solution:**
1. Check if domain is added to Vercel project
2. Verify DNS record is correct
3. Make sure you're not using the project's default vercel.app domain

---

### Issue: "SSL Certificate Error"

**Solution:**
- Vercel automatically provisions SSL certificates
- Wait 5-10 minutes after DNS configuration
- If still failing, check Vercel Dashboard for SSL status

---

### Issue: User's Custom Domain Not Working

**Checklist:**
1. ✅ `cname.wipelay.ai` is added to Vercel project
2. ✅ `cname.wipelay.ai` CNAME points to `cname.vercel-dns.com`
3. ✅ DNS is propagated (use dnschecker.org)
4. ✅ User's domain CNAME points to `cname.wipelay.ai` (NOT `cname.vercel-dns.com`)
5. ✅ User clicked "Verify Domain" in your app
6. ✅ User enabled the domain (toggle ON)

---

## Architecture

```
┌─────────────────────┐
│ User's Custom Domain │
│   brand.com         │
└──────────┬──────────┘
           │ CNAME record
           ▼
┌─────────────────────┐
│  cname.wipelay.ai   │ ← Configured in Vercel
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Vercel Project     │
│  (WebClarity)       │
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  proxy.ts           │ ← Checks hostname
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Database Query     │ ← Finds organization
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Rewrite to         │
│  /{orgSlug}{path}   │
└─────────────────────┘
```

---

## Security Considerations

1. **Forbidden Domains:** Update the forbidden domains list to prevent conflicts:
   ```typescript
   // web-app/config/domains.ts
   export const forbiddenDomains = [
     "localhost",
     "vercel.app",
     "wipelay.ai",
     "cname.wipelay.ai"  // Don't allow CNAME itself as custom domain
   ];
   ```

2. **Domain Validation:** The app validates domains before adding them to Vercel

3. **Plan Access:** Only Pro/Lifetime users can connect custom domains

---

## Monitoring

### Check Active Custom Domains

```sql
-- In your database
SELECT 
  id,
  name,
  customDomain,
  customDomainEnabled,
  domainVerifiedAt
FROM organization
WHERE customDomain IS NOT NULL;
```

### Check Vercel Domains

```bash
# List all domains in your Vercel project
vercel domains ls

# Should show:
# - cname.wipelay.ai (your CNAME target)
# - All user custom domains (e.g., brand.com, app.company.com)
```

---

## Maintenance

### Adding a New Custom Domain for Testing

```bash
# Add test domain
test.wipelay.ai CNAME → cname.wipelay.ai

# Then test in your app
```

### Removing Old Domains

```bash
# Via Vercel Dashboard
# Go to Settings → Domains → Click domain → Remove

# Via CLI
vercel domains rm old-domain.com
```

### Rotating CNAME Target

If you ever need to change the CNAME target:

1. Add new CNAME target to Vercel
2. Update app config: `config/domains.ts`
3. Notify users to update their DNS records
4. Wait for transition period
5. Remove old CNAME target

---

## Summary Checklist

Before going live:
- [ ] `cname.wipelay.ai` added to Vercel project
- [ ] DNS configured: `cname.wipelay.ai` CNAME → `cname.vercel-dns.com`
- [ ] DNS propagated (check with dig or online tools)
- [ ] SSL certificate issued by Vercel
- [ ] Tested with a test domain
- [ ] App config updated with correct CNAME target
- [ ] Forbidden domains list updated

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs/concepts/projects/custom-domains
- **DNS Checker:** https://dnschecker.org
- **Your App Config:** `web-app/config/domains.ts`

---

## Next Steps

After setting up `cname.wipelay.ai`:
1. ✅ Users can now connect their custom domains
2. ✅ Test the complete flow with a real domain
3. ✅ Monitor Vercel Dashboard for any issues
4. ✅ Check database for domain verification status

Good luck! 🚀


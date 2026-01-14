# Testing Custom Domains - Quick Guide

## TL;DR - You Can't Test on Localhost

❌ **Localhost (`http://localhost:3000`) CANNOT test custom domains properly**

Why? Because:
- Custom domains need real DNS records
- SSL certificates can't be issued for localhost
- CNAME records can't point to localhost

## Recommended Testing Approach

### Option 1: Deploy to Vercel Preview (EASIEST) ⭐

This is the best way to test before going to production:

```bash
# 1. Push your code
git add .
git commit -m "Add custom domain feature"
git push

# 2. Vercel creates preview URL automatically:
# Example: https://web-clarity-abc123.vercel.app

# 3. Set environment variables in Vercel:
# Go to: Vercel Dashboard → Project → Settings → Environment Variables
# Add for "Preview" environment:
VERCEL_AUTH_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id

# 4. Redeploy to apply env variables:
# Go to: Deployments → Click "..." → Redeploy

# 5. Now test with a real domain you own!
```

**Pros:**
- ✅ Real HTTPS/SSL
- ✅ Real DNS
- ✅ Closest to production
- ✅ No local setup needed

**Cons:**
- ❌ Need to push code to test changes
- ❌ Need a test domain

---

### Option 2: Test on Production (RECOMMENDED FOR MVP)

For MVP/initial launch, just test directly on production:

```bash
# 1. Deploy to production
git push origin main

# 2. Set environment variables in Vercel (Production):
VERCEL_AUTH_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id

# 3. Test with a real test domain:
# Example: test.yourdomain.com
```

**Why this is OK:**
- ✅ Feature is well-tested (routing, API, UI)
- ✅ No critical bugs expected
- ✅ Easy to rollback if issues occur
- ✅ Users won't break anything

---

### Option 3: Use ngrok (If you must test locally)

Only use this if you need to debug locally:

```bash
# 1. Install ngrok
brew install ngrok  # macOS
# OR download from: https://ngrok.com

# 2. Start your app
pnpm dev

# 3. In another terminal:
ngrok http 3000

# 4. You'll get a URL like:
# https://abc123.ngrok.io

# 5. Update your .env.local:
NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io

# 6. Restart your app:
pnpm dev

# 7. Configure test domain:
# Add CNAME: test.yourdomain.com → cname.yourdomain.com
# Then use the ngrok URL in your app
```

**Limitations:**
- ❌ Free tier: Limited sessions
- ❌ URL changes every time you restart
- ❌ Need to update DNS each time
- ❌ More complex setup

---

## What You CAN Test Locally

Even without real domains, you can test:

### 1. UI Components

```bash
# Test the Branding settings page:
http://localhost:3000/{workspace}/settings/branding

# Verify:
✅ Input field for domain
✅ Connect button works
✅ Shows CNAME instructions
✅ Verify button appears
✅ Toggle switch works
✅ Remove button works
```

### 2. API Endpoints

Use Postman or curl to test:

```bash
# Connect domain
curl -X POST http://localhost:3000/api/trpc/domains.connectCustomDomain \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org_xxx",
    "domain": "test.example.com"
  }'

# Get domain status
curl http://localhost:3000/api/trpc/domains.getCustomDomainStatus?organizationId=org_xxx

# Verify domain
curl -X POST http://localhost:3000/api/trpc/domains.verifyCustomDomain \
  -d '{"organizationId": "org_xxx"}'

# Toggle domain
curl -X POST http://localhost:3000/api/trpc/domains.toggleCustomDomain \
  -d '{"organizationId": "org_xxx", "enabled": true}'

# Remove domain
curl -X POST http://localhost:3000/api/trpc/domains.removeCustomDomain \
  -d '{"organizationId": "org_xxx"}'
```

### 3. Database Updates

Check if database is updated correctly:

```sql
-- Check if domain is saved
SELECT 
  id, 
  name, 
  customDomain, 
  customDomainEnabled,
  domainConfiguredAt,
  domainVerifiedAt
FROM organization
WHERE id = 'your_org_id';
```

### 4. Plan Access

Test plan-based restrictions:

```bash
# 1. Create test user with Free plan
# 2. Try to access branding settings
# Expected: Should see upgrade message

# 3. Upgrade to Pro plan
# 4. Try again
# Expected: Should see domain input
```

---

## Production Testing Checklist

When you deploy to production, test in this order:

### Phase 1: Setup (Do Once)

```bash
✅ Deploy to production
✅ Set environment variables in Vercel
✅ Run database migration
✅ Verify app loads correctly
```

### Phase 2: Connect Domain

```bash
✅ Create Pro/Lifetime test account
✅ Go to: /{workspace}/settings/branding
✅ Enter test domain: test.yourdomain.com
✅ Click "Connect Domain"
✅ Verify: Shows CNAME instructions
✅ Verify: Shows "Pending Verification" status
```

### Phase 3: DNS Configuration

```bash
✅ Go to your DNS provider
✅ Add CNAME record:
   Type: CNAME
   Name: test
   Value: cname.yourdomain.com
   TTL: 3600
✅ Wait 2-5 minutes for propagation
✅ Verify with: dig test.yourdomain.com CNAME
```

### Phase 4: Verification

```bash
✅ Click "Verify Domain" in app
✅ Verify: Status changes to "Verified"
✅ Verify: Toggle switch is enabled
✅ Verify: Timestamp shows verification time
```

### Phase 5: Activation

```bash
✅ Toggle "Enable Custom Domain" ON
✅ Verify: Toggle stays ON
✅ Verify: Status shows "Active"
```

### Phase 6: Share Creation

```bash
✅ Create a new capture share
✅ Verify: Share URL uses custom domain
   Expected: https://test.yourdomain.com/share/abc123
   NOT: https://your-app.vercel.app/share/abc123
   
✅ Create style guide share
✅ Verify: Uses custom domain

✅ Create heading structure share
✅ Verify: Uses custom domain
```

### Phase 7: Redirects

```bash
✅ Access share via app domain:
   https://your-app.vercel.app/share/abc123
✅ Verify: Redirects to custom domain:
   https://test.yourdomain.com/share/abc123

✅ Access share directly via custom domain:
   https://test.yourdomain.com/share/abc123
✅ Verify: Loads correctly (no redirect loop)
```

### Phase 8: Disable/Remove

```bash
✅ Toggle custom domain OFF
✅ Verify: Custom domain shows 404 or redirects
✅ Verify: App domain still works

✅ Toggle back ON
✅ Verify: Custom domain works again

✅ Click "Remove Domain"
✅ Verify: Domain removed from Vercel
✅ Verify: Settings show "Connect Domain" again
✅ Verify: All shares now use app domain
```

### Phase 9: Plan Downgrade

```bash
✅ In database, change plan to "free"
✅ Try accessing via custom domain
✅ Verify: Shows 404 or redirects to app domain
✅ Try accessing branding settings
✅ Verify: Shows upgrade message
✅ Change plan back to "pro"
✅ Verify: Everything works again
```

---

## Quick Debug Commands

```bash
# Check if domain resolves
dig test.yourdomain.com

# Check if CNAME is correct
dig test.yourdomain.com CNAME

# Check DNS propagation
# Visit: https://dnschecker.org
# Enter: test.yourdomain.com

# Check if Vercel sees the domain
# Visit: Vercel Dashboard → Domains
# Look for your custom domain

# Check database
psql $DATABASE_URL -c "SELECT customDomain, customDomainEnabled FROM organization WHERE customDomain IS NOT NULL;"

# Test proxy routing (in browser console)
fetch('https://test.yourdomain.com/api/health')
  .then(r => r.text())
  .then(console.log)
```

---

## Common Issues & Quick Fixes

### Issue: Domain not verifying

```bash
# Wait 5 minutes for DNS propagation
# Check with: dig test.yourdomain.com CNAME
# Verify CNAME value matches: cname.yourdomain.com
```

### Issue: Custom domain shows 404

```bash
# Check if enabled in database:
SELECT customDomainEnabled FROM organization WHERE customDomain = 'test.yourdomain.com';

# Should be: true
# If false, toggle ON in settings
```

### Issue: Shares still use app domain

```bash
# Check browser cache - hard refresh: Cmd+Shift+R
# Create NEW share (not existing one)
# Verify domain is enabled and verified
```

### Issue: Redirect loop

```bash
# Clear browser cookies
# Check domain configuration in database
# Verify proxy.ts logic is correct
```

---

## Summary

**For Local Development:**
- ✅ Test UI components and interactions
- ✅ Test API endpoints with mock data
- ✅ Test database operations
- ❌ Cannot test actual domain resolution/SSL

**For Real Testing:**
- ⭐ Use Vercel Preview deployments (BEST)
- ⭐ Or test directly on production (FINE for MVP)
- 🤔 Use ngrok only if absolutely necessary

**Testing Order:**
1. Connect domain
2. Configure DNS
3. Verify domain
4. Enable domain
5. Test shares
6. Test redirects
7. Test disable/remove

---

Need detailed instructions? See [CUSTOM_DOMAIN_SETUP_GUIDE.md](./CUSTOM_DOMAIN_SETUP_GUIDE.md)


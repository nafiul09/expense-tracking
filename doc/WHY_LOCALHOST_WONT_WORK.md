# Why Custom Domains Don't Work on Localhost

## TL;DR

**Custom domains CANNOT be tested on `localhost:3000` properly.** You MUST test on a live Vercel deployment.

---

## Why You See "Verified" on Localhost

When testing on localhost, you might see the domain showing as "verified" even though:

-   You didn't add the domain to Vercel
-   You didn't configure DNS records
-   Environment variables might not be set

### What's Happening:

1. **Environment Variables Missing:**

    - `VERCEL_AUTH_TOKEN` - Not set in `.env.local`
    - `VERCEL_PROJECT_ID` - Not set in `.env.local`
    - `VERCEL_TEAM_ID` - Not set in `.env.local`

2. **API Calls Fail:**

    - When you click "Verify Domain", the backend tries to call Vercel API
    - Without proper credentials, Vercel API returns 401/403 errors
    - Error is caught but might show success toast

3. **Database State:**
    - Domain gets saved to database (because that doesn't require Vercel)
    - But `domainVerifiedAt` should NOT be set unless Vercel says it's verified

---

## What Actually Happens on Localhost

| Action            | What Works                             | What Doesn't Work             |
| ----------------- | -------------------------------------- | ----------------------------- |
| Add domain        | ✅ Saves to database                   | ❌ Not added to Vercel        |
| Verify domain     | ❌ Can't verify (no Vercel connection) | ❌ DNS not checked            |
| Enable domain     | ✅ Toggle works in UI                  | ❌ Domain won't route traffic |
| Access via domain | ❌ Won't work                          | ❌ DNS doesn't point to you   |

---

## Why Localhost Can't Work

### 1. **DNS Records Can't Point to Localhost**

```
User's Domain (brand.com)
    ↓ CNAME record needs to point to
cname.wipelay.ai
    ↓ Which needs to resolve to
Public IP Address (Vercel)
    ❌ NOT localhost:3000
```

You can't add DNS records like:

```
brand.com CNAME → localhost:3000  ❌ Invalid
```

### 2. **SSL Certificates**

Vercel provisions SSL certificates for custom domains. Localhost:

-   Doesn't have SSL (http not https)
-   Can't get SSL certificates from Let's Encrypt
-   Browsers won't trust localhost certificates for custom domains

### 3. **Vercel Domain Management**

Custom domains MUST be added to Vercel project first:

-   Localhost has no connection to Vercel
-   Can't add/verify/remove domains without Vercel API
-   Even with API credentials, domains need to be publicly accessible

### 4. **Hostname Detection**

The `proxy.ts` checks the `hostname` of incoming requests:

```typescript
const hostname = req.nextUrl.hostname; // e.g., "brand.com"
```

On localhost, hostname is always:

-   `localhost` or
-   `127.0.0.1` or
-   Your local network IP

NOT the actual custom domain.

---

## What You Can Test on Localhost

### ✅ UI Components

-   Settings page loads
-   Input field works
-   DNS table displays correctly
-   Buttons work
-   Toasts show
-   Form validation

### ✅ Database Operations

-   Domain saves to database
-   Domain retrieval works
-   Status updates work
-   Timestamps save correctly

### ❌ What You CAN'T Test

-   Actual domain verification
-   DNS resolution
-   SSL certificates
-   Domain routing
-   Custom domain access
-   Vercel domain management

---

## How to Test Properly

### Option 1: Vercel Preview Deployment (Recommended) ⭐

```bash
# 1. Push to a branch
git checkout -b test-custom-domains
git add .
git commit -m "Test custom domain feature"
git push origin test-custom-domains

# 2. Vercel creates preview URL automatically:
# https://web-clarity-abc123.vercel.app

# 3. Add environment variables in Vercel Dashboard:
# Go to: Project → Settings → Environment Variables
# Select: Preview (for preview deployments)
# Add:
VERCEL_AUTH_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
VERCEL_TEAM_ID=your_team_id (if applicable)

# 4. Redeploy the preview to apply env vars

# 5. Now test with a real test domain!
```

### Option 2: Production Deployment

```bash
# 1. Deploy to production
git push origin main

# 2. Add environment variables in Vercel Dashboard:
# Go to: Project → Settings → Environment Variables
# Select: Production
# Add all Vercel credentials

# 3. Redeploy

# 4. Test with real domain
```

### Option 3: ngrok (Limited)

```bash
# 1. Start your app
pnpm dev

# 2. In another terminal
ngrok http 3000

# 3. Update .env.local
NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io

# 4. Restart app
```

**Limitations:**

-   ngrok URL changes on restart
-   Need to update DNS each time
-   Free tier has limits
-   Still can't test full Vercel integration

---

## Setup Checklist for Live Testing

### Before Testing:

-   [ ] Set up `cname.wipelay.ai` in Vercel (see VERCEL_CNAME_SETUP.md)
-   [ ] Add environment variables to Vercel
-   [ ] Deploy to Vercel (preview or production)
-   [ ] Have a test domain ready (e.g., `test.yourdomain.com`)

### Testing Flow:

1. **Deploy to Vercel**

    ```bash
    git push
    ```

2. **Add Test Domain in App**

    - Login to your app (on Vercel URL)
    - Go to Settings → Branding
    - Enter: `test.yourdomain.com`
    - Click "Connect Domain"

3. **Configure DNS**

    ```
    Type:  CNAME
    Name:  test
    Value: cname.wipelay.ai
    TTL:   3600
    ```

4. **Wait 2-5 Minutes**

    - DNS propagation time
    - Check with: `dig test.yourdomain.com CNAME`

5. **Verify in App**

    - Click "Verify Domain" button
    - Should show "Verified" if DNS is correct

6. **Enable Domain**

    - Toggle ON
    - Status: "Active"

7. **Test Access**
    ```bash
    # Should work now
    https://test.yourdomain.com/share/[share-id]
    ```

---

## Common Localhost Confusion

### "Why does it show verified on localhost?"

Because:

1. Environment variables aren't checked until API call
2. API call might fail silently
3. UI might show success even though backend failed
4. Database saves domain regardless of Vercel status

**Solution:** We added checks in the latest update:

-   Backend now checks if `VERCEL_AUTH_TOKEN` and `VERCEL_PROJECT_ID` are set
-   Returns proper error if missing
-   More specific error messages (404, 401, etc.)

### "Can I set environment variables in localhost?"

You CAN set them in `.env.local`:

```bash
VERCEL_AUTH_TOKEN=your_token
VERCEL_PROJECT_ID=your_project_id
```

BUT:

-   Still won't work for actual domain verification
-   DNS won't resolve to localhost
-   SSL won't work
-   Routing won't work

### "Should I skip testing on localhost?"

**For UI/Database:** Test on localhost ✅
**For Domain Verification:** Must test on Vercel ❌

---

## What We Fixed

### Before:

-   Domain auto-verified even without Vercel connection
-   No clear error messages
-   Confusing on localhost

### After (Latest Update):

-   ✅ Backend checks if Vercel credentials are set
-   ✅ Returns clear errors if missing
-   ✅ More specific error codes (404, 401, etc.)
-   ✅ Won't accidentally mark as verified

---

## Summary

| Environment           | Can Test     | Can't Test                 |
| --------------------- | ------------ | -------------------------- |
| **Localhost**         | UI, Database | Verification, DNS, Routing |
| **Vercel Preview**    | Everything   | -                          |
| **Vercel Production** | Everything   | -                          |

**Bottom Line:**

-   ✅ Build UI on localhost
-   ✅ Test database on localhost
-   ❌ DON'T test domain verification on localhost
-   ✅ Deploy to Vercel for real testing

---

## Next Steps

1. ✅ Deploy your app to Vercel
2. ✅ Add environment variables to Vercel Dashboard
3. ✅ Set up `cname.wipelay.ai` (see VERCEL_CNAME_SETUP.md)
4. ✅ Test with a real domain
5. ✅ Follow complete testing checklist (see TESTING_CUSTOM_DOMAINS.md)

---

## Need Help?

-   **Setup:** See [VERCEL_CNAME_SETUP.md](./VERCEL_CNAME_SETUP.md)
-   **Testing:** See [TESTING_CUSTOM_DOMAINS.md](./TESTING_CUSTOM_DOMAINS.md)
-   **Environment:** See [ENV_SETUP.md](./ENV_SETUP.md)

---

## Quick Answer

**Q: Why isn't it working on localhost?**  
**A: It never will. Deploy to Vercel to test properly.**

**Q: Do I need environment variables on localhost?**  
**A: No. They won't help. Deploy to Vercel instead.**

**Q: Can I test ANY part on localhost?**  
**A: Yes - UI and database operations. But not actual domain functionality.**

Good luck! 🚀

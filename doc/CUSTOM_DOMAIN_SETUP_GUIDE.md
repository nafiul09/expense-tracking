# Custom Domain Setup Guide

This guide covers everything you need to know about setting up, testing, and deploying the custom domain feature for WebClarity.

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Local Development Testing](#local-development-testing)
4. [Production Deployment](#production-deployment)
5. [Testing Workflow](#testing-workflow)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The custom domain feature allows Pro and Lifetime plan users to:

-   Connect their own domain (e.g., `brand.com`) to their workspace
-   Share captures, style guides, and heading structures via their custom domain
-   Automatically redirect shares from the app domain to their custom domain

### How It Works

1. **User adds domain** → Domain is added to Vercel via API
2. **DNS Configuration** → User adds CNAME record pointing to your app
3. **Verification** → System verifies the domain is properly configured
4. **Activation** → User enables the domain, and all shares redirect to it

---

## Environment Setup

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Vercel Domain Management (Required for custom domains)
VERCEL_AUTH_TOKEN=your_vercel_auth_token_here
VERCEL_PROJECT_ID=your_vercel_project_id_here
VERCEL_TEAM_ID=your_vercel_team_id_here  # Optional, only if using a team

# Application URL (Required)
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Development
# NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app  # Production

# Database (Already configured)
DATABASE_URL=your_neon_database_url
```

### Getting Vercel Credentials

#### 1. **VERCEL_AUTH_TOKEN**

```bash
# Visit: https://vercel.com/account/tokens
# Click "Create Token"
# Name: "WebClarity Custom Domains"
# Scope: Full Account (or specific projects)
# Expiration: No Expiration (or set as needed)
```

#### 2. **VERCEL_PROJECT_ID**

```bash
# Method 1: From Vercel Dashboard
# Go to: https://vercel.com/[your-username]/[project-name]/settings
# Look for "Project ID" in the General settings

# Method 2: Using Vercel CLI
vercel project ls
# Find your project and copy the ID
```

#### 3. **VERCEL_TEAM_ID** (Optional)

```bash
# Only needed if your project is under a Vercel Team
# Go to: https://vercel.com/teams/[team-slug]/settings
# Copy the Team ID from the URL or settings page
```

---

## Local Development Testing

### ⚠️ Important: Localhost Limitations

**You CANNOT test custom domains directly on `localhost:3000`** because:

-   Custom domains require public DNS records
-   SSL certificates cannot be issued for localhost
-   CNAME records cannot point to localhost

### Testing Strategies

#### Option 1: Use Vercel Preview Deployments (Recommended)

This is the easiest and most reliable method:

```bash
# 1. Deploy to Vercel preview
git add .
git commit -m "Add custom domain feature"
git push

# 2. Vercel will create a preview URL like:
# https://web-clarity-xyz123.vercel.app

# 3. Update your environment variables in Vercel:
# Go to: Project Settings → Environment Variables
# Add: VERCEL_AUTH_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID

# 4. Test with a real domain:
# - Use a test domain you own (e.g., test.yourdomain.com)
# - Add CNAME: test.yourdomain.com → cname.yourdomain.com
# - Configure in the app
```

#### Option 2: Use ngrok for Local Testing

If you need to test locally before deploying:

```bash
# 1. Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com

# 2. Start your app
pnpm dev

# 3. In another terminal, expose it:
ngrok http 3000

# 4. ngrok will give you a public URL like:
# https://abc123.ngrok.io

# 5. Update NEXT_PUBLIC_SITE_URL:
NEXT_PUBLIC_SITE_URL=https://abc123.ngrok.io

# 6. Now you can test with a real domain
```

**Limitations of ngrok:**

-   Free tier has session limits
-   URL changes on restart
-   Requires manual CNAME updates each time

#### Option 3: Hosts File (Limited Testing)

For testing the routing logic only (not full domain setup):

```bash
# 1. Edit your hosts file
sudo nano /etc/hosts  # macOS/Linux
# notepad C:\Windows\System32\drivers\etc\hosts  # Windows

# 2. Add this line:
127.0.0.1 test.customdomain.com

# 3. Access http://test.customdomain.com:3000
# (You'll need to manually add the port)
```

**Limitations:**

-   Cannot test Vercel domain verification
-   Cannot test SSL/HTTPS
-   Cannot test CNAME records
-   Only tests routing logic

---

## Production Deployment

### Step 1: Deploy to Vercel

```bash
# 1. Push to main branch
git push origin main

# 2. Vercel will auto-deploy to production
# URL: https://your-app.vercel.app
```

### Step 2: Configure Environment Variables

In Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add these variables for **Production**:
    ```
    VERCEL_AUTH_TOKEN=your_token
    VERCEL_PROJECT_ID=your_project_id
    VERCEL_TEAM_ID=your_team_id (if applicable)
    NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app
    ```

### Step 3: Set Up Your CNAME Target

1. **Choose your CNAME target domain:**

    ```
    cname.yourdomain.com  (or cname.your-app.vercel.app)
    ```

2. **Add it to Vercel:**

    - Go to Project Settings → Domains
    - Add `cname.yourdomain.com`
    - Configure DNS to point to Vercel

3. **Update the config:**
    ```typescript
    // web-app/config/domains.ts
    export const cnameTarget = "cname.yourdomain.com";
    ```

### Step 4: Run Database Migration

```bash
# On your local machine (connected to production DB)
cd web-app
pnpm prisma migrate deploy

# Or use Neon's Query Editor to run the migration SQL:
# See: web-app/packages/database/prisma/migrations/20251219001144_add_custom_domain_fields/migration.sql
```

---

## Testing Workflow

### Complete Testing Checklist

#### 1. **Connect a Custom Domain**

```bash
# Test domain setup:
1. Log in to your app (Pro or Lifetime plan)
2. Go to: /{workspace-slug}/settings/branding
3. Enter a test domain: test.yourdomain.com
4. Click "Connect Domain"

Expected Result:
✅ Domain added to Vercel
✅ Shows CNAME configuration instructions
✅ Status: "Pending Verification"
```

#### 2. **Configure DNS**

```bash
# Add CNAME record in your DNS provider:
Type:  CNAME
Name:  test (or test.yourdomain.com)
Value: cname.yourdomain.com
TTL:   Auto or 3600
```

#### 3. **Verify Domain**

```bash
# In the app:
1. Wait 1-5 minutes for DNS propagation
2. Click "Verify Domain"

Expected Result:
✅ Status changes to "Verified"
✅ Toggle switch becomes enabled
```

#### 4. **Enable Custom Domain**

```bash
# In the app:
1. Toggle the "Enable Custom Domain" switch ON

Expected Result:
✅ Toggle is ON
✅ Status shows "Active"
```

#### 5. **Test Share Creation**

```bash
# Create a new share:
1. Go to captures, style guides, or heading structure
2. Create a new share

Expected Result:
✅ Share URL uses custom domain: https://test.yourdomain.com/share/[shareId]
✅ NOT the app domain
```

#### 6. **Test Domain Redirection**

```bash
# Access existing share via app domain:
1. Go to: https://your-app.vercel.app/share/[shareId]

Expected Result:
✅ Automatically redirects to: https://test.yourdomain.com/share/[shareId]
```

#### 7. **Test Domain Disabling**

```bash
# Disable the domain:
1. Toggle OFF in settings

Expected Result:
✅ Custom domain access stops working
✅ App domain still works: https://your-app.vercel.app/share/[shareId]
✅ Custom domain redirects back to app domain
```

#### 8. **Test Plan Downgrade**

```bash
# Simulate plan downgrade:
1. In database, change user's plan to "free"
2. Try accessing via custom domain

Expected Result:
✅ Custom domain shows 404 or redirects to app domain
✅ App domain still works
```

#### 9. **Test Domain Removal**

```bash
# Remove the domain:
1. Click "Remove Domain"
2. Confirm

Expected Result:
✅ Domain removed from Vercel
✅ Settings show "Connect Domain" again
✅ All shares now use app domain
```

---

## Troubleshooting

### Domain Not Verifying

**Issue:** Domain stays in "Pending Verification" status

**Solutions:**

1. **Check DNS propagation:**

    ```bash
    # Use online tools:
    # - https://dnschecker.org
    # - https://www.whatsmydns.net

    # Or use dig command:
    dig test.yourdomain.com CNAME
    ```

2. **Verify CNAME target:**

    ```bash
    # Should return: cname.yourdomain.com
    # Not: your-app.vercel.app (wrong!)
    ```

3. **Check Vercel domain status:**

    ```bash
    # Go to Vercel Dashboard → Domains
    # Look for error messages
    ```

4. **Try TXT record verification:**
    ```bash
    # If CNAME fails, Vercel may ask for TXT record
    # Add the TXT record provided by Vercel
    ```

---

### Custom Domain Not Loading

**Issue:** Visiting custom domain shows error or doesn't load

**Solutions:**

1. **Check domain is enabled:**

    - Toggle must be ON in settings
    - Status must show "Active"

2. **Check proxy.ts:**

    ```bash
    # Verify custom domain logic is working:
    # Check logs for domain detection
    ```

3. **Check SSL certificate:**

    ```bash
    # Vercel should auto-provision SSL
    # Wait 5-10 minutes after DNS configuration
    ```

4. **Check plan access:**
    ```bash
    # User must have Pro or Lifetime plan
    # Check in database or admin panel
    ```

---

### Shares Not Using Custom Domain

**Issue:** New shares still use app domain instead of custom domain

**Solutions:**

1. **Verify domain is enabled:**

    ```bash
    # Check in settings: Toggle must be ON
    ```

2. **Check database:**

    ```sql
    -- Verify in database:
    SELECT customDomain, customDomainEnabled
    FROM organization
    WHERE id = 'org_id';

    -- Should show:
    -- customDomain: 'test.yourdomain.com'
    -- customDomainEnabled: true
    ```

3. **Clear cache:**
    ```bash
    # Hard refresh browser: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
    ```

---

### Redirect Loop Issues

**Issue:** Page keeps redirecting between domains

**Solutions:**

1. **Check browser console** for errors
2. **Clear browser cookies and cache**
3. **Verify domain configuration** in database
4. **Check proxy.ts logic** for conditional loops

---

## Configuration Reference

### Plan-Based Access

```typescript
// web-app/config/index.ts
export const config = {
	plans: {
		free: {
			limits: {
				customDomain: false, // ❌ No custom domain
			},
		},
		pro: {
			limits: {
				customDomain: true, // ✅ Custom domain allowed
			},
		},
		lifetime: {
			limits: {
				customDomain: true, // ✅ Custom domain allowed
			},
		},
	},
};
```

### Domain Configuration

```typescript
// web-app/config/domains.ts
export const cnameTarget = "cname.yourdomain.com";

export const forbiddenDomains = [
	"localhost",
	"vercel.app",
	"yourdomain.com", // Your main app domain
];
```

---

## Security Considerations

1. **Rate Limiting:** Consider adding rate limits to domain API endpoints
2. **Domain Validation:** System validates domains against forbidden list
3. **Plan Enforcement:** Custom domain access is checked on every request
4. **Automatic Cleanup:** Domains are disabled when plans downgrade

---

## Need Help?

If you encounter issues not covered here:

1. Check the browser console for errors
2. Check server logs for proxy errors
3. Verify all environment variables are set
4. Test with `curl` to see raw responses:
    ```bash
    curl -I https://test.yourdomain.com/share/[shareId]
    ```

---

## Summary

✅ **Local Testing:** Use Vercel Preview or ngrok
✅ **Production Setup:** Configure environment variables in Vercel
✅ **DNS Configuration:** Add CNAME pointing to your CNAME target
✅ **Verification:** Use "Verify Domain" button in app
✅ **Testing:** Follow the complete testing checklist above

# Environment Variables Setup

## Quick Start

Copy this to your `.env.local` file:

```bash
# ==========================================
# DATABASE
# ==========================================
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# ==========================================
# AUTHENTICATION
# ==========================================
BETTER_AUTH_SECRET="your_secret_key_here"  # Generate: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"    # Update for production

# ==========================================
# APPLICATION
# ==========================================
NEXT_PUBLIC_SITE_URL="http://localhost:3000"  # Your app URL

# ==========================================
# CUSTOM DOMAINS (Required for custom domain feature)
# ==========================================
VERCEL_AUTH_TOKEN="your_vercel_token_here"
VERCEL_PROJECT_ID="prj_xxxxxxxxxxxxxxxxxxxx"
VERCEL_TEAM_ID="team_xxxxxxxxxxxxxxxxxxxx"  # Optional

# ==========================================
# PAYMENTS (Optional)
# ==========================================
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxx"

# ==========================================
# EMAIL (Optional)
# ==========================================
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
```

---

## How to Get Each Value

### 1. DATABASE_URL

Your Neon (or other PostgreSQL) database connection string.

**From Neon:**

1. Go to https://console.neon.tech
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string

---

### 2. BETTER_AUTH_SECRET

A secure random string for authentication.

**Generate it:**

```bash
openssl rand -base64 32
```

---

### 3. VERCEL_AUTH_TOKEN

Personal Access Token for Vercel API.

**Steps:**

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name: `WebClarity Custom Domains`
4. Scope: **Full Account** (or select specific projects)
5. Expiration: **No Expiration** (or set as needed)
6. Click **"Create"**
7. Copy the token immediately (you won't see it again!)

---

### 4. VERCEL_PROJECT_ID

Your Vercel project identifier.

**Method 1 - From Dashboard:**

1. Go to https://vercel.com/[username]/[project-name]/settings
2. Scroll to **"General"** section
3. Find **"Project ID"**
4. Copy it (format: `prj_xxxxxxxxxxxxxxxxxxxx`)

**Method 2 - Using Vercel CLI:**

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Login
vercel login

# List projects
vercel project ls

# Find your project and copy the ID
```

---

### 5. VERCEL_TEAM_ID (Optional)

Only needed if your project is under a Vercel Team account.

**Steps:**

1. Go to https://vercel.com/teams/[team-slug]/settings
2. The Team ID is in the URL or under **"General"**
3. Format: `team_xxxxxxxxxxxxxxxxxxxx`

**Skip this if:**

-   You're using a personal Vercel account (not a team)
-   Your project is not under a team

---

## Environment-Specific Configuration

### Local Development (.env.local)

```bash
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

### Production (Vercel Dashboard)

1. Go to your Vercel project
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable for **Production** environment:

```bash
BETTER_AUTH_URL="https://your-app.vercel.app"
NEXT_PUBLIC_SITE_URL="https://your-app.vercel.app"
VERCEL_AUTH_TOKEN="your_token"
VERCEL_PROJECT_ID="prj_xxx"
VERCEL_TEAM_ID="team_xxx"  # If applicable
DATABASE_URL="your_production_db_url"
# ... other variables
```

---

## Verification Checklist

After setting up environment variables:

```bash
# 1. Check if .env.local exists
ls -la .env.local

# 2. Restart your development server
pnpm dev

# 3. Check if variables are loaded (check console or logs)
# Should not see "undefined" for critical variables

# 4. Test custom domain API (if applicable)
# Go to: http://localhost:3000/[workspace]/settings/branding
# Try connecting a domain
```

---

## Security Best Practices

✅ **DO:**

-   Keep `.env.local` in `.gitignore`
-   Use different values for development/production
-   Rotate tokens periodically
-   Use `NEXT_PUBLIC_` prefix only for client-side variables

❌ **DON'T:**

-   Commit `.env.local` to version control
-   Share your tokens publicly
-   Use production credentials in development
-   Expose secret keys to the client

---

## Troubleshooting

### "VERCEL_AUTH_TOKEN is not defined"

**Solution:**

1. Verify the variable is in `.env.local`
2. Restart your dev server (`pnpm dev`)
3. Check for typos in the variable name

### "Invalid Vercel Project ID"

**Solution:**

1. Ensure the ID starts with `prj_`
2. Copy the exact ID from Vercel Dashboard
3. Check you're using the correct project

### Custom domains not working

**Solution:**

1. Verify all three variables are set: `VERCEL_AUTH_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`
2. Check token has correct permissions
3. See CUSTOM_DOMAIN_SETUP_GUIDE.md for detailed troubleshooting

---

## Example .env.local (Complete)

```bash
# Database
DATABASE_URL="postgresql://username:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth
BETTER_AUTH_SECRET="Kj4mF9nR2pL7sW1xZ6vB3yT8qH5gD0uN"
BETTER_AUTH_URL="http://localhost:3000"

# App
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Vercel (for custom domains)
VERCEL_AUTH_TOKEN="AbCdEfGh123456789"
VERCEL_PROJECT_ID="prj_AbCdEfGh123456789"
VERCEL_TEAM_ID="team_XyZ123456789"

# Stripe (optional)
STRIPE_SECRET_KEY="sk_test_51AbCdEfGh..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_51AbCdEfGh..."
STRIPE_WEBHOOK_SECRET="whsec_AbCdEfGh..."

# Email (optional)
RESEND_API_KEY="re_AbCdEfGh123456789"
```

---

## Next Steps

After setting up environment variables:

1. ✅ Run database migrations: `pnpm prisma migrate deploy`
2. ✅ Start the development server: `pnpm dev`
3. ✅ Follow the [CUSTOM_DOMAIN_SETUP_GUIDE.md](./CUSTOM_DOMAIN_SETUP_GUIDE.md) for testing

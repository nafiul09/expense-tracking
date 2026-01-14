# Custom Domain Feature - Quick Start

## 🚀 3-Step Setup

### Step 1: Run Migration
```bash
cd packages/database
pnpm prisma migrate deploy
```

### Step 2: Add Environment Variables
Add to your `.env.local`:
```bash
VERCEL_AUTH_TOKEN=your_token_here
VERCEL_PROJECT_ID=your_project_id_here
VERCEL_TEAM_ID=your_team_id_here  # Optional
```

### Step 3: Install Dependencies & Restart
```bash
pnpm install
pnpm dev
```

---

## 📋 Where to Get Tokens

| Variable | Where to Get |
|----------|-------------|
| `VERCEL_AUTH_TOKEN` | https://vercel.com/account/tokens |
| `VERCEL_PROJECT_ID` | Vercel Project Settings > General |
| `VERCEL_TEAM_ID` | Vercel Team Settings (optional) |

---

## ✅ How to Test

1. Start dev server: `pnpm dev`
2. Go to: `/{organizationSlug}/settings/branding`
3. Enter a test domain
4. Follow DNS instructions
5. Click "Verify Domain"

---

## 📚 Full Documentation

- **Setup Guide**: `CUSTOM_DOMAIN_SETUP.md`
- **Environment Variables**: `ENV_VARIABLES_GUIDE.md`
- **Migration File**: `packages/database/prisma/migrations/20251219001144_add_custom_domain_fields/migration.sql`

---

## 🎯 What Changed

✅ Database: Added custom domain fields to `organization` table  
✅ API: New `/domains` endpoints for CRUD operations  
✅ Routing: Middleware handles custom domain routing  
✅ UI: New "Branding" section in settings  
✅ Shares: Auto-use custom domain when configured  
✅ Plans: Pro/Lifetime/Enterprise get custom domains  

---

## 🔧 Troubleshooting

**Domain not verifying?**
- Wait 5-15 min for DNS propagation
- Check CNAME with: `dig yourdomain.com CNAME`

**Can't connect domain?**
- Verify tokens are correct
- Check user has Pro+ plan
- Look at server logs

**Middleware not routing?**
- Verify migration ran successfully
- Check domain is enabled in database
- Restart dev server

---

**Need help? Check `CUSTOM_DOMAIN_SETUP.md` for detailed guide.**


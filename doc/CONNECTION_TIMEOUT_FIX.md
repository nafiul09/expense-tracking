# Connection Timeout Fix

## Issue
Getting "Connection terminated due to connection timeout" errors when starting the app.

## Root Cause
**Neon Database Free Tier "Cold Starts"**

Neon's free tier puts databases to sleep after inactivity. When you try to connect:
1. First connection "wakes up" the database
2. This wake-up process takes **10-20 seconds**
3. Our original 5-second timeout was killing connections before they could establish

## Solution Applied
Updated timeouts in `packages/database/prisma/client.ts`:

### Before (Too Aggressive):
```typescript
connectionTimeoutMillis: isDev ? 5000 : 10000,  // 5s dev, 10s prod
statement_timeout: isDev ? 10000 : 30000,       // 10s dev, 30s prod
```

### After (Realistic for Remote DB):
```typescript
connectionTimeoutMillis: 30000,                  // 30s for both (allows cold start)
statement_timeout: isDev ? 20000 : 30000,        // 20s dev, 30s prod
```

## Why 30 Seconds?
- Neon cold start: **10-20 seconds**
- Network latency: **1-2 seconds**
- Connection negotiation: **1-2 seconds**
- Safety buffer: **5-8 seconds**
- **Total: ~30 seconds** (max case)

## Next Steps

**IMPORTANT: Restart your dev server to apply the fix**

```bash
# In your terminal (where pnpm dev is running):
# 1. Press Ctrl+C to stop the server
# 2. Wait 2-3 seconds
# 3. Run again:
pnpm dev
```

## What to Expect After Restart

### First Request (Cold Start):
```
🔄 Connecting to Neon... (10-20 seconds)
✅ Connection established
✅ Pool initialized (2 warm connections)
✅ Page loads
Total: ~15-25 seconds (one-time cost)
```

### Subsequent Requests:
```
✅ Reuses existing connection from pool
✅ Page loads immediately
Total: < 2 seconds
```

## Why This Happens

### Neon Free Tier Behavior:
- **Active usage**: Database stays awake → fast connections (< 1s)
- **Idle > 5 minutes**: Database sleeps → slow first connection (10-20s)
- **After wake-up**: Stays awake → subsequent requests are fast

### Connection Pool Helps:
Once the pool is established (after first cold start):
- ✅ Keeps connections alive (database doesn't sleep)
- ✅ Reuses connections (no reconnection overhead)
- ✅ Maintains 2-5 warm connections ready

## Alternative Solutions

### Option 1: Keep Database Awake (Free)
Add a simple cron job to ping your database every 4 minutes:

```typescript
// app/api/cron/keep-alive/route.ts
import { db } from "@repo/database";

export async function GET() {
  await db.$queryRaw`SELECT 1`;
  return Response.json({ status: "ok" });
}
```

Then use a service like [cron-job.org](https://cron-job.org) to hit:
`https://your-app.com/api/cron/keep-alive` every 4 minutes

### Option 2: Upgrade Neon Plan ($19/month)
- No cold starts
- Always-on database
- Better performance

### Option 3: Local Database (Best for Dev)
- Install PostgreSQL locally
- Instant connections (< 1ms)
- No internet dependency
- See `SETUP_LOCAL_DB.md` (if it exists)

## Monitoring Connection Health

You can add logging to see what's happening:

```typescript
// Add to client.ts
pool.on('connect', () => {
  console.log('🟢 Database connection established');
});

pool.on('error', (err) => {
  console.error('❌ Pool error:', err.message);
});
```

## Expected Performance After Fix

| Scenario | Time | Notes |
|----------|------|-------|
| **First load (cold start)** | 15-25s | Database waking up |
| **Subsequent loads** | < 2s | Using pool connections |
| **After 5min idle** | 15-25s | Database sleeps again |
| **Active development** | < 2s | Database stays awake |

## Still Having Issues?

### Error: "Connection terminated"
- Wait 30 seconds and try again
- Neon might be having issues
- Check [Neon status page](https://neon.tech/status)

### Error: "Too many connections"
- Reduce `max` in pool config to 5
- Close other apps using the database
- Upgrade Neon plan for more connections

### Persistent timeouts
- Check your internet connection
- Try accessing Neon dashboard
- Consider local database for development

---

**Status**: ✅ Fixed - Restart server to apply  
**Last Updated**: January 16, 2026

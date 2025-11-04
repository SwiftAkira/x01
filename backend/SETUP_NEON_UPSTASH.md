# 🚀 Database Setup with Neon + Upstash

Vercel moved databases to the Marketplace! Let's set up Neon (Postgres) and Upstash (Redis).

---

## 🎯 Step 1: Add Neon Postgres

### Via Vercel Dashboard:
1. Go to: https://vercel.com/swiftakiras-projects/backend
2. Click **Storage** tab
3. Click **Neon** (Serverless Postgres)
4. Click **Add Integration**
5. Select **backend** project
6. Click **Install** → **Continue to Neon**
7. **Create New Database** or select existing
8. Name it: `speedlink-db` (or any name)
9. Click **Create** → **Connect to Vercel**

✅ **Done!** Neon will auto-add these env vars:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

---

## 🎯 Step 2: Add Upstash Redis

### Via Vercel Dashboard:
1. Still on **Storage** tab
2. Click **Upstash** (Serverless DB)
3. Click **Add Integration**
4. Select **backend** project
5. Click **Install** → **Continue to Upstash**
6. **Create New Database** or select existing
7. Name it: `speedlink-redis` (or any name)
8. Region: Choose closest to your users
9. Click **Create** → **Connect to Vercel**

✅ **Done!** Upstash will auto-add these env vars:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `REDIS_URL` (might be this one)

---

## 🎯 Step 3: Update Backend Code for Neon

Our backend currently expects `DATABASE_URL`. Let's update it:

### Option A: Update config.ts to use POSTGRES_URL
```typescript
// src/config.ts
export const config = {
  database: {
    url: process.env.POSTGRES_URL || process.env.DATABASE_URL || '',
    // ... rest of config
  }
}
```

### Option B: Add DATABASE_URL env var pointing to POSTGRES_URL
```powershell
# In Vercel Dashboard → Settings → Environment Variables
# Add: DATABASE_URL = (copy value from POSTGRES_URL)
```

**Recommendation: Use Option A** (I can update the code for you)

---

## 🎯 Step 4: Update Backend Code for Upstash Redis

Our backend might expect `REDIS_URL`:

### Check what Upstash provides:
```powershell
vercel env pull .env.local
cat .env.local | Select-String "REDIS|KV"
```

### Update redis.ts if needed:
```typescript
// src/database/redis.ts
const redisUrl = process.env.REDIS_URL || process.env.KV_REST_API_URL;
```

---

## 🎯 Step 5: Set Additional Environment Variables

```powershell
# JWT Secret (CHANGE THIS!)
vercel env add JWT_SECRET production
# Paste: your-super-secret-jwt-key-min-32-chars-random-string-here

# CORS Origins (Your frontend URL)
vercel env add CORS_ORIGINS production
# Paste: https://your-frontend-url.vercel.app

# JWT Expiration
vercel env add JWT_EXPIRES_IN production
# Paste: 15m

# Refresh Token Expiration
vercel env add REFRESH_TOKEN_EXPIRES_IN production
# Paste: 7d

# Node Environment
vercel env add NODE_ENV production
# Paste: production
```

---

## 🎯 Step 6: Initialize Database Schema

### Pull environment variables locally:
```powershell
vercel env pull .env.local
```

### Run migrations:
```powershell
# Install PostgreSQL client (if not installed)
# Or use Neon's web SQL editor

# Option A: Using node-postgres directly
npm install -g ts-node
npx ts-node -e "
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const sql = fs.readFileSync('src/database/schema.sql', 'utf8');
pool.query(sql).then(() => console.log('✅ Schema created!')).catch(console.error);
"

# Option B: Use Neon SQL Editor
# 1. Go to https://console.neon.tech
# 2. Select your database
# 3. Click "SQL Editor"
# 4. Copy contents of src/database/schema.sql
# 5. Paste and run
```

---

## 🎯 Step 7: Redeploy Backend

```powershell
vercel --prod
```

Wait for deployment to complete (~2 minutes)

---

## 🎯 Step 8: Test Backend

```powershell
# Test health endpoint
curl https://backend-qsifbbu2l-swiftakiras-projects.vercel.app/api/v1/health

# Test registration
curl -X POST https://backend-qsifbbu2l-swiftakiras-projects.vercel.app/api/v1/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"Test123456\",\"displayName\":\"Test User\"}'
```

---

## 🎯 Step 9: Update Frontend

```powershell
cd ..\frontend

# Add backend URL
vercel env add VITE_API_URL production
# Paste: https://backend-qsifbbu2l-swiftakiras-projects.vercel.app

# Add WebSocket URL
vercel env add VITE_WS_URL production
# Paste: https://backend-qsifbbu2l-swiftakiras-projects.vercel.app

# Redeploy
vercel --prod
```

---

## 💰 Free Tier Limits

**Neon Free Tier:**
- ✅ 0.5 GB storage
- ✅ 3 GB transfer/month
- ✅ Perfect for MVP!

**Upstash Free Tier:**
- ✅ 10,000 commands/day
- ✅ 256 MB storage
- ✅ Perfect for MVP!

**Total Cost: $0/month** 🎉

---

## 🔧 Troubleshooting

### "Cannot connect to database"
- Check `POSTGRES_URL` in Vercel Dashboard → Settings → Environment Variables
- Make sure Neon integration is connected
- Try redeploying: `vercel --prod`

### "Redis connection failed"
- Check `REDIS_URL` or `KV_REST_API_URL` in env vars
- Make sure Upstash integration is connected
- Update `src/database/redis.ts` to use correct env var name

### "JWT error"
- Make sure `JWT_SECRET` is set
- Must be at least 32 characters
- Run: `vercel env ls` to check

---

## ✅ Checklist

- [ ] Neon Postgres integration added
- [ ] Upstash Redis integration added
- [ ] Backend code updated for POSTGRES_URL
- [ ] JWT_SECRET environment variable set
- [ ] CORS_ORIGINS environment variable set
- [ ] Database schema initialized
- [ ] Backend redeployed
- [ ] Health endpoint returns 200
- [ ] Frontend environment variables updated
- [ ] Frontend redeployed
- [ ] End-to-end test passed

---

**Ready to start?** Complete Steps 1-2 first (Neon + Upstash), then let me know and I'll update the backend code! 🚀

## Vercel Backend Deployment Guide

### ⚠️ Important Note About WebSocket
Vercel Serverless Functions have a **10-second timeout** on the Hobby plan (60s on Pro). This is **NOT ideal for long-running WebSocket connections**.

**Options:**
1. **Use Socket.IO with polling fallback** (works on Vercel but less efficient)
2. **Deploy WebSocket server separately** (Railway/Render - recommended)
3. **Upgrade to Vercel Pro** (60s timeout, still not ideal for WebSockets)

---

## Quick Deploy to Vercel

### 1. Install Vercel CLI
```bash
npm install -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Add Vercel Postgres (Database)
```bash
# Go to your Vercel dashboard
# Project → Storage → Create Database → PostgreSQL
# This will auto-populate environment variables
```

### 4. Add Upstash Redis (Cache)
```bash
# Vercel Dashboard → Integrations → Browse Marketplace
# Search "Upstash" → Add Integration
# Select your project
```

### 5. Set Environment Variables
```bash
cd backend

# Set required variables
vercel env add JWT_SECRET
# Paste your secret when prompted

vercel env add CORS_ORIGINS
# Enter: https://your-frontend.vercel.app

# Database and Redis variables are auto-added by Vercel Postgres and Upstash
```

### 6. Deploy Backend
```bash
# Deploy to production
vercel --prod
```

### 7. Update Frontend Environment
```bash
cd ../frontend

# Update your frontend to point to the backend
vercel env add VITE_API_URL
# Enter: https://your-backend.vercel.app

vercel env add VITE_WS_URL
# For WebSocket: Use polling or deploy separately
# Enter: https://your-backend.vercel.app (will use polling fallback)

# Redeploy frontend with new env vars
vercel --prod
```

---

## Environment Variables Needed

### Backend (.env for local, Vercel Dashboard for production)

```env
# Database (Auto-populated by Vercel Postgres)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=
POSTGRES_USER=
POSTGRES_HOST=
POSTGRES_PASSWORD=
POSTGRES_DATABASE=

# Redis (Auto-populated by Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Application
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# CORS (Your frontend URL)
CORS_ORIGINS=https://your-frontend.vercel.app

# API Configuration
PORT=3000
```

---

## Recommended Architecture for Vercel

Since Vercel has WebSocket limitations, here's the **best architecture**:

```
┌─────────────────────────────────────────────┐
│          VERCEL (Frontend + REST API)       │
├─────────────────────────────────────────────┤
│ ✅ Frontend PWA                             │
│ ✅ REST API (Serverless)                    │
│ ✅ Vercel Postgres                          │
│ ✅ Upstash Redis                            │
└─────────────────────────────────────────────┘
              │
              │ REST API calls only
              │
┌─────────────▼───────────────────────────────┐
│      RAILWAY/RENDER (WebSocket Server)      │
├─────────────────────────────────────────────┤
│ ✅ Real-Time WebSocket Server               │
│ ✅ Connects to same Vercel Postgres         │
│ ✅ Connects to same Upstash Redis           │
│ ✅ Long-running connections supported       │
└─────────────────────────────────────────────┘
```

**Cost:** 
- Vercel: $0-20/month
- Railway WebSocket: $5-15/month
- **Total: ~$10-35/month**

---

## Option 1: REST API Only on Vercel (Simplest)

Deploy just the REST API to Vercel, and we'll add WebSocket later:

```bash
cd backend
vercel --prod
```

**What works:**
- ✅ User authentication
- ✅ Party creation/joining
- ✅ Profile management
- ✅ Alerts API

**What doesn't work:**
- ❌ Real-time location updates (need WebSocket server)

---

## Option 2: Full Stack with Separate WebSocket (Recommended)

### Step 1: Deploy REST API to Vercel
```bash
cd backend
vercel --prod
```

### Step 2: Deploy WebSocket Server to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add Postgres (link to Vercel's database)
# Add Redis (link to Upstash)

# Deploy only the WebSocket server
railway up
```

### Step 3: Configure Frontend
```bash
cd frontend
vercel env add VITE_API_URL
# Enter: https://your-backend.vercel.app

vercel env add VITE_WS_URL
# Enter: https://your-websocket.railway.app

vercel --prod
```

---

## Vercel Project Settings

### Build Settings
- **Framework Preset:** Other
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Root Directory
- Set to `backend` if deploying from monorepo

---

## Testing Your Deployment

### 1. Test REST API
```bash
# Health check
curl https://your-backend.vercel.app/health

# Create user
curl -X POST https://your-backend.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123456"}'
```

### 2. Test from Frontend
- Open your frontend: https://your-frontend.vercel.app
- Try to register/login
- Check browser console for errors

---

## Common Issues

### Issue: "Function timeout"
**Solution:** WebSocket needs separate server (Railway/Render)

### Issue: "Database connection error"
**Solution:** Make sure Vercel Postgres is added and environment variables are set

### Issue: "Redis connection error"
**Solution:** Add Upstash integration or use Vercel KV

### Issue: "CORS error"
**Solution:** Update CORS_ORIGINS environment variable with your frontend URL

---

## Migration Path

### Phase 1: REST API on Vercel (Now)
- Deploy backend REST API
- Works for basic features
- Cost: $0-20/month

### Phase 2: Add Railway WebSocket (When needed)
- Deploy WebSocket server to Railway
- Connect to same databases
- Cost: +$5-15/month

### Phase 3: Scale Up (When traffic grows)
- Move to dedicated AWS infrastructure
- See SpeedLink-deployment.md
- Cost: $200-500/month

---

## Next Steps

1. **Deploy REST API to Vercel:**
   ```bash
   cd backend
   vercel --prod
   ```

2. **Add Database:**
   - Vercel Dashboard → Storage → Create PostgreSQL

3. **Add Redis:**
   - Vercel Dashboard → Integrations → Upstash

4. **Update Frontend:**
   ```bash
   cd frontend
   vercel env add VITE_API_URL
   vercel --prod
   ```

5. **Test Everything:**
   - Register a user
   - Create a party
   - Check that it works!

6. **Add WebSocket Later:**
   - Deploy to Railway when you need real-time features
   - Follow Option 2 above

---

Need help with any step? Let me know! 🚀

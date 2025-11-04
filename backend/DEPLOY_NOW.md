# 🚀 Quick Vercel Backend Deployment

## ✅ Pre-Deployment Checklist

1. **Frontend already deployed on Vercel** ✅ (You mentioned this is done)
2. **Vercel CLI installed**
3. **Environment variables ready**
4. **Database and Redis setup**

---

## Step-by-Step Deployment

### 1️⃣ Install Vercel CLI (if not already)
```bash
npm install -g vercel
```

### 2️⃣ Login to Vercel
```bash
vercel login
```

### 3️⃣ Deploy Backend
```bash
cd backend
vercel --prod
```

When prompted:
- **Set up and deploy?** → `Y`
- **Which scope?** → Choose your account
- **Link to existing project?** → `N` (create new)
- **Project name?** → `speedlink-backend` (or your choice)
- **Directory?** → `./` (current directory)

### 4️⃣ Add Vercel Postgres Database

Go to: https://vercel.com/dashboard

1. Click on your **speedlink-backend** project
2. Go to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose **Free tier** (256 MB, 60 hours/month)
6. Click **Create**

✅ Environment variables will be **automatically added** to your project!

### 5️⃣ Add Upstash Redis

1. In your project, go to **Integrations** tab
2. Search for **Upstash**
3. Click **Add Integration**
4. Select your **speedlink-backend** project
5. Authorize

✅ Redis environment variables will be **automatically added**!

### 6️⃣ Set Additional Environment Variables

```bash
# In the backend directory
cd backend

# Set JWT secret
vercel env add JWT_SECRET
# When prompted, enter a strong secret (min 32 characters)
# Example: your-super-secret-jwt-key-with-at-least-32-chars

# Set CORS origins (your frontend URL)
vercel env add CORS_ORIGINS
# Enter your frontend URL: https://your-app.vercel.app

# Set JWT expiration times
vercel env add JWT_EXPIRES_IN
# Enter: 15m

vercel env add REFRESH_TOKEN_EXPIRES_IN
# Enter: 7d
```

### 7️⃣ Redeploy with Environment Variables

```bash
vercel --prod
```

### 8️⃣ Update Frontend to Use Backend

```bash
cd ../frontend

# Set the backend API URL
vercel env add VITE_API_URL
# Enter your backend URL from step 3: https://speedlink-backend.vercel.app

# For now, use the same URL for WebSocket (will use polling fallback)
vercel env add VITE_WS_URL
# Enter: https://speedlink-backend.vercel.app

# Redeploy frontend
vercel --prod
```

### 9️⃣ Run Database Migrations

⚠️ **Important:** You need to run migrations to set up your database tables.

**Option A - Using Vercel CLI:**
```bash
cd backend

# Get your database URL
vercel env pull .env.local

# Run migrations locally against Vercel database
npm run db:migrate
```

**Option B - Manual SQL:**
1. Go to Vercel Dashboard → Storage → Your Postgres DB
2. Click **Query** tab
3. Run the SQL from `backend/src/database/schema.sql`

### 🔟 Test Your Deployment

```bash
# Test health endpoint
curl https://speedlink-backend.vercel.app/api/v1/health

# Test user registration
curl -X POST https://speedlink-backend.vercel.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "displayName": "Test User"
  }'
```

---

## 🎯 Environment Variables Summary

Your Vercel project should have these environment variables:

### Auto-populated by Vercel Postgres:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_USER`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- `POSTGRES_DATABASE`

### Auto-populated by Upstash:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### Manually set:
- `JWT_SECRET` - Your secret key
- `CORS_ORIGINS` - Your frontend URL
- `JWT_EXPIRES_IN` - 15m
- `REFRESH_TOKEN_EXPIRES_IN` - 7d
- `NODE_ENV` - production (auto-set by Vercel)

---

## 🐛 Troubleshooting

### Problem: "Module not found" error
**Solution:**
```bash
# Make sure dependencies are in package.json
cd backend
npm install
vercel --prod
```

### Problem: "Database connection failed"
**Solution:**
- Check that Vercel Postgres is added to your project
- Verify environment variables are set
- Try: `vercel env ls` to list all variables

### Problem: "CORS error" in browser
**Solution:**
```bash
# Update CORS_ORIGINS
vercel env add CORS_ORIGINS
# Enter your actual frontend URL
vercel --prod
```

### Problem: "JWT error"
**Solution:**
```bash
# Make sure JWT_SECRET is set
vercel env add JWT_SECRET
# Enter a strong secret
vercel --prod
```

---

## ⚠️ Important Notes

### WebSocket Limitations
Vercel has a **10-second timeout** for serverless functions. This means:
- ❌ Long-running WebSocket connections won't work well
- ✅ REST API works perfectly
- ✅ Short polling can work as fallback

**For real-time features, you'll need to:**
1. Use Socket.IO with polling transport (less efficient but works)
2. Deploy WebSocket server separately (Railway/Render - $5/month)

### Cold Starts
- First request after inactivity may be slow (1-2 seconds)
- Subsequent requests are fast (<100ms)
- This is normal for serverless functions

### Database Connections
- Use connection pooling (already configured in our code)
- Vercel Postgres includes Prisma Accelerate for connection pooling

---

## 📊 What's Working Now

After deployment, you'll have:

✅ **Working:**
- User registration/login
- Party creation/joining (via REST)
- Profile management
- Authentication
- Rate limiting
- Security (CORS, Helmet)

⚠️ **Limited:**
- Real-time location updates (need dedicated WebSocket server)
- Long-running connections

❌ **Not Working:**
- WebSocket with full duplex communication (need separate server)

---

## 🎉 Success!

If everything worked, you should see:

1. Backend URL: `https://speedlink-backend.vercel.app`
2. Health check returns: `{"status":"healthy"}`
3. Frontend can register/login users
4. No CORS errors in browser console

---

## 🚀 Next Steps

### For MVP (basic features):
Current setup is fine! You have:
- ✅ User auth
- ✅ Party management
- ✅ REST API

### For Real-Time Features:
Deploy WebSocket server to Railway:
```bash
# See RAILWAY_DEPLOYMENT.md for instructions
```

**Cost breakdown:**
- Vercel (Frontend + REST API): $0-20/month
- Railway (WebSocket only): $5-15/month
- **Total: $5-35/month** for full functionality

---

## 💰 Vercel Costs

**Hobby Plan (Free):**
- 100 GB bandwidth/month
- Unlimited requests
- 100 GB-hours compute/month
- Perfect for MVP!

**Pro Plan ($20/month):**
- 1 TB bandwidth/month
- Faster support
- Better for production

**Need help?** Check:
- Vercel Dashboard: https://vercel.com/dashboard
- Vercel Docs: https://vercel.com/docs
- This guide!

---

Ready to deploy? Start with **Step 1** above! 🚀

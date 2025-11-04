# 🎯 Run These Commands to Set Environment Variables

## Copy and paste these commands one by one into PowerShell:

# 1. JWT Secret (IMPORTANT - Generated for you)
echo "i5SHj1fdpyxoPteFBDvqa4zhuXJLZAr8gm7MlwEKQbTcR9k3" | vercel env add JWT_SECRET production

# 2. JWT Access Token Expiry
echo "15m" | vercel env add JWT_ACCESS_TOKEN_EXPIRY production

# 3. JWT Refresh Token Expiry
echo "7d" | vercel env add JWT_REFRESH_TOKEN_EXPIRY production

# 4. Node Environment
echo "production" | vercel env add NODE_ENV production

# 5. Rate Limiting Max Requests
echo "100" | vercel env add RATE_LIMIT_MAX production

# 6. Rate Limiting Time Window (milliseconds)
echo "60000" | vercel env add RATE_LIMIT_TIME_WINDOW production

# 7. Max Party Size
echo "20" | vercel env add MAX_PARTY_SIZE production

# 8. Party Expiry Hours
echo "24" | vercel env add PARTY_EXPIRY_HOURS production

# 9. Log Level
echo "info" | vercel env add LOG_LEVEL production

# 10. CORS Origin - YOU NEED TO SET THIS!
# Replace YOUR_FRONTEND_URL with your actual frontend URL
vercel env add CORS_ORIGIN production
# When prompted, enter: https://YOUR_FRONTEND_URL.vercel.app

---

## After setting all variables, redeploy:

vercel --prod

---

## Important Notes:

🔑 **JWT Secret Generated:** i5SHj1fdpyxoPteFBDvqa4zhuXJLZAr8gm7MlwEKQbTcR9k3
   SAVE THIS SOMEWHERE SAFE! You'll need it if you ever need to manually set it again.

🌐 **CORS_ORIGIN:** This MUST be set to your frontend URL
   Example: https://speedlink.vercel.app

📊 **Database & Redis:** Already configured via Neon and Upstash integrations
   - POSTGRES_URL (auto-added by Neon)
   - REDIS_URL (auto-added by Upstash)

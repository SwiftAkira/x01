#!/bin/bash
# Set up Vercel environment variables for production

echo "🔧 Setting environment variables..."

# JWT Secret (already generated)
echo "i5SHj1fdpyxoPteFBDvqa4zhuXJLZAr8gm7MlwEKQbTcR9k3" | vercel env add JWT_SECRET production

# JWT Expiry
echo "15m" | vercel env add JWT_ACCESS_TOKEN_EXPIRY production
echo "7d" | vercel env add JWT_REFRESH_TOKEN_EXPIRY production

# Node Environment
echo "production" | vercel env add NODE_ENV production

# Rate Limiting
echo "100" | vercel env add RATE_LIMIT_MAX production
echo "60000" | vercel env add RATE_LIMIT_TIME_WINDOW production

# Party Configuration
echo "20" | vercel env add MAX_PARTY_SIZE production
echo "24" | vercel env add PARTY_EXPIRY_HOURS production

# Logging
echo "info" | vercel env add LOG_LEVEL production

echo "✅ Environment variables set!"
echo ""
echo "⚠️  STILL NEED TO SET MANUALLY:"
echo "1. CORS_ORIGIN - Your frontend URL"
echo ""
echo "Run: vercel env add CORS_ORIGIN production"
echo "Then enter your frontend URL when prompted"

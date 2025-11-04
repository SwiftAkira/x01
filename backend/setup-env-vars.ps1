# PowerShell script to set up Vercel environment variables
# Run this script to configure all required environment variables

Write-Host "🔧 Setting up Vercel Environment Variables..." -ForegroundColor Cyan
Write-Host ""

# Generate a secure JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 48 | ForEach-Object {[char]$_})
Write-Host "✨ Generated JWT Secret: $jwtSecret" -ForegroundColor Green
Write-Host ""

# Set JWT_SECRET
Write-Host "Setting JWT_SECRET..." -ForegroundColor Yellow
$jwtSecret | vercel env add JWT_SECRET production --force

# Set CORS_ORIGIN
Write-Host ""
Write-Host "Enter your frontend URL (e.g., https://your-app.vercel.app):" -ForegroundColor Yellow
$corsOrigin = Read-Host
if ($corsOrigin) {
    $corsOrigin | vercel env add CORS_ORIGIN production --force
    Write-Host "✅ CORS_ORIGIN set to: $corsOrigin" -ForegroundColor Green
}

# Set JWT expiry
Write-Host ""
Write-Host "Setting JWT token expiry times..." -ForegroundColor Yellow
"15m" | vercel env add JWT_ACCESS_TOKEN_EXPIRY production --force
"7d" | vercel env add JWT_REFRESH_TOKEN_EXPIRY production --force

# Set NODE_ENV
Write-Host ""
Write-Host "Setting NODE_ENV to production..." -ForegroundColor Yellow
"production" | vercel env add NODE_ENV production --force

Write-Host ""
Write-Host "✅ All environment variables set!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: vercel --prod" -ForegroundColor White
Write-Host "2. Initialize database schema (see SETUP_NEON_UPSTASH.md)" -ForegroundColor White
Write-Host "3. Test your backend!" -ForegroundColor White
Write-Host ""
Write-Host "💾 SAVE THIS JWT SECRET SOMEWHERE SAFE:" -ForegroundColor Red
Write-Host $jwtSecret -ForegroundColor Yellow

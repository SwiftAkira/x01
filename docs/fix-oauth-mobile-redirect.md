# Fix GitHub OAuth Redirect for Mobile PWA

## The Problem
After GitHub login on mobile, users are redirected to `localhost` instead of your Vercel deployment URL.

## Solution

### Step 1: Update Supabase Auth Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your SpeedLink project
3. Navigate to **Authentication** → **URL Configuration**
4. Update the following settings:

#### Site URL
```
https://your-app.vercel.app
```
Replace `your-app.vercel.app` with your actual Vercel domain.

#### Redirect URLs (Add all of these)
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/**
http://localhost:3000/auth/callback
http://localhost:3000/**
```

### Step 2: Update GitHub OAuth App Settings

1. Go to GitHub: https://github.com/settings/developers
2. Find your SpeedLink OAuth App
3. Update these fields:

#### Homepage URL
```
https://your-app.vercel.app
```

#### Authorization callback URL
```
https://your-app.vercel.app/auth/callback
```

⚠️ **Important**: Remove or update any `localhost` URLs to your production domain.

### Step 3: Add Environment Variable to Vercel

1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add this variable:

**Name**: `NEXT_PUBLIC_SITE_URL`  
**Value**: `https://your-app.vercel.app`  
**Environments**: Production, Preview, Development

4. Redeploy your app after adding this variable

### Step 4: Test the Flow

1. **Clear PWA cache on iPhone**:
   - Remove SpeedLink from home screen
   - Safari → Settings → Clear History and Website Data

2. **Re-add PWA**:
   - Visit your Vercel URL in Safari
   - Tap Share → Add to Home Screen

3. **Test GitHub Login**:
   - Open PWA from home screen
   - Go to Login
   - Click "Continue with GitHub"
   - Should redirect back to your app ✅

## Quick Check URLs

Your redirect URLs should look like this:

✅ **Correct**:
- `https://speedlink-app.vercel.app/auth/callback`
- `https://your-custom-domain.com/auth/callback`

❌ **Wrong**:
- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback`

## Troubleshooting

### Still redirecting to localhost?
- Check Supabase → Authentication → URL Configuration
- Verify Site URL matches your Vercel domain
- Clear browser/PWA cache completely

### "Redirect URI mismatch" error?
- Add exact callback URL to both GitHub and Supabase
- Include trailing wildcards: `https://your-app.vercel.app/**`

### Works on desktop but not mobile?
- PWA might be caching old URLs
- Remove PWA completely and re-add
- Check Service Worker is updated

## After Fixing

Once configured correctly:
1. GitHub login redirects to your Vercel domain
2. Works seamlessly on mobile PWA
3. No localhost URLs appear on production
4. Auth flow works across all devices

## Your Vercel URL

Find your Vercel URL:
1. Go to https://vercel.com/dashboard
2. Select your SpeedLink project
3. Copy the **Production** domain (e.g., `speedlink-xyz.vercel.app`)
4. Use this URL in all the steps above

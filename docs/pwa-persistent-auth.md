# PWA Persistent Authentication Setup

## Overview
This implementation ensures users remain logged in when using SpeedLink as a PWA on iOS and Android devices. The authentication persists across app restarts and device reboots.

## Key Components

### 1. Enhanced Supabase Client (`lib/supabase/client.ts`)
- **localStorage persistence**: Uses `localStorage` as primary storage for auth tokens
- **Custom storage key**: `speedlink-auth` for better isolation
- **Auto-refresh tokens**: Automatically refreshes tokens before expiry
- **Cookie backup**: Falls back to cookies for additional persistence
- **PKCE flow**: Uses more secure PKCE authentication flow
- **Long-lived sessions**: Cookies set with 1-year expiry for PWAs

### 2. Auth Provider (`lib/auth/AuthProvider.tsx`)
- **Global auth state**: Provides user and session state throughout the app
- **Storage verification**: Ensures localStorage is accessible on mount
- **Auth state listener**: Automatically updates when auth state changes
- **Session recovery**: Loads existing session on app start

### 3. PWA Utilities (`lib/utils/pwa.ts`)
- **PWA detection**: Detect if app is running as installed PWA
- **iOS detection**: Special handling for iOS PWA quirks
- **Storage testing**: Verifies localStorage is available

### 4. PWA Manifest Updates (`public/manifest.json`)
- Added `scope` property for proper PWA routing
- Added `prefer_related_applications: false` to ensure web app is preferred

### 5. Enhanced Layout (`app/layout.tsx`)
- Added `AuthProvider` wrapper for global auth context
- Added iOS-specific meta tags for proper PWA behavior
- Added apple-touch-icon for home screen

## How It Works

1. **Initial Login**: User logs in via email/password or OAuth
2. **Token Storage**: Auth tokens stored in localStorage with key `speedlink-auth`
3. **Session Persistence**: Tokens also saved as secure cookies (1-year expiry)
4. **Auto-Recovery**: On PWA restart, `AuthProvider` automatically loads session from storage
5. **Token Refresh**: Tokens auto-refresh before expiry to maintain session
6. **State Sync**: All components using `useAuth()` stay in sync with auth state

## Usage in Components

### Protecting Routes
```tsx
'use client'
import { useRequireAuth } from '@/lib/auth/useRequireAuth'

export default function ProtectedPage() {
  const { user, loading } = useRequireAuth()
  
  if (loading) return <div>Loading...</div>
  
  return <div>Welcome {user?.email}</div>
}
```

### Accessing Auth State
```tsx
'use client'
import { useAuth } from '@/lib/auth/AuthProvider'

export default function MyComponent() {
  const { user, session, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  if (!user) return <div>Not logged in</div>
  
  return <div>Hello {user.email}</div>
}
```

### Checking PWA Mode
```tsx
import { isPWA, isIOSPWA } from '@/lib/utils/pwa'

export default function MyComponent() {
  const inPWA = isPWA()
  const inIOSPWA = isIOSPWA()
  
  return (
    <div>
      {inPWA && <p>Running as PWA</p>}
      {inIOSPWA && <p>Running as iOS PWA</p>}
    </div>
  )
}
```

## Testing

### On iOS:
1. Open SpeedLink in Safari
2. Tap Share button → "Add to Home Screen"
3. Open the app from home screen
4. Login once
5. Close the PWA completely (swipe up to close)
6. Reopen from home screen → Should remain logged in

### On Android:
1. Open SpeedLink in Chrome
2. Tap "Install" or "Add to Home Screen"
3. Open the installed app
4. Login once
5. Close the app completely
6. Reopen → Should remain logged in

## Troubleshooting

### Users getting logged out on iOS
- Check that `localStorage` is not being blocked by iOS privacy settings
- Verify app is actually running in standalone mode (check with `isPWA()`)
- Check browser console for auth errors

### Session not persisting
- Clear localStorage and cookies, then login fresh
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify Supabase project settings allow the origin

### Token refresh failures
- Check network connectivity
- Verify Supabase project is active and accessible
- Check token expiry settings in Supabase dashboard

## Security Considerations

- Tokens stored in localStorage (encrypted by Supabase)
- Cookies set with `secure` flag (HTTPS only)
- `sameSite: lax` prevents CSRF attacks
- PKCE flow provides better security than implicit flow
- Auto-refresh prevents token expiry issues

## Future Enhancements

- Add biometric authentication for additional security
- Implement session timeout warnings
- Add "Remember me" toggle for user control
- Add device management (view/revoke sessions)

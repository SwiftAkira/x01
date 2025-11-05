import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // Use localStorage for persistent sessions in PWAs
        storageKey: 'speedlink-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        // Keep the session alive
        persistSession: true,
        // Auto refresh token before expiry
        autoRefreshToken: true,
        // Detect session in URL for OAuth flows
        detectSessionInUrl: true,
        // Longer session expiry for PWAs
        flowType: 'pkce',
      },
      // Enable cookie storage as backup
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return null
          const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
          return match ? match[2] : null
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          if (typeof document === 'undefined') return
          const cookieOptions = {
            ...options,
            sameSite: 'lax',
            secure: true,
            path: '/',
            maxAge: 60 * 60 * 24 * 365, // 1 year
          }
          const cookieString = Object.entries(cookieOptions)
            .reduce((acc, [key, val]) => {
              if (val === true) return `${acc}; ${key}`
              if (val === false) return acc
              return `${acc}; ${key}=${val}`
            }, `${name}=${value}`)
          document.cookie = cookieString
        },
        remove(name: string, options: Record<string, unknown>) {
          if (typeof document === 'undefined') return
          this.set(name, '', { ...options, maxAge: -1 })
        },
      },
    }
  )
}

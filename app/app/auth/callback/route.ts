import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Get the actual host from headers (works for Vercel deployments)
      const forwardedHost = request.headers.get('x-forwarded-host')
      const forwardedProto = request.headers.get('x-forwarded-proto')
      
      // Construct the redirect URL
      let redirectUrl: string
      
      if (forwardedHost && forwardedProto) {
        // Production: Use forwarded headers from Vercel
        redirectUrl = `${forwardedProto}://${forwardedHost}${next}`
      } else {
        // Fallback to request origin
        redirectUrl = `${requestUrl.origin}${next}`
      }
      
      return NextResponse.redirect(redirectUrl)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/auth/auth-code-error`)
}

import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request): Promise<Response> {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code !== null) {
    const supabase = await createClient()
    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error === null && sessionData.user !== null) {
      // Check if user already has a handle — if not, send to onboarding
      const service = createServiceClient()
      const { data: handle } = await service
        .from('handles')
        .select('handle')
        .eq('user_id', sessionData.user.id)
        .maybeSingle()

      const destination = handle !== null ? next : '/onboarding'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`)
}

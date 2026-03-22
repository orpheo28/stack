import { NextResponse } from 'next/server'
import { log } from '@/lib/logger'

interface SupabaseTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  error?: string
  error_description?: string
}

export async function POST(req: Request): Promise<Response> {
  const start = Date.now()

  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { refresh_token } = body as { refresh_token?: string }
    if (typeof refresh_token !== 'string' || refresh_token === '') {
      return NextResponse.json({ error: 'refresh_token is required' }, { status: 400 })
    }

    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

    if (supabaseUrl === undefined || supabaseAnonKey === undefined) {
      log('error', 'supabase env vars not configured', {
        path: '/api/auth/refresh',
        method: 'POST',
        status: 500,
        duration_ms: Date.now() - start,
      })
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Call Supabase token refresh endpoint directly — most reliable approach
    const tokenResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token }),
    })

    const tokenData = (await tokenResponse.json()) as SupabaseTokenResponse

    if (!tokenResponse.ok || tokenData.error !== undefined) {
      log('error', 'token refresh failed', {
        path: '/api/auth/refresh',
        method: 'POST',
        status: 401,
        duration_ms: Date.now() - start,
      })
      return NextResponse.json(
        { error: tokenData.error_description ?? 'Token refresh failed' },
        { status: 401 },
      )
    }

    const expiresAt = Math.floor(Date.now() / 1000) + tokenData.expires_in

    log('info', 'token refreshed', {
      path: '/api/auth/refresh',
      method: 'POST',
      status: 200,
      duration_ms: Date.now() - start,
    })

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt,
    })
  } catch (err) {
    log('error', 'auth refresh handler threw', {
      path: '/api/auth/refresh',
      method: 'POST',
      status: 500,
      duration_ms: Date.now() - start,
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

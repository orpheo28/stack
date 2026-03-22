import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function POST(req: Request): Promise<Response> {
  try {
    const body: unknown = await req.json()
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const { token } = body as { token?: string }
    if (typeof token !== 'string' || token === '') {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const service = createServiceClient()

    // Look up the CLI session (include stored Supabase tokens)
    const { data: session, error } = await service
      .from('cli_sessions')
      .select('id, user_id, state, expires_at, used, access_token, refresh_token, token_expires_at')
      .eq('token', token)
      .single()

    if (error !== null || session === null) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 })
    }

    // Check if already used
    if (session.used) {
      return NextResponse.json({ error: 'Token already used' }, { status: 410 })
    }

    // Check expiry
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Token expired' }, { status: 410 })
    }

    // Mark as used
    await service.from('cli_sessions').update({ used: true }).eq('id', session.id)

    // Get user info
    const { data: userData, error: userError } = await service.auth.admin.getUserById(
      session.user_id,
    )

    if (userError !== null || userData?.user === null || userData?.user === undefined) {
      log('error', 'cli exchange: getUserById failed', {
        path: '/api/auth/cli/exchange',
        method: 'POST',
        user_id: session.user_id,
      })
      return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 })
    }

    const githubIdentity = userData.user.identities?.find((i) => i.provider === 'github')
    const username =
      (githubIdentity?.identity_data?.['user_name'] as string | undefined) ?? 'unknown'

    // Parse token_expires_at to Unix seconds for the CLI
    const tokenExpiresAt =
      session.token_expires_at !== null && session.token_expires_at !== undefined
        ? Math.floor(new Date(session.token_expires_at as string).getTime() / 1000)
        : null

    return NextResponse.json({
      user_id: session.user_id,
      username,
      state: session.state,
      // Supabase session tokens — present when user logged in via browser OAuth
      access_token: session.access_token ?? null,
      refresh_token: session.refresh_token ?? null,
      expires_at: tokenExpiresAt,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}

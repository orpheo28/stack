import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'

export async function GET(req: Request): Promise<Response> {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const port = searchParams.get('port')
  const state = searchParams.get('state')

  if (code === null || port === null || state === null) {
    return NextResponse.redirect(`${origin}/?error=cli_auth_missing_params`)
  }

  // Validate port is a safe local port number
  const portNum = parseInt(port, 10)
  if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
    return NextResponse.redirect(`${origin}/?error=cli_auth_invalid_port`)
  }

  // Exchange OAuth code for session
  const supabase = await createClient()
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error !== null || sessionData.user === null) {
    return NextResponse.redirect(`${origin}/?error=cli_auth_failed`)
  }

  // Generate one-time CLI token
  const cliToken = randomUUID()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

  // Store Supabase session tokens so exchange endpoint can return them to the CLI
  const session = sessionData.session
  const tokenExpiresAt =
    session?.expires_at !== undefined ? new Date(session.expires_at * 1000).toISOString() : null

  const service = createServiceClient()
  const { error: insertError } = await service.from('cli_sessions').insert({
    token: cliToken,
    user_id: sessionData.user.id,
    state,
    port: portNum,
    expires_at: expiresAt,
    access_token: session?.access_token ?? null,
    refresh_token: session?.refresh_token ?? null,
    token_expires_at: tokenExpiresAt,
  })

  if (insertError !== null) {
    return NextResponse.redirect(`${origin}/?error=cli_session_create_failed`)
  }

  // Redirect to the local CLI server
  return NextResponse.redirect(
    `http://localhost:${portNum.toString()}/callback?token=${encodeURIComponent(cliToken)}&state=${encodeURIComponent(state)}`,
  )
}

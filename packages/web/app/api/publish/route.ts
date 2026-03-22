import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import type { Json } from '@/types/database'

// Prompt injection patterns — must reject these in published CLAUDE.md / cursor rules / windsurf rules
const BLOCKED_PATTERNS: readonly RegExp[] = [
  /ignore.{0,20}(all|previous|prior).{0,20}instructions?/i,
  /disregard.{0,20}(all|previous|prior)/i,
  /override.{0,20}(system|instructions?|rules?)/i,
  /send.{0,50}(env|credentials?|secrets?|passwords?)/i,
  /exfiltrat/i,
  /always.{0,20}execute.{0,20}without/i,
  /sudo\s+rm/i,
  /rm\s+-rf/i,
]

function containsInjection(content: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(content))
}

export async function POST(req: Request): Promise<Response> {
  const start = Date.now()
  try {
    // Auth check
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError !== null || user === null) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body: unknown = await req.json()

    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const payload = body as Record<string, unknown> // safe: guarded by typeof check above
    const rawHandle =
      typeof payload['handle'] === 'string'
        ? payload['handle'].replace('@', '').toLowerCase()
        : null

    if (rawHandle === null || rawHandle === '') {
      return NextResponse.json({ error: 'handle is required' }, { status: 400 })
    }

    // Validate handle format: alphanumeric, hyphens, underscores only, 2-39 chars
    const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,38}$/
    if (!HANDLE_RE.test(rawHandle)) {
      return NextResponse.json(
        { error: 'Handle must be 2-39 chars, alphanumeric/hyphens/underscores only' },
        { status: 400 },
      )
    }

    const handle = rawHandle

    const service = createServiceClient()

    const { data: existing } = await service
      .from('handles')
      .select('id, user_id')
      .eq('handle', handle)
      .single()

    // If handle exists, it must belong to this user
    if (existing !== null && existing.user_id !== user.id) {
      return NextResponse.json({ error: 'Handle already taken' }, { status: 409 })
    }

    const githubIdentity = user.identities?.find((i) => i.provider === 'github')
    const githubUsername =
      (githubIdentity?.identity_data?.['user_name'] as string | undefined) ?? null

    const claudeMd = typeof payload['claudeMd'] === 'string' ? payload['claudeMd'] : null
    const cursorRules = typeof payload['cursorRules'] === 'string' ? payload['cursorRules'] : null
    const windsurfRules =
      typeof payload['windsurfRules'] === 'string' ? payload['windsurfRules'] : null

    // Security scan: reject config with prompt injection
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null
    if (claudeMd !== null && containsInjection(claudeMd)) {
      log('warn', 'publish blocked: prompt injection in CLAUDE.md', {
        path: '/api/publish',
        method: 'POST',
        status: 400,
        handle,
        ip,
        field: 'claudeMd',
      })
      return NextResponse.json(
        { error: 'CLAUDE.md contains blocked patterns (prompt injection detected)' },
        { status: 400 },
      )
    }
    if (cursorRules !== null && containsInjection(cursorRules)) {
      log('warn', 'publish blocked: prompt injection in cursorRules', {
        path: '/api/publish',
        method: 'POST',
        status: 400,
        handle,
        ip,
        field: 'cursorRules',
      })
      return NextResponse.json(
        { error: 'Cursor rules contain blocked patterns (prompt injection detected)' },
        { status: 400 },
      )
    }
    if (windsurfRules !== null && containsInjection(windsurfRules)) {
      log('warn', 'publish blocked: prompt injection in windsurfRules', {
        path: '/api/publish',
        method: 'POST',
        status: 400,
        handle,
        ip,
        field: 'windsurfRules',
      })
      return NextResponse.json(
        { error: 'Windsurf rules contain blocked patterns (prompt injection detected)' },
        { status: 400 },
      )
    }

    const upsertData = {
      handle,
      user_id: user.id,
      github_username: githubUsername,
      display_name: (user.user_metadata?.['full_name'] as string | undefined) ?? githubUsername,
      avatar_url: (user.user_metadata?.['avatar_url'] as string | undefined) ?? null,
      use_json: payload as Json,
      claude_md: claudeMd,
      cursor_rules: cursorRules,
    }

    const { error: upsertError } = await service
      .from('handles')
      .upsert(upsertData, { onConflict: 'handle' })

    if (upsertError !== null) {
      return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
    }

    const appUrl = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://use.dev'

    log('info', 'publish', {
      path: '/api/publish',
      method: 'POST',
      status: 200,
      duration_ms: Date.now() - start,
      handle,
    })
    return NextResponse.json({
      url: `${appUrl}/@${handle}`,
      handle,
    })
  } catch (err) {
    log('error', 'publish failed', {
      path: '/api/publish',
      method: 'POST',
      status: 500,
      duration_ms: Date.now() - start,
      error: String(err),
    })
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 },
    )
  }
}

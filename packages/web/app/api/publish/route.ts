import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'

export async function POST(req: Request): Promise<Response> {
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

  const payload = body as Record<string, unknown>
  const handle =
    typeof payload['handle'] === 'string' ? payload['handle'].replace('@', '').toLowerCase() : null

  if (handle === null || handle === '') {
    return NextResponse.json({ error: 'handle is required' }, { status: 400 })
  }

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

  const upsertData = {
    handle,
    user_id: user.id,
    github_username: githubUsername,
    display_name: (user.user_metadata?.['full_name'] as string | undefined) ?? githubUsername,
    avatar_url: (user.user_metadata?.['avatar_url'] as string | undefined) ?? null,
    use_json: payload as Json,
    claude_md: typeof payload['claudeMd'] === 'string' ? payload['claudeMd'] : null,
    cursor_rules: typeof payload['cursorRules'] === 'string' ? payload['cursorRules'] : null,
  }

  const { error: upsertError } = await service
    .from('handles')
    .upsert(upsertData, { onConflict: 'handle' })

  if (upsertError !== null) {
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
  }

  return NextResponse.json({
    url: `https://use.dev/@${handle}`,
    handle,
  })
}

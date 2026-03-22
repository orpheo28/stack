import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
): Promise<Response> {
  const start = Date.now()
  try {
    const { handle } = await params
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('handles')
      .select('handle, use_json, claude_md, cursor_rules')
      .eq('handle', handle.toLowerCase())
      .single()

    if (error !== null || data === null) {
      return NextResponse.json({ error: 'Handle not found' }, { status: 404 })
    }

    const useJson =
      typeof data.use_json === 'object' && data.use_json !== null && !Array.isArray(data.use_json)
        ? (data.use_json as Record<string, unknown>)
        : {}
    const rawTools = useJson['tools']
    const tools =
      typeof rawTools === 'object' && rawTools !== null && !Array.isArray(rawTools)
        ? (rawTools as Record<string, unknown>)
        : {}

    log('info', 'handle manifest', {
      path: `/api/handles/${handle}/manifest`,
      method: 'GET',
      status: 200,
      duration_ms: Date.now() - start,
      handle,
    })
    return NextResponse.json({
      version: '1.0',
      handle: data.handle,
      tools,
      claudeMd: data.claude_md ?? undefined,
      cursorRules: data.cursor_rules ?? undefined,
    })
  } catch (err) {
    log('error', 'handle manifest failed', {
      path: '/api/handles/[handle]/manifest',
      method: 'GET',
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

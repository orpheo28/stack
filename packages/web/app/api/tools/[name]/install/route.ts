import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const start = Date.now()
  try {
    const { name } = await params
    const supabase = createServiceClient()

    const { data: tool, error } = await supabase
      .from('tools')
      .select('id')
      .eq('name', name.toLowerCase())
      .single()

    if (error !== null || tool === null) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
    }

    // Rate limit: max 1 install per IP per tool per hour
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null
    if (ip !== null) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count } = await supabase
        .from('install_events')
        .select('id', { count: 'exact', head: true })
        .eq('tool_id', tool.id)
        .eq('installer_ip', ip)
        .gte('created_at', oneHourAgo)

      if (count !== null && count > 0) {
        return NextResponse.json({ ok: true, limited: true })
      }
    }

    // Resolve handle_id from request body if provided
    let handleId: string | null = null
    try {
      const body: unknown = await req.json()
      if (typeof body === 'object' && body !== null) {
        const handle = (body as Record<string, unknown>)['handle']
        if (typeof handle === 'string' && handle.length > 0) {
          const { data: handleRow } = await supabase
            .from('handles')
            .select('id')
            .eq('handle', handle.toLowerCase())
            .single()
          if (handleRow !== null) {
            handleId = handleRow.id
          }
        }
      }
    } catch {
      // No body or invalid JSON — handle_id stays null (anonymous install)
    }

    // Insert install event
    await supabase
      .from('install_events')
      .insert({ tool_id: tool.id, installer_ip: ip, handle_id: handleId })

    // Increment counters via DB function
    await supabase.rpc('increment_install_counters', { p_tool_id: tool.id })

    log('info', 'tool install', {
      path: `/api/tools/${name}/install`,
      method: 'POST',
      status: 200,
      duration_ms: Date.now() - start,
      tool: name,
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    log('error', 'tool install failed', {
      path: '/api/tools/[name]/install',
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

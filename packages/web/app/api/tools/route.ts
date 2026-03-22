import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

export async function GET(): Promise<Response> {
  const start = Date.now()
  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tools')
      .select('name, display_name, type, source, description, installs_total, score')
      .order('score', { ascending: false })
      .limit(500)

    if (error !== null) {
      log('error', 'tools db error', {
        path: '/api/tools',
        method: 'GET',
        status: 500,
        duration_ms: Date.now() - start,
        error: error.message,
      })
      return NextResponse.json(
        { error: 'Failed to fetch tools', code: 'DB_ERROR' },
        { status: 500 },
      )
    }

    const tools = (data ?? []).map((t) => ({
      name: t.name,
      displayName: t.display_name,
      type: t.type,
      source: t.source,
      description: t.description ?? '',
      installs: t.installs_total,
    }))

    log('info', 'tools', {
      path: '/api/tools',
      method: 'GET',
      status: 200,
      duration_ms: Date.now() - start,
      count: tools.length,
    })
    return NextResponse.json(tools, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    })
  } catch (err) {
    log('error', 'tools failed', {
      path: '/api/tools',
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

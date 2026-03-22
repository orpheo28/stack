import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

function sanitizeQuery(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 _-]/g, '').slice(0, 100)
}

export async function GET(req: Request): Promise<Response> {
  const start = Date.now()
  try {
    const { searchParams } = new URL(req.url)
    const q = sanitizeQuery(searchParams.get('q')?.trim() ?? '')

    const supabase = createServiceClient()

    let query = supabase
      .from('tools')
      .select('name, display_name, type, description, installs_total, score')
      .order('installs_total', { ascending: false })
      .limit(20)

    if (q !== '') {
      query = query.or(`name.ilike.%${q}%,display_name.ilike.%${q}%,description.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error !== null) {
      log('error', 'search db error', {
        path: '/api/search',
        method: 'GET',
        status: 500,
        duration_ms: Date.now() - start,
        error: error.message,
      })
      return NextResponse.json([], { status: 200 })
    }

    const results = (data ?? []).map((t) => ({
      name: t.name,
      displayName: t.display_name,
      type: t.type,
      description: t.description ?? '',
      installs: t.installs_total,
    }))

    log('info', 'search', {
      path: '/api/search',
      method: 'GET',
      status: 200,
      duration_ms: Date.now() - start,
      q,
      count: results.length,
    })
    return NextResponse.json(results)
  } catch (err) {
    log('error', 'search failed', {
      path: '/api/search',
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

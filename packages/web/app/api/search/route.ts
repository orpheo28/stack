import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''

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
    return NextResponse.json([], { status: 200 })
  }

  const results = (data ?? []).map((t) => ({
    name: t.name,
    displayName: t.display_name,
    type: t.type,
    description: t.description ?? '',
    installs: t.installs_total,
  }))

  return NextResponse.json(results)
}

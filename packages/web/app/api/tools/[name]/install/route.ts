import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
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

  // Insert install event
  await supabase.from('install_events').insert({ tool_id: tool.id })

  // Increment counters via DB function
  await supabase.rpc('increment_install_counters', { p_tool_id: tool.id })

  return NextResponse.json({ ok: true })
}

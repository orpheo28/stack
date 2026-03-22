import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ handle: string }> },
): Promise<Response> {
  const { handle } = await params
  const supabase = createServiceClient()

  const { data: handleRow, error } = await supabase
    .from('handles')
    .select('id')
    .eq('handle', handle.toLowerCase())
    .single()

  if (error !== null || handleRow === null) {
    return NextResponse.json({ error: 'Handle not found' }, { status: 404 })
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? null

  // Insert copy event
  await supabase.from('copy_events').insert({ handle_id: handleRow.id, copier_ip: ip })

  // Increment counters via DB function
  await supabase.rpc('increment_copy_counters', { p_handle_id: handleRow.id })

  return NextResponse.json({ ok: true })
}

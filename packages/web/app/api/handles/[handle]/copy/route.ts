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

  // Rate limit: max 1 copy per IP per handle per hour
  if (ip !== null) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('copy_events')
      .select('id', { count: 'exact', head: true })
      .eq('handle_id', handleRow.id)
      .eq('copier_ip', ip)
      .gte('created_at', oneHourAgo)

    if (count !== null && count > 0) {
      return NextResponse.json({ ok: true, cached: true })
    }
  }

  // Insert copy event
  await supabase.from('copy_events').insert({ handle_id: handleRow.id, copier_ip: ip })

  // Increment counters via DB function
  await supabase.rpc('increment_copy_counters', { p_handle_id: handleRow.id })

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase.rpc('reset_monthly_counters')
  if (error !== null) {
    return NextResponse.json({ error: 'Failed to reset monthly counters' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: 'monthly_reset' })
}

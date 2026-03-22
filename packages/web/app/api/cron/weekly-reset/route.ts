import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Recalculate percentiles before resetting
  const { error: percentileError } = await supabase.rpc('recalculate_percentiles')
  if (percentileError !== null) {
    return NextResponse.json({ error: 'Failed to recalculate percentiles' }, { status: 500 })
  }

  // Reset weekly counters
  const { error: resetError } = await supabase.rpc('reset_weekly_counters')
  if (resetError !== null) {
    return NextResponse.json({ error: 'Failed to reset weekly counters' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, action: 'weekly_reset_and_percentiles' })
}

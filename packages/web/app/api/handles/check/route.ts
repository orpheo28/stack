import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const HANDLE_RE = /^[a-z0-9][a-z0-9_-]{1,38}$/

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const handle = searchParams.get('handle')?.toLowerCase() ?? ''

  if (!HANDLE_RE.test(handle)) {
    return NextResponse.json({ available: false, error: 'Invalid handle format' }, { status: 400 })
  }

  const service = createServiceClient()
  const { data } = await service.from('handles').select('id').eq('handle', handle).maybeSingle()

  return NextResponse.json({ available: data === null })
}

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
): Promise<Response> {
  const { handle } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('handles')
    .select('handle, use_json, claude_md, cursor_rules')
    .eq('handle', handle.toLowerCase())
    .single()

  if (error !== null || data === null) {
    return NextResponse.json({ error: 'Handle not found' }, { status: 404 })
  }

  const useJson = (data.use_json as Record<string, unknown>) ?? {}
  const tools = (useJson['tools'] as Record<string, unknown>) ?? {}

  return NextResponse.json({
    version: '1.0',
    handle: data.handle,
    tools,
    claudeMd: data.claude_md ?? undefined,
    cursorRules: data.cursor_rules ?? undefined,
  })
}

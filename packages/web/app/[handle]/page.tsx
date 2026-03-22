import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/server'
import type { Json } from '@/types/database'
import { CopyButton } from './CopyButton'

interface UseJson {
  tools?: Record<string, { type: string; version?: string; source?: string }>
}

function parseUseJson(raw: Json): UseJson {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return raw as UseJson
}

interface Props {
  params: Promise<{ handle: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params
  return {
    title: `@${handle} — use.dev`,
    description: `Copy @${handle}'s AI-native dev setup in one command: npx stack @${handle}`,
  }
}

const TYPE_BADGE: Record<string, string> = {
  mcp: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  sdk: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  cli: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  api: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  config: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

export const dynamic = 'force-dynamic'

export default async function HandlePage({ params }: Props) {
  const { handle } = await params
  const supabase = createServiceClient()

  const result = await supabase
    .from('handles')
    .select('*')
    .eq('handle', handle.toLowerCase())
    .single()

  if (result.error !== null) notFound()
  const data = result.data

  const useJson = parseUseJson(data.use_json)
  const tools = useJson.tools ?? {}
  const toolEntries = Object.entries(tools)
  const command = `npx stack @${data.handle}`
  const claudeMdPreview = data.claude_md?.split('\n').slice(0, 5).join('\n') ?? null

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-2xl px-4 py-16">
        {/* Header */}
        <div className="flex items-start gap-4 mb-10">
          {data.avatar_url !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.avatar_url}
              alt={data.handle}
              className="w-16 h-16 rounded-full border border-zinc-800"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-semibold truncate">
              {data.display_name ?? `@${data.handle}`}
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5">@{data.handle}</p>
            {data.location !== null && <p className="text-zinc-500 text-sm">{data.location}</p>}
            {data.bio !== null && <p className="text-zinc-400 text-sm mt-2">{data.bio}</p>}
          </div>
        </div>

        {/* Adoption score */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 mb-6">
          <p className="text-3xl font-bold tabular-nums">{data.copies_total.toLocaleString()}</p>
          <p className="text-zinc-400 text-sm mt-1">
            devs have copied this setup
            {data.percentile !== null && data.percentile >= 50 && (
              <span className="ml-2 text-violet-400 font-medium">
                · Top {(100 - data.percentile).toFixed(0)}%
              </span>
            )}
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            {data.copies_this_week.toLocaleString()} this week ·{' '}
            {data.copies_this_month.toLocaleString()} this month
          </p>
        </div>

        {/* Copy command */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-4 mb-6">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider font-medium">
            Install this setup
          </p>
          <div className="flex items-center gap-3">
            <code className="flex-1 font-mono text-sm text-emerald-400 bg-zinc-950 rounded-lg px-4 py-3 border border-zinc-800 overflow-x-auto">
              {command}
            </code>
            <CopyButton command={command} />
          </div>
        </div>

        {/* Tools */}
        {toolEntries.length > 0 && (
          <section className="mb-6">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              Stack · {toolEntries.length} tools
            </h2>
            <div className="space-y-2">
              {toolEntries.map(([name, cfg]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-zinc-100">{name}</span>
                    {cfg.version !== undefined && (
                      <span className="text-xs text-zinc-600">{cfg.version}</span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_BADGE[cfg.type] ?? TYPE_BADGE['config']}`}
                  >
                    {cfg.type}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CLAUDE.md preview */}
        {claudeMdPreview !== null && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-3">
              CLAUDE.md preview
            </h2>
            <pre className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-400 font-mono whitespace-pre-wrap overflow-hidden">
              {claudeMdPreview}
              {(data.claude_md?.split('\n').length ?? 0) > 5 && '\n…'}
            </pre>
          </section>
        )}
      </div>
    </main>
  )
}

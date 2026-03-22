import { notFound, redirect } from 'next/navigation'
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
  const clean = handle.replace(/^@/, '')
  const title = `@${clean} — use.dev`
  const description = `Copy @${clean}'s AI-native dev setup in one command: npx stackdev @${clean}`
  const ogImage = `/api/og?handle=${encodeURIComponent(clean)}`
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'use.dev', type: 'profile', images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

const TYPE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  mcp: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  sdk: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  cli: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  api: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  config: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20' },
}

export const dynamic = 'force-dynamic'

export default async function HandlePage({ params }: Props) {
  const { handle } = await params
  const clean = handle.replace(/^@/, '')

  if (clean !== clean.toLowerCase()) {
    redirect(`/@${clean.toLowerCase()}`)
  }

  const supabase = createServiceClient()

  const result = await supabase
    .from('handles')
    .select('*')
    .eq('handle', clean.toLowerCase())
    .single()

  if (result.error !== null) notFound()
  const data = result.data

  const useJson = parseUseJson(data.use_json)
  const tools = useJson.tools ?? {}
  const toolEntries = Object.entries(tools)
  const command = `npx stackdev @${data.handle}`
  const claudeMdLines = data.claude_md?.split('\n') ?? []
  const claudeMdPreview = claudeMdLines.slice(0, 8).join('\n')
  const hasMoreClaudeMd = claudeMdLines.length > 8

  return (
    <main className="min-h-screen">
      {/* Background glow */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,hsla(260,60%,20%,0.3),transparent)]" />

      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors mb-12"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          use.dev
        </a>

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-10">
          {data.avatar_url !== null ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={data.avatar_url}
              alt=""
              className="w-20 h-20 rounded-full border-2 border-zinc-800 shrink-0 shadow-xl shadow-black/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-zinc-800 border-2 border-zinc-700 shrink-0" />
          )}
          <div className="flex-1 min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-white truncate">
              {data.display_name ?? `@${data.handle}`}
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5 font-mono">@{data.handle}</p>
            {data.location !== null && (
              <p className="text-zinc-600 text-sm mt-1">{data.location}</p>
            )}
            {data.bio !== null && (
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{data.bio}</p>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-zinc-800 mb-8 bg-zinc-800">
          <StatCell value={data.copies_total.toLocaleString()} label="total copies" />
          <StatCell value={data.copies_this_week.toLocaleString()} label="this week" />
          <StatCell
            value={
              data.percentile !== null && data.percentile >= 50
                ? `Top ${(100 - data.percentile).toFixed(0)}%`
                : `${toolEntries.length}`
            }
            label={
              data.percentile !== null && data.percentile >= 50 ? 'AI-native builders' : 'tools'
            }
          />
        </div>

        {/* Copy command */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5 mb-8 backdrop-blur-sm">
          <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mb-3">
            Copy this setup
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-sm rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-3 overflow-x-auto">
              <span className="text-zinc-600 select-none">$ </span>
              <span className="text-emerald-400">{command}</span>
            </div>
            <CopyButton command={command} />
          </div>
        </div>

        {/* Tools grid */}
        {toolEntries.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-zinc-400 mb-4">
              Stack
              <span className="ml-2 text-zinc-600">{toolEntries.length} tools</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toolEntries.map(([name, cfg]) => {
                const fallback = {
                  bg: 'bg-zinc-500/10',
                  text: 'text-zinc-400',
                  border: 'border-zinc-500/20',
                }
                const badge = TYPE_BADGE[cfg.type] ?? fallback
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-4 py-3 hover:bg-zinc-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm text-zinc-200 truncate">{name}</span>
                      {cfg.version !== undefined && (
                        <span className="text-[11px] text-zinc-700 font-mono">{cfg.version}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}
                    >
                      {cfg.type}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* CLAUDE.md preview */}
        {claudeMdPreview.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-400 mb-4">
              CLAUDE.md
              <span className="ml-2 text-zinc-600">{claudeMdLines.length} lines</span>
            </h2>
            <pre className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4 text-xs text-zinc-500 font-mono leading-relaxed whitespace-pre-wrap overflow-hidden">
              {claudeMdPreview}
              {hasMoreClaudeMd && (
                <span className="text-zinc-700 block mt-2">
                  {'···'} {claudeMdLines.length - 8} more lines
                </span>
              )}
            </pre>
          </section>
        )}
      </div>
    </main>
  )
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-zinc-950/80 px-4 py-4 text-center">
      <p className="text-xl font-bold text-white tabular-nums font-mono">{value}</p>
      <p className="text-[11px] text-zinc-600 mt-0.5">{label}</p>
    </div>
  )
}

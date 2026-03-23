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
  const title = `@${clean} — getstack.com`
  const description = `Copy @${clean}'s AI-native dev setup in one command: npx usedev @${clean}`

  // Fetch stats so the OG image reflects real data instead of zeros
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('handles')
    .select('copies_total, use_json')
    .eq('handle', clean.toLowerCase())
    .maybeSingle()
  const copies = data?.copies_total ?? 0
  const toolCount = data !== null ? Object.keys(parseUseJson(data.use_json).tools ?? {}).length : 0

  const ogImage = `/api/og?handle=${encodeURIComponent(clean)}&copies=${copies}&tools=${toolCount}`
  return {
    title,
    description,
    openGraph: { title, description, siteName: 'getstack.com', type: 'profile', images: [ogImage] },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  }
}

const TYPE_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  mcp: { bg: 'bg-violet-500/8', text: 'text-violet-600', border: 'border-violet-500/15' },
  sdk: { bg: 'bg-blue-500/8', text: 'text-blue-600', border: 'border-blue-500/15' },
  cli: { bg: 'bg-emerald-500/8', text: 'text-emerald-600', border: 'border-emerald-500/15' },
  api: { bg: 'bg-amber-500/8', text: 'text-amber-600', border: 'border-amber-500/15' },
  config: { bg: 'bg-gray-500/8', text: 'text-gray-600', border: 'border-gray-500/15' },
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
  const command = `npx usedev @${data.handle}`
  // is_verified added by migration 20260323000004 — run pnpm db:types to remove this cast
  const isVerified = (data as typeof data & { is_verified?: boolean }).is_verified === true
  const claudeMdLines = data.claude_md?.split('\n') ?? []
  const claudeMdPreview = claudeMdLines.slice(0, 8).join('\n')
  const hasMoreClaudeMd = claudeMdLines.length > 8

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* Back link */}
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#A3A3A3] hover:text-[#171717] transition-colors mb-12"
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
          getstack.com
        </a>

        {/* Profile header */}
        <div className="flex items-start gap-5 mb-10">
          {data.avatar_url !== null ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={data.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full border border-[#E5E5E5] shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] border border-[#E5E5E5] shrink-0" />
          )}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-[#0A0A0A] truncate">
                {data.display_name ?? `@${data.handle}`}
              </h1>
              {isVerified && (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="shrink-0 text-blue-500"
                  aria-label="Verified"
                >
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.15" />
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              )}
            </div>
            <p className="text-[#737373] text-sm mt-0.5 font-mono">@{data.handle}</p>
            {data.location !== null && (
              <p className="text-[#A3A3A3] text-sm mt-1">{data.location}</p>
            )}
            {data.bio !== null && (
              <p className="text-[#737373] text-sm mt-2 leading-relaxed">{data.bio}</p>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-[#E5E5E5] mb-8 bg-[#E5E5E5]">
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
        <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-5 mb-8">
          <p className="text-[11px] text-[#A3A3A3] uppercase tracking-widest font-medium mb-3">
            Copy this setup
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-sm rounded-lg bg-white border border-[#E5E5E5] px-4 py-3 overflow-x-auto">
              <span className="text-[#A3A3A3] select-none">$ </span>
              <span className="text-[#0A0A0A]">{command}</span>
            </div>
            <CopyButton command={command} />
          </div>
        </div>

        {/* Tools grid */}
        {toolEntries.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider mb-4">
              Stack
              <span className="ml-2 text-[#A3A3A3] normal-case tracking-normal">
                {toolEntries.length} tools
              </span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {toolEntries.map(([name, cfg]) => {
                const fallback = {
                  bg: 'bg-gray-500/8',
                  text: 'text-gray-600',
                  border: 'border-gray-500/15',
                }
                const badge = TYPE_BADGE[cfg.type] ?? fallback
                return (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3 hover:border-[#D4D4D4] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm text-[#0A0A0A] truncate">{name}</span>
                      {cfg.version !== undefined && (
                        <span className="text-[11px] text-[#A3A3A3] font-mono">{cfg.version}</span>
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
            <h2 className="text-sm font-medium text-[#737373] uppercase tracking-wider mb-4">
              CLAUDE.md
              <span className="ml-2 text-[#A3A3A3] normal-case tracking-normal">
                {claudeMdLines.length} lines
              </span>
            </h2>
            <pre className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-5 py-4 text-xs text-[#737373] font-mono leading-relaxed whitespace-pre-wrap overflow-hidden">
              {claudeMdPreview}
              {hasMoreClaudeMd && (
                <span className="text-[#A3A3A3] block mt-2">
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
    <div className="bg-white px-4 py-4 text-center">
      <p className="text-xl font-bold text-[#0A0A0A] tabular-nums font-mono">{value}</p>
      <p className="text-[11px] text-[#A3A3A3] mt-0.5">{label}</p>
    </div>
  )
}
